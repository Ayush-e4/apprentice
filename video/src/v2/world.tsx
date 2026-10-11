// The shared stage every animated scene reuses, so the viewer keeps one mental model:
// app -> student -> judge -> (hosted line) -> teacher, with memory beside the student.
import gsap from "gsap";
import React from "react";
import { FONT, HAND, Judge, Memory, P, Student, SW, Teacher } from "./cast";

export const L = {
  ground: 610,
  routeY: 300,
  app: { x: 140, y: 300 },
  student: { x: 420, y: 610 },
  memory: { x: 600, y: 610 },
  judge: { x: 780, y: 610 },
  hosted: 890,
  teacher: { x: 1100, y: 610 },
  meter: { x: 1150, y: 66 },
  // where cards rest on each desk
  at: { app: [140, 300], student: [330, 440], judge: [660, 430], teacher: [1000, 450], memory: [600, 420] } as Record<string, [number, number]>,
};
export const UNIT = 0.126 / 80; // measured teacher cost per question (USD)

export type Q = (s: string) => Element[];

/** A request card: white index card, grey squiggles, optional coloured answer ink, tag and verdict mark. */
export const Card: React.FC<{ cls: string; ink?: string; tag?: string; mark?: "ok" | "no"; dots?: number[]; shape?: "rect" | "hex"; label?: string; bent?: boolean }> = ({
  cls, ink = P.student, tag, mark, dots, shape = "rect", label, bent,
}) => (
  <g className={`card ${cls}`} opacity={0}>
    {label ? <text x={0} y={64} textAnchor="middle" fontFamily={HAND} fontSize={18} fill={P.ink}>{label}</text> : null}
    {shape === "rect" ? (
      <rect x={-60} y={-40} width={120} height={80} rx={4} fill="#FFFFFF" stroke={P.ink} strokeWidth={SW} />
    ) : (
      <path d="M -46 -40 H 46 L 60 -20 V 20 L 46 40 H -46 L -60 20 V -20 Z" fill="#FFFFFF" stroke={P.ink} strokeWidth={SW} strokeLinejoin="round" />
    )}
    {[-16, 0, 16].map((y, i) => <path key={y} d={`M -44 ${y} q 10 -6 20 0 t 20 0 t 20 0 ${i < 2 ? "t 20 0" : ""}`} fill="none" stroke={P.line} strokeWidth={3} strokeLinecap="round" />)}
    {/* answer ink draws on stroke by stroke (strokeDashoffset 1 -> 0) */}
    <g className="ink">
      {[-16, 0, 16].map((y, i) => (bent && i === 2
        ? <path key={y} d={`M -44 ${y} q 10 -6 20 0 t 18 10 t 22 14`} fill="none" stroke={P.bad} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
        : <path key={y} d={`M -44 ${y} q 10 -6 20 0 t 20 0 t 20 0 ${i < 2 ? "t 20 0" : ""}`} fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />))}
    </g>
    {dots ? (
      <g className="dots" opacity={0}>{dots.map((r, i) => <circle key={i} cx={-40 + i * 16} cy={-30} r={r} fill={P.memory} />)}</g>
    ) : null}
    {tag ? (
      <g className="tag" opacity={0}><rect x={22} y={-56} width={52} height={22} rx={11} fill={P.student} /><text x={48} y={-40} textAnchor="middle" fontFamily={FONT} fontSize={14} fontWeight={700} fill="#fff">{tag}</text></g>
    ) : null}
    {mark ? (
      <g className="mark" opacity={0} transform="rotate(-10)">
        <rect x={-58} y={-18} width={116} height={36} rx={4} fill="#FFFFFFdd" stroke={mark === "ok" ? P.student : P.bad} strokeWidth={SW} />
        <text x={0} y={8} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={18} fill={mark === "ok" ? P.student : P.bad}>{mark === "ok" ? "APPROVED" : "UNSURE"}</text>
      </g>
    ) : null}
  </g>
);

/** Small browser outline standing for "your app". */
export const App: React.FC<{ label?: string; children?: React.ReactNode }> = ({ label = "app", children }) => (
  <g className="app" transform={`translate(${L.app.x} ${L.app.y})`}>
    <rect x={-90} y={-70} width={180} height={140} rx={8} fill="#FFFFFF" stroke={P.ink} strokeWidth={SW} />
    <line x1={-90} y1={-46} x2={90} y2={-46} stroke={P.ink} strokeWidth={SW - 1} />
    {[0, 1, 2].map((i) => <circle key={i} cx={-74 + i * 12} cy={-58} r={4} fill={P.line} />)}
    {children}
    <text x={0} y={100} textAnchor="middle" fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.soft}>{label}</text>
  </g>
);

export const Meter: React.FC<{ value?: string }> = ({ value = "$0.0000" }) => (
  <g className="meter" transform={`translate(${L.meter.x} ${L.meter.y})`}>
    <rect x={-92} y={-34} width={184} height={68} rx={8} fill="#FFFFFF" stroke={P.judge} strokeWidth={SW + 1} />
    <text x={0} y={-44} textAnchor="middle" fontFamily={FONT} fontSize={14} fill={P.soft}>API bill</text>
    <text className="meter-val" x={0} y={11} textAnchor="middle" fontFamily="Consolas, monospace" fontWeight={700} fontSize={30} fill={P.ink}>{value}</text>
  </g>
);

/** Dotted route line along which cards travel. */
export const Route: React.FC<{ x1: number; x2: number; y?: number; cls?: string }> = ({ x1, x2, y = L.routeY, cls = "route" }) => (
  <line className={cls} x1={x1} y1={y} x2={x2} y2={y} stroke={P.ink} strokeWidth={3} strokeDasharray="1 12" strokeLinecap="round" opacity={0.6} />
);

export const Hosted: React.FC = () => (
  <g className="hosted">
    <line x1={L.hosted} y1={110} x2={L.hosted} y2={L.ground} stroke={P.soft} strokeWidth={2} strokeDasharray="8 8" />
    <text x={L.hosted + 12} y={130} fontFamily={FONT} fontSize={18} fill={P.soft}>hosted</text>
  </g>
);

/** Dashed box with the product name lettered into a gap in its top edge. */
export const Box: React.FC = () => (
  <g className="abox">
    <path d={`M 470 140 H 880 V ${L.ground + 14} H 300 V 140 H 330`} fill="none" stroke={P.ink} strokeWidth={2.5} strokeDasharray="10 7" pathLength={1000} className="abox-line" />
    <text x={400} y={150} textAnchor="middle" fontFamily={HAND} fontSize={30} fontWeight={700} fill={P.ink} className="abox-name">Apprentice</text>
  </g>
);

export const Ground: React.FC = () => <line x1={0} y1={L.ground} x2={1280} y2={L.ground} stroke={P.line} strokeWidth={3} />;

/** Full stage. Pass which parts exist in this scene. */
export const Stage: React.FC<{
  student?: boolean; judge?: boolean; memory?: boolean; box?: boolean; hosted?: boolean; meter?: string | false;
  memFilled?: number; mood?: "idle" | "happy" | "unsure"; teacherScale?: number; app?: React.ReactNode; children?: React.ReactNode;
}> = ({ student = true, judge = true, memory = true, box = true, hosted = true, meter = "$0.0000", memFilled = 3, mood = "idle", teacherScale = 1.2, app, children }) => (
  <>
    <g className="cam">
      <Ground />
      {box ? <Box /> : null}
      {hosted ? <Hosted /> : null}
      {app ?? <App />}
      <g className="teacher-g"><Teacher x={L.teacher.x} y={L.teacher.y} scale={teacherScale} /></g>
      {student ? <g className="student-g"><Student x={L.student.x} y={L.student.y} scale={0.9} mood={mood} /></g> : null}
      {memory ? <g className="memory-g"><Memory x={L.memory.x} y={L.memory.y} scale={0.6} filled={memFilled} open={1} /></g> : null}
      {judge ? <g className="judge-g"><Judge x={L.judge.x} y={L.judge.y} scale={0.9} /></g> : null}
      {children}
    </g>
    {/* the meter is a HUD: it stays put while the camera moves */}
    {meter !== false ? <Meter value={meter} /> : null}
  </>
);

// ---------- timeline helpers ----------

/** Fly a card along waypoints (absolute world coords), starting at `at` seconds. */
export const fly = (tl: gsap.core.Timeline, q: Q, cls: string, pts: [number, number][], at: number, seg = 0.45) => {
  const [x0, y0] = pts[0];
  tl.set(q(`.${cls}`), { x: x0, y: y0, opacity: 1 }, at);
  pts.slice(1).forEach(([x, y], i) => tl.to(q(`.${cls}`), { x, y, duration: seg, ease: "power2.inOut" }, at + i * seg));
  return at + (pts.length - 1) * seg;
};

/** Ink a card (answer being written), coloured by who writes it. */
export const write = (tl: gsap.core.Timeline, q: Q, cls: string, at: number, dur = 0.5) =>
  tl.to(q(`.${cls} .ink path`), { strokeDashoffset: 0, duration: dur / 3, stagger: dur / 3, ease: "none" }, at);

/** Judge stamps: arm thunks down, gauge needle settles on `score`, verdict mark appears on the card. */
export const judge = (tl: gsap.core.Timeline, q: Q, cls: string, score: number, at: number, fmt = (v: number) => v.toFixed(2)) => {
  const o = { v: 0 };
  tl.to(q(".judge-g .needle"), { rotation: -90 + 180 * score, duration: 0.6, ease: "back.out(2)", transformOrigin: "50% 100%" }, at)
    .to(o, { v: score, duration: 0.6, onUpdate: () => q(".judge-g .gauge-val").forEach((e) => { e.textContent = fmt(o.v); }) }, at)
    .to(q(".judge-g .stamp-arm"), { y: 46, duration: 0.12, ease: "power2.in" }, at + 0.7)
    .to(q(".judge-g .stamp-arm"), { y: 0, duration: 0.25, ease: "power2.out" }, at + 0.85)
    .to(q(`.${cls} .mark`), { opacity: 1, duration: 0.05 }, at + 0.82)
    .fromTo(q(`.${cls}`), { rotation: 0 }, { rotation: 2, duration: 0.05, yoyo: true, repeat: 3 }, at + 0.82);
  return at + 1.1;
};

/** Meter: count from a to b over dur, writing `$x.xxx`. */
export const meter = (tl: gsap.core.Timeline, q: Q, from: number, to: number, at: number, dur: number, digits = 4, sel = ".meter-val") => {
  const o = { v: from };
  tl.to(o, { v: to, duration: dur, ease: "none", onUpdate: () => q(sel).forEach((e) => { e.textContent = `$${o.v.toFixed(digits)}`; }) }, at);
};

/** Camera move on the whole stage (scale around a world point). */
export const cam = (tl: gsap.core.Timeline, q: Q, scale: number, cx: number, cy: number, at: number, dur = 1.2) =>
  tl.to(q(".cam"), { scale, x: (640 - cx * scale), y: (360 - cy * scale), duration: dur, ease: "power2.inOut", svgOrigin: "0 0" }, at);
