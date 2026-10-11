import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { C, font } from "./ui";

gsap.registerPlugin(TextPlugin);

type Q = (selector: string) => Element[];

/**
 * Builds a paused GSAP timeline once, then seeks it to the current frame on every render,
 * so each frame is deterministic (Remotion renders frames out of order and in parallel).
 */
export const useGsap = (build: (tl: gsap.core.Timeline, q: Q) => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const t = gsap.timeline({ paused: true });
      build(t, gsap.utils.selector(ref) as Q);
      tl.current = t;
    }, ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    tl.current?.seek(frame / fps, false);
  }, [frame, fps]);
  return ref;
};

/** Splits text into per-letter spans with class "ch" for GSAP staggers. */
export const Chars: React.FC<{ text: string; className?: string; style?: React.CSSProperties }> = ({ text, className = "", style }) => (
  <span className={className} style={{ display: "inline-block", ...style }}>
    {text.split("").map((c, i) => (
      <span key={i} className="ch" style={{ display: "inline-block", whiteSpace: "pre" }}>{c}</span>
    ))}
  </span>
);

/** Centered title whose letters flip up one by one. */
export const KTitle: React.FC<{ text: string; y?: number; size?: number; color?: string; at?: number }> = ({
  text, y = 48, size = 46, color = C.text, at = 0.1,
}) => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".ch"), { y: 50, rotationX: -90, opacity: 0, duration: 0.6, stagger: 0.018, ease: "back.out(2)" }, at);
  });
  return (
    <div ref={ref} style={{
      position: "absolute", top: y, width: "100%", textAlign: "center", fontFamily: font, fontSize: size,
      fontWeight: 800, color, perspective: 600, letterSpacing: -0.5,
    }}>
      <Chars text={text} />
    </div>
  );
};

/** Moving perspective grid, drifting particles and a vignette behind every scene. */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = (frame * 1.6) % 60;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{
        background: `radial-gradient(circle at ${50 + 25 * Math.sin(frame / 150)}% ${30 + 10 * Math.cos(frame / 190)}%, #22304a 0%, transparent 55%)`,
      }} />
      <div style={{
        position: "absolute", left: -640, right: -640, bottom: -120, height: 520, transform: "perspective(500px) rotateX(62deg)",
        backgroundImage: `linear-gradient(${C.student}33 2px, transparent 2px), linear-gradient(90deg, ${C.student}22 2px, transparent 2px)`,
        backgroundSize: "60px 60px", backgroundPosition: `0 ${shift}px`,
        maskImage: "linear-gradient(to top, black 10%, transparent 90%)", WebkitMaskImage: "linear-gradient(to top, black 10%, transparent 90%)",
      }} />
      {Array.from({ length: 36 }).map((_, i) => {
        const x = random(`x${i}`) * 1280;
        const speed = 0.2 + random(`s${i}`) * 0.6;
        const y = (random(`y${i}`) * 760 - frame * speed) % 760;
        const size = 2 + random(`r${i}`) * 4;
        const color = i % 3 === 0 ? C.teacher : i % 3 === 1 ? C.student : C.accent;
        return (
          <div key={i} style={{
            position: "absolute", left: x + 20 * Math.sin(frame / 40 + i), top: y < 0 ? y + 760 : y, width: size, height: size,
            borderRadius: size, background: color, opacity: 0.55, boxShadow: `0 0 ${size * 4}px ${color}`,
          }} />
        );
      })}
      <AbsoluteFill style={{ background: "radial-gradient(circle, transparent 55%, #000c 100%)" }} />
    </AbsoluteFill>
  );
};

/** Zoom-and-blur in, push-and-blur out, plus a light flash at each cut. */
export const Transition: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const inT = interpolate(frame, [0, 14], [0, 1], clamp);
  const outT = interpolate(frame, [frames - 12, frames], [0, 1], clamp);
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const scale = 1.12 - 0.12 * ease(inT) - 0.06 * outT + 0.015 * (frame / frames);
  const blur = 14 * (1 - ease(inT)) + 10 * outT;
  const flash = interpolate(frame, [0, 3, 12], [0.55, 0.25, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${scale})`, filter: `blur(${blur}px)`, opacity: Math.min(ease(inT) * 1.4, 1 - outT) }}>
        {children}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash, mixBlendMode: "overlay" }} />
    </AbsoluteFill>
  );
};

/** Static card for GSAP to animate (styles never change from React). */
export const Card: React.FC<{
  className: string; x: number; y: number; w: number; h: number; color: string; title: string; sub?: string; glow?: boolean;
}> = ({ className, x, y, w, h, color, title, sub, glow }) => (
  <div className={className} style={{
    position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 20, background: `${C.panel}ee`,
    border: `3px solid ${color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    boxShadow: `0 0 ${glow ? 50 : 18}px ${color}${glow ? "99" : "44"}`, fontFamily: font, backdropFilter: "blur(4px)",
  }}>
    <div style={{ color, fontSize: 30, fontWeight: 800 }}>{title}</div>
    {sub ? <div style={{ color: C.muted, fontSize: 18, marginTop: 6, textAlign: "center", padding: "0 10px" }}>{sub}</div> : null}
  </div>
);

export const Dot: React.FC<{ className: string; color: string; x: number; y: number; size?: number }> = ({ className, color, x, y, size = 24 }) => (
  <div className={className} style={{
    position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size,
    background: color, boxShadow: `0 0 28px ${color}, 0 0 8px #fff`, opacity: 0,
  }} />
);
