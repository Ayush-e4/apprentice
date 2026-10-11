# Apprentice explainer video

A 2-minute, light-mode animated explainer of how Apprentice works and what we measured.

- **Director → critic → build → critic.** `director/storyboard.json` (script + shot list) was written by a director agent, reviewed by a critic agent before anything was built, and the rendered frames were reviewed again. `director/apply_*.py` record each round of fixes.
- **Animation:** [Remotion](https://www.remotion.dev/) + [GSAP](https://gsap.com/). Each scene builds a paused GSAP timeline that is seeked to the current frame, so renders are deterministic. One recurring stage (`src/v2/world.tsx`) and cast (`src/v2/cast.tsx`) keep the same mental model in every scene: app → student → judge → (hosted) → teacher, with memory.
- **Voice:** [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (open-weight TTS, Apache-2.0). Scene timings come from the voice lengths.
- **B-roll + assembly:** [MoviePy](https://zulko.github.io/moviepy/) frames the training-notebook capture and mixes the voice over music that ducks under every line; ffmpeg normalises to -16 LUFS and muxes.
- **Music:** synthesised in `tools/make_audio.py`, so there is no third-party track to license.

Every number on screen comes from the project's own eval runs (80 held-out text-to-SQL questions) and the judge fine-tuning run.

## Rebuild

```bash
npm install
# 1. Voice + timeline from the storyboard (pip install kokoro-onnx soundfile moviepy;
#    model files kokoro-v1.0.int8.onnx + voices-v1.0.bin in <models_dir>)
python tools/make_audio_v2.py <models_dir>
python tools/make_audio.py <models_dir>        # also writes public/music.wav (v1 script)
# 2. B-roll of the training notebook (captured with tools/capture_broll.mjs ... notebook)
python tools/broll_clips.py "notebook|5.77|github.com/Ayush-e4/apprentice/blob/main/notebooks/train_sql_judge.ipynb|0.72|left"
# 3. Silent film, then MoviePy mix + ffmpeg mux -> out/apprentice-explainer-v2.mp4
npx remotion render src/index.ts Film out/film-silent.mp4 --muted
python tools/assemble.py
```

Preview with `npm run studio` (composition `Film`). `Explainer` is the earlier dark v1 cut.
