"""Voice (Kokoro) and music for the explainer.

Usage: python tools/make_audio.py <kokoro_models_dir>
Writes public/voice/<scene>.wav, public/music.wav and src/timeline.json.
"""

import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
SR_MUSIC = 44100


def make_voice(models: Path, script: dict) -> list[dict]:
    kokoro = Kokoro(str(models / "kokoro-v1.0.int8.onnx"), str(models / "voices-v1.0.bin"))
    out_dir = ROOT / "public" / "voice"
    out_dir.mkdir(parents=True, exist_ok=True)
    fps, pad = script["fps"], script["padSeconds"]
    scenes, start = [], 0
    for scene in script["scenes"]:
        samples, sr = kokoro.create(scene["text"], voice=script["voice"], speed=script["speed"], lang="en-us")
        sf.write(out_dir / f"{scene['id']}.wav", samples, sr)
        seconds = len(samples) / sr
        frames = int(round((seconds + 2 * pad) * fps))
        scenes.append({"id": scene["id"], "text": scene["text"], "from": start, "frames": frames,
                       "voiceDelay": int(round(pad * fps)), "voiceSeconds": round(seconds, 3)})
        print(f"{scene['id']:>9}: {seconds:5.2f}s")
        start += frames
    return scenes


def note(freq: float, seconds: float) -> np.ndarray:
    t = np.arange(int(seconds * SR_MUSIC)) / SR_MUSIC
    tone = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * 2 * freq * t + 0.5)
    env = np.minimum(1, t / 1.2) * np.minimum(1, (seconds - t) / 1.5)  # slow swell in and out
    return tone * env


def make_music(seconds: float) -> None:
    # Cmaj9 - Am9 - Fmaj7 - G6, four seconds each, soft pad plus a gentle pluck pulse.
    chords = [[130.81, 196.0, 246.94, 293.66], [110.0, 164.81, 196.0, 246.94],
              [87.31, 130.81, 164.81, 220.0], [98.0, 146.83, 196.0, 246.94]]
    bar = 4.0
    total = int(seconds * SR_MUSIC)
    mix = np.zeros(total + int(bar * SR_MUSIC) * 2)
    i, pos = 0, 0
    while pos < total:
        chord = chords[i % len(chords)]
        pad = sum(note(f, bar + 1.5) for f in chord) / len(chord)
        mix[pos:pos + len(pad)] += 0.5 * pad
        for k in range(8):  # eighth-note pluck on the chord's top notes
            f = chord[1 + k % 3] * 2
            t = np.arange(int(0.45 * SR_MUSIC)) / SR_MUSIC
            pluck = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) * 0.18
            s = pos + int(k * bar / 8 * SR_MUSIC)
            mix[s:s + len(pluck)] += pluck
        pos += int(bar * SR_MUSIC)
        i += 1
    mix = mix[:total]
    fade = int(2.5 * SR_MUSIC)
    mix[:fade] *= np.linspace(0, 1, fade)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix /= np.max(np.abs(mix)) + 1e-9
    stereo = np.stack([mix, np.roll(mix, 300)], axis=1) * 0.8  # slight width
    sf.write(ROOT / "public" / "music.wav", stereo.astype(np.float32), SR_MUSIC)


def main() -> None:
    script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
    scenes = make_voice(Path(sys.argv[1]), script)
    total_frames = scenes[-1]["from"] + scenes[-1]["frames"] + script["fps"]  # 1 s tail
    target = int(script.get("targetSeconds", 0) * script["fps"])
    if target and total_frames < target:  # spread the spare time across scenes to hit the exact length
        extra = target - total_frames
        for i, scene in enumerate(scenes):
            scene["frames"] += extra // len(scenes) + (extra % len(scenes) if i == len(scenes) - 1 else 0)
        start = 0
        for scene in scenes:
            scene["from"], start = start, start + scene["frames"]
        total_frames = target
    elif target and total_frames > target:
        print(f"WARNING: {total_frames / script['fps']:.1f}s is over the {target / script['fps']:.0f}s target")
    timeline = {"fps": script["fps"], "totalFrames": total_frames, "scenes": scenes}
    (ROOT / "src" / "timeline.json").write_text(json.dumps(timeline, indent=2), encoding="utf-8")
    make_music(total_frames / script["fps"])
    print(f"total: {total_frames / script['fps']:.1f}s")


if __name__ == "__main__":
    main()
