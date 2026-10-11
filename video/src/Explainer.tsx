import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Transition } from "./fx";
import { Hook, Idea, Intro, Judge, Learn, Teacher } from "./gscenes1";
import { Close, Honest, Open, Results, Use, UseCases } from "./gscenes2";
import timeline from "./timeline.json";
import { C, font } from "./ui";

const SCENES: Record<string, React.FC> = {
  hook: Hook, intro: Intro, idea: Idea, judge: Judge, teacher: Teacher, learn: Learn,
  results: Results, honest: Honest, usecases: UseCases, open: Open, use: Use, close: Close,
};

/** Fades each scene in and out so cuts feel smooth. */
const Fade: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, frames - 10, frames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const Caption: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", bottom: 22, left: 50, right: 50, textAlign: "center", fontFamily: font, fontSize: 20,
      lineHeight: 1.35, color: C.text, opacity, textShadow: "0 2px 8px #000",
    }}>
      <span style={{ background: "#000a", padding: "4px 12px", borderRadius: 8, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
        {text}
      </span>
    </div>
  );
};

export const Explainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop />
      {timeline.scenes.map((s) => {
        const Scene = SCENES[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
            <Transition frames={s.frames}>
              <Scene />
            </Transition>
            <Fade frames={s.frames}>
              <Caption text={s.text} delay={s.voiceDelay} />
            </Fade>
          </Sequence>
        );
      })}
      <div style={{
        position: "absolute", left: 0, bottom: 0, height: 5, width: `${(frame / durationInFrames) * 100}%`,
        background: `linear-gradient(90deg, ${C.student}, ${C.teacher})`,
      }} />
    </AbsoluteFill>
  );
};
