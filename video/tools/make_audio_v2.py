"""Voice + timeline for the v2 film, from director/storyboard.json.

Usage: python tools/make_audio_v2.py <kokoro_models_dir>
Writes public/v2/voice/<scene>.wav and src/v2/timeline.json (music.wav is reused from v1).
Scene length = max(minSeconds, voice + pads); then all scenes scale to exactly totalSeconds.
"""

import json
import sys
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
LEAD = 0.30   # silence before each line
TAIL = 0.35   # breathing room after each line


def main() -> None:
    board = json.loads((ROOT / "director" / "storyboard.json").read_text(encoding="utf-8"))
    models = Path(sys.argv[1])
    kokoro = Kokoro(str(models / "kokoro-v1.0.int8.onnx"), str(models / "voices-v1.0.bin"))
    speed = float(board.get("speed", 1.0))
    out_dir = ROOT / "public" / "v2" / "voice"
    out_dir.mkdir(parents=True, exist_ok=True)
    scenes = []
    for s in board["scenes"]:
        text = s.get("narration", "").strip()
        secs = 0.0
        if text:
            samples, sr = kokoro.create(text, voice=board.get("voice", "af_heart"), speed=speed, lang="en-us")
            sf.write(out_dir / f"{s['id']}.wav", samples, sr)
            secs = len(samples) / sr
        need = max(float(s.get("minSeconds", 0)), (LEAD + secs + TAIL) if text else 0)
        scenes.append({"id": s["id"], "type": s["type"], "text": text, "voiceSeconds": round(secs, 3), "need": need,
                       "broll": (s.get("broll") or {}).get("source")})
        print(f"{s['id']:>20}: voice {secs:5.2f}s  need {need:5.2f}s")
    total = float(board.get("totalSeconds", 120))
    need_sum = sum(s["need"] for s in scenes)
    k = total / need_sum
    print(f"sum {need_sum:.1f}s -> scale x{k:.3f} to {total:.0f}s" + ("  (WARNING: voice will be squeezed)" if k < 1 else ""))
    start = 0
    for s in scenes:
        frames = int(round(s.pop("need") * k * FPS))
        s.update({"from": start, "frames": frames, "voiceDelay": int(round(LEAD * FPS))})
        start += frames
    scenes[-1]["frames"] += int(total * FPS) - start
    timeline = {"fps": FPS, "totalFrames": int(total * FPS), "scenes": scenes}
    (ROOT / "src" / "v2").mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "v2" / "timeline.json").write_text(json.dumps(timeline, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
