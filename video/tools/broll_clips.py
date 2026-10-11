"""Turns captured app frames (broll/<name>/f*.png) into B-roll clips with MoviePy.

Each clip: the real app inside a plain browser window on the paper background,
with a slow push-in. Usage:
    python tools/broll_clips.py <name>:<seconds>[:<url>] ...
    e.g. python tools/broll_clips.py kirana:6 dashboard:4
Writes public/broll/<name>.mp4 (1280x720, 30 fps, no audio).
"""

import sys
from pathlib import Path

import numpy as np
from moviepy import CompositeVideoClip, ImageClip, ImageSequenceClip, VideoClip
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H, FPS = 1280, 720, 30
PAPER = (250, 248, 243)
INK = (31, 35, 40)
LINE = (217, 212, 199)
WIN_W, WIN_H = 1120, 630 + 36  # content 1120x630 (16:9) + title bar
BAR = 36


def layout(frac: float, align: str) -> tuple[int, int, int, int]:
    """Window width/height and top-left for a window `frac` of the frame wide, aligned left or centre."""
    ww = int(W * frac)
    wh = int((ww - 6) * 9 / 16) + BAR + 4
    x0 = 40 if align == "left" else (W - ww) // 2
    return ww, wh, x0, (H - wh) // 2


def window_chrome(url: str, frac: float = 0.875, align: str = "center") -> Image.Image:
    """Paper background with an empty browser window (title bar + URL pill)."""
    global WIN_W, WIN_H
    WIN_W, WIN_H, x0, y0 = layout(frac, align)
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x0 + 6, y0 + 8, x0 + WIN_W + 6, y0 + WIN_H + 8], 14, fill=(230, 225, 214))  # flat offset shadow
    d.rounded_rectangle([x0, y0, x0 + WIN_W, y0 + WIN_H], 14, fill=(255, 255, 255), outline=INK, width=3)
    d.line([x0, y0 + BAR, x0 + WIN_W, y0 + BAR], fill=INK, width=2)
    for i, c in enumerate([(214, 69, 69), (217, 154, 0), (47, 158, 107)]):
        cx = x0 + 22 + i * 20
        d.ellipse([cx - 6, y0 + 12, cx + 6, y0 + 24], fill=c)
    d.rounded_rectangle([x0 + 90, y0 + 8, x0 + WIN_W - 90, y0 + BAR - 8], 8, fill=(241, 237, 228))
    try:
        font = ImageFont.truetype("segoeui.ttf", 15)
    except OSError:
        font = ImageFont.load_default()
    d.text((x0 + 104, y0 + 10), url, fill=(107, 111, 118), font=font)
    return img


def make(name: str, seconds: float, url: str, frac: float = 0.875, align: str = "center") -> Path:
    frames = sorted((ROOT / "broll" / name).glob("f*.png"))
    if not frames:
        raise SystemExit(f"no frames for {name}")
    chrome_img = window_chrome(url, frac, align)
    _, _, x0, y0 = layout(frac, align)
    content = [np.array(Image.open(f).convert("RGB").resize((WIN_W - 6, WIN_H - BAR - 4), Image.LANCZOS)) for f in frames]
    # Time-lapse the capture into the target length; hold the last frame for the final 30%.
    live = seconds * 0.7
    durations = [live / len(content)] * len(content)
    durations[-1] += seconds - live
    screen = ImageSequenceClip(content, durations=durations).with_position((x0 + 3, y0 + BAR + 1))
    chrome = ImageClip(np.array(chrome_img)).with_duration(seconds)
    flat = CompositeVideoClip([chrome, screen], size=(W, H)).with_duration(seconds)
    cx = x0 + WIN_W // 2  # zoom toward the window's centre

    def push_in(get_frame, t):  # slow 1.00 -> 1.06 zoom
        z = 1 + 0.06 * (t / seconds)
        frame = get_frame(t)
        cw, ch = int(W / z), int(H / z)
        x = min(max(cx - cw // 2, 0), W - cw)
        y = (H - ch) // 2
        crop = Image.fromarray(frame[y:y + ch, x:x + cw]).resize((W, H), Image.LANCZOS)
        return np.array(crop)

    clip = flat.transform(push_in).with_duration(seconds)
    out = ROOT / "public" / "broll" / f"{name}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    clip.write_videofile(str(out), fps=FPS, codec="libx264", audio=False, preset="medium", logger=None,
                         ffmpeg_params=["-pix_fmt", "yuv420p", "-crf", "18"])
    print(f"{name}: {seconds}s -> {out.relative_to(ROOT)}")
    return out


if __name__ == "__main__":
    # spec: name|seconds|url|frac|align   e.g. notebook|5.6|github.com/...|0.72|left
    for spec in sys.argv[1:]:
        parts = spec.split("|")
        name, secs = parts[0], float(parts[1])
        url = parts[2] if len(parts) > 2 else f"localhost:3100/{name}"
        frac = float(parts[3]) if len(parts) > 3 else 0.875
        align = parts[4] if len(parts) > 4 else "center"
        make(name, secs, url, frac, align)
