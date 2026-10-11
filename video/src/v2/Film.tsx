import React, { createContext, useContext } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { P } from "./cast";
import * as S1 from "./s1";
import * as S2 from "./s2";
import * as S3 from "./s3";
import timeline from "./timeline.json";

type Ctx = { text: string; voiceSeconds: number; lead: number; seconds: number };
const SceneCtx = createContext<Ctx>({ text: "", voiceSeconds: 0, lead: 0.3, seconds: 5 });

/** Returns b(phrase, offset): seconds into the scene when `phrase` is spoken (char-proportional estimate). */
export const useBeat = () => {
  const c = useContext(SceneCtx);
  return (phrase: string, offset = 0) => {
    const i = c.text.toLowerCase().indexOf(phrase.toLowerCase());
    const frac = i < 0 ? 0 : i / Math.max(1, c.text.length);
    return c.lead + frac * c.voiceSeconds + offset;
  };
};
export const useSceneSeconds = () => useContext(SceneCtx).seconds;

const SCENES: Record<string, React.FC> = {
  "cold-open-meter": S1.ColdOpen, "enter-apprentice": S1.EnterApprentice, "broll-one-url": S3.CodeEdit,
  "student-desk": S1.StudentDesk, "judge-booth": S1.JudgeBooth, "broll-colab": S3.BrollColab,
  "judge-verdict": S1.JudgeVerdict, "teacher-escalation": S1.TeacherEscalation, "memory-file": S2.MemoryFile,
  "memory-recall": S2.MemoryRecall, flywheel: S2.Flywheel, "test-bench": S3.TestBench,
  "results-accuracy": S3.ResultsAccuracy, "results-cost": S3.ResultsCost, "honest-limit": S2.HonestLimit,
  "real-example": S3.RealExample, "use-cases": S2.UseCases, outro: S2.Outro,
};

/** Short 6-frame cross-dissolve between scenes; no zooms, flashes or blur. */
const Cut: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6, frames - 4, frames], [0, 1, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const Film: React.FC = () => (
  <AbsoluteFill style={{ background: P.paper }}>
    {timeline.scenes.map((s) => {
      const Scene = SCENES[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
          <SceneCtx.Provider value={{ text: s.text, voiceSeconds: s.voiceSeconds, lead: s.voiceDelay / timeline.fps, seconds: s.frames / timeline.fps }}>
            <Cut frames={s.frames}>{Scene ? <Scene /> : null}</Cut>
          </SceneCtx.Provider>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

export const FILM_FRAMES = timeline.totalFrames;
