"""Final assembly with MoviePy: voice lines at their scene times, music ducked under the voice.

Usage: python tools/assemble.py
Reads out/film-silent.mp4, src/v2/timeline.json, public/v2/voice/*.wav, public/music.wav.
Writes out/film-audio.wav; then ffmpeg normalises loudness and muxes out/apprentice-explainer-v2.mp4.
"""

import json
import subprocess
from pathlib import Path

import numpy as np
from moviepy import AudioFileClip, CompositeAudioClip

ROOT = Path(__file__).resolve().parent.parent
MUSIC_BED, MUSIC_DUCKED, RAMP = 0.32, 0.10, 0.35  # gains and ramp seconds


def main() -> None:
    tl = json.loads((ROOT / "src" / "v2" / "timeline.json").read_text(encoding="utf-8"))
    fps, total = tl["fps"], tl["totalFrames"] / tl["fps"]
    voices, spans = [], []
    for s in tl["scenes"]:
        wav = ROOT / "public" / "v2" / "voice" / f"{s['id']}.wav"
        if not s["text"] or not wav.exists():
            continue
        start = (s["from"] + s["voiceDelay"]) / fps
        clip = AudioFileClip(str(wav)).with_start(start)
        voices.append(clip)
        spans.append((start, start + clip.duration))

    # Ducking envelope sampled at 100 Hz: bed level, dipping under every voice span with soft ramps.
    grid = np.arange(0, total + 0.01, 0.01)
    env = np.full_like(grid, MUSIC_BED)
    for a, b in spans:
        down = np.clip((grid - (a - RAMP)) / RAMP, 0, 1) * np.clip(((b + RAMP) - grid) / RAMP, 0, 1)
        env = np.minimum(env, MUSIC_BED - (MUSIC_BED - MUSIC_DUCKED) * down)

    def duck(get_frame, t):
        frame = get_frame(t)
        g = np.interp(t, grid, env)
        return frame * (np.asarray(g)[..., None] if np.ndim(frame) > 1 else g)

    music = AudioFileClip(str(ROOT / "public" / "music.wav")).subclipped(0, total).transform(duck)
    mix = CompositeAudioClip([music, *voices]).with_duration(total)
    wav_out = ROOT / "out" / "film-audio.wav"
    mix.write_audiofile(str(wav_out), fps=48000, nbytes=2, logger=None)
    print(f"mixed {len(voices)} voice lines over {total:.1f}s of music -> {wav_out.name}")

    final = ROOT / "out" / "apprentice-explainer-v2.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(ROOT / "out" / "film-silent.mp4"), "-i", str(wav_out),
        "-map", "0:v", "-map", "1:a", "-c:v", "copy",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart", str(final),
    ], check=True)
    print(f"final -> {final.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
