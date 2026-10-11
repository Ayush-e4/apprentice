// Recurring cast for the light-mode explainer: flat shapes, one ink stroke weight, a small palette.
import React from "react";
import { useCurrentFrame } from "remotion";

export const P = {
  paper: "#FAF8F3",
  paper2: "#F1EDE4",
  ink: "#1F2328",
  soft: "#6B6F76",
  line: "#D9D4C7",
  student: "#2F9E6B",
  teacher: "#4C5BD4",
  judge: "#D99A00",
  memory: "#E8590C",
  bad: "#D64545",
};
export const SW = 3; // stroke width used everywhere
export const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
export const HAND = '"Segoe Print", "Comic Neue", "Segoe UI", sans-serif';

/** Gentle idle motion so characters never look frozen. */
const useIdle = (seed = 0) => {
  const f = useCurrentFrame() + seed * 37;
  return { breathe: Math.sin(f / 18) * 1.5, blink: f % 110 < 4 ? 0.1 : 1 };
};

const Face: React.FC<{ cx: number; cy: number; r: number; blink: number }> = ({ cx, cy, r, blink }) => (
  <g>
    <ellipse cx={cx - r * 0.35} cy={cy - r * 0.05} rx={r * 0.09} ry={r * 0.12 * blink} fill={P.ink} />
    <ellipse cx={cx + r * 0.35} cy={cy - r * 0.05} rx={r * 0.09} ry={r * 0.12 * blink} fill={P.ink} />
    <path d={`M ${cx - r * 0.25} ${cy + r * 0.32} Q ${cx} ${cy + r * 0.5} ${cx + r * 0.25} ${cy + r * 0.32}`} stroke={P.ink} strokeWidth={SW} fill="none" strokeLinecap="round" />
  </g>
);

/** Small student at a desk with a laptop. Anchor = desk centre, bottom. */
export const Student: React.FC<{ x: number; y: number; scale?: number; mood?: "idle" | "happy" | "unsure"; seed?: number }> = ({ x, y, scale = 1, mood = "idle", seed = 0 }) => {
  const { breathe, blink } = useIdle(seed);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g transform={`translate(0 ${breathe})`}>
        <rect x={-34} y={-150} width={68} height={70} rx={30} fill={P.student} stroke={P.ink} strokeWidth={SW} />
        <circle cx={0} cy={-178} r={30} fill={P.paper} stroke={P.ink} strokeWidth={SW} />
        <Face cx={0} cy={-178} r={30} blink={blink} />
        {mood === "unsure" ? <text x={30} y={-205} fontFamily={HAND} fontSize={30} fill={P.bad}>?</text> : null}
        {mood === "happy" ? <path d="M 24 -214 l 6 -10 M 34 -206 l 10 -4" stroke={P.student} strokeWidth={SW} strokeLinecap="round" /> : null}
      </g>
      {/* laptop */}
      <path d="M -50 -84 L -38 -128 L 30 -128 L 18 -84 Z" fill={P.paper2} stroke={P.ink} strokeWidth={SW} strokeLinejoin="round" />
      {/* desk */}
      <rect x={-110} y={-84} width={220} height={14} rx={3} fill={P.paper2} stroke={P.ink} strokeWidth={SW} />
      <line x1={-95} y1={-70} x2={-95} y2={0} stroke={P.ink} strokeWidth={SW} />
      <line x1={95} y1={-70} x2={95} y2={0} stroke={P.ink} strokeWidth={SW} />
    </g>
  );
};

/** Bigger teacher with glasses at a wide desk stacked with books. */
export const Teacher: React.FC<{ x: number; y: number; scale?: number; seed?: number }> = ({ x, y, scale = 1, seed = 3 }) => {
  const { breathe, blink } = useIdle(seed);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g transform={`translate(0 ${breathe})`}>
        <rect x={-48} y={-176} width={96} height={92} rx={38} fill={P.teacher} stroke={P.ink} strokeWidth={SW} />
        <circle cx={0} cy={-212} r={38} fill={P.paper} stroke={P.ink} strokeWidth={SW} />
        <Face cx={0} cy={-212} r={38} blink={blink} />
        <circle cx={-13} cy={-214} r={11} fill="none" stroke={P.ink} strokeWidth={SW - 1} />
        <circle cx={13} cy={-214} r={11} fill="none" stroke={P.ink} strokeWidth={SW - 1} />
        <line x1={-2} y1={-214} x2={2} y2={-214} stroke={P.ink} strokeWidth={SW - 1} />
      </g>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={70} y={-104 - i * 16} width={70 - i * 8} height={14} rx={2} fill={[P.memory, P.teacher, P.judge][i]} stroke={P.ink} strokeWidth={SW - 1} />
      ))}
      <rect x={-160} y={-84} width={320} height={16} rx={3} fill={P.paper2} stroke={P.ink} strokeWidth={SW} />
      <line x1={-140} y1={-68} x2={-140} y2={0} stroke={P.ink} strokeWidth={SW} />
      <line x1={140} y1={-68} x2={140} y2={0} stroke={P.ink} strokeWidth={SW} />
    </g>
  );
};

/** Judge: an amber booth with a rubber stamp. `stamp` 0..1 drives the stamp down. */
export const Judge: React.FC<{ x: number; y: number; scale?: number; stamp?: number; seed?: number }> = ({ x, y, scale = 1, stamp = 0, seed = 5 }) => {
  const { breathe, blink } = useIdle(seed);
  const down = Math.sin(Math.min(1, stamp) * Math.PI) * 46;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g transform={`translate(0 ${breathe})`}>
        <rect x={-36} y={-160} width={72} height={76} rx={28} fill={P.judge} stroke={P.ink} strokeWidth={SW} />
        <circle cx={0} cy={-188} r={30} fill={P.paper} stroke={P.ink} strokeWidth={SW} />
        <Face cx={0} cy={-188} r={30} blink={blink} />
      </g>
      <rect x={-90} y={-84} width={180} height={84} rx={4} fill={P.paper2} stroke={P.ink} strokeWidth={SW} />
      <g transform={`translate(64 ${-150 + down})`}>
        <g className="stamp-arm">
          <rect x={-8} y={-30} width={16} height={34} rx={4} fill={P.ink} />
          <rect x={-22} y={4} width={44} height={14} rx={3} fill={P.judge} stroke={P.ink} strokeWidth={SW - 1} />
        </g>
      </g>
      {/* confidence gauge on the booth front: needle rotates -90 (0.0) .. +90 (1.0); notch at 0.8 */}
      <g transform="translate(-20 -6)">
        <path d="M -44 0 A 44 44 0 0 1 44 0" fill="none" stroke={P.ink} strokeWidth={SW} />
        <line x1={44 * Math.cos(Math.PI * 0.2)} y1={-44 * Math.sin(Math.PI * 0.2)} x2={56 * Math.cos(Math.PI * 0.2)} y2={-56 * Math.sin(Math.PI * 0.2)} stroke={P.judge} strokeWidth={SW + 1} className="notch" />
        <g className="needle" transform="rotate(-90)"><line x1={0} y1={0} x2={0} y2={-38} stroke={P.ink} strokeWidth={SW} strokeLinecap="round" /></g>
        <circle r={5} fill={P.ink} />
        <text className="gauge-val" x={0} y={-56} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={20} fill={P.ink} />
        <text x={50} y={-36} fontFamily={FONT} fontSize={15} fontWeight={700} fill={P.ink}>0.8</text>
      </g>
    </g>
  );
};

/** Filing cabinet that fills: `filled` cards visible in the open drawer, `count` label. */
export const Memory: React.FC<{ x: number; y: number; scale?: number; filled?: number; count?: number; open?: number }> = ({
  x, y, scale = 1, filled = 0, count, open = 1,
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x={-80} y={-220} width={160} height={220} rx={6} fill={P.paper2} stroke={P.ink} strokeWidth={SW} />
    {[0, 1].map((i) => (
      <g key={i}>
        <rect x={-66} y={-206 + i * 104} width={132} height={92} rx={4} fill={P.paper} stroke={P.ink} strokeWidth={SW} />
        <rect x={-18} y={-166 + i * 104} width={36} height={8} rx={4} fill={P.ink} />
      </g>
    ))}
    {/* top drawer: GSAP slides `.drawer` up/down; `filled` tabs stick out of it */}
    <g className="drawer" opacity={open}>
      <rect x={-72} y={-232} width={144} height={30} rx={3} fill={P.memory} stroke={P.ink} strokeWidth={SW} />
      {Array.from({ length: Math.min(filled, 12) }).map((_, i) => (
        <rect key={i} className="tab" x={-62 + i * 10} y={-246} width={8} height={22} rx={1} fill={P.paper} stroke={P.ink} strokeWidth={1.5} />
      ))}
    </g>
    {count !== undefined ? (
      <text x={0} y={36} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={30} fill={P.memory}>{count} saved</text>
    ) : null}
  </g>
);

/** A request note: paper card with a folded corner and a short question. */
export const Note: React.FC<{ x: number; y: number; text?: string; color?: string; rot?: number; w?: number; mark?: "ok" | "no" | null }> = ({
  x, y, text, color = P.ink, rot = 0, w = 170, mark = null,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d={`M ${-w / 2} -34 H ${w / 2 - 16} L ${w / 2} -18 V 34 H ${-w / 2} Z`} fill="#FFFFFF" stroke={P.ink} strokeWidth={SW} strokeLinejoin="round" />
    <path d={`M ${w / 2 - 16} -34 V -18 H ${w / 2}`} fill="none" stroke={P.ink} strokeWidth={SW - 1} />
    {text ? (
      <text x={0} y={7} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={600} fill={color}>{text}</text>
    ) : (
      [-12, 2, 16].map((dy, i) => <line key={dy} x1={-w / 2 + 16} y1={dy} x2={w / 2 - 24 - i * 18} y2={dy} stroke={P.line} strokeWidth={4} strokeLinecap="round" />)
    )}
    {mark === "ok" ? (
      <g transform="translate(40 18) rotate(-12)"><rect x={-34} y={-16} width={68} height={30} rx={4} fill="none" stroke={P.student} strokeWidth={SW} /><text x={0} y={7} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={18} fill={P.student}>OK</text></g>
    ) : null}
    {mark === "no" ? (
      <g transform="translate(40 18) rotate(-12)"><rect x={-40} y={-16} width={80} height={30} rx={4} fill="none" stroke={P.bad} strokeWidth={SW} /><text x={0} y={7} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={16} fill={P.bad}>UNSURE</text></g>
    ) : null}
  </g>
);

/** Odometer-style cost meter. */
export const Meter: React.FC<{ x: number; y: number; value: string; label: string; color?: string }> = ({ x, y, value, label, color = P.ink }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-110} y={-44} width={220} height={88} rx={10} fill="#FFFFFF" stroke={P.ink} strokeWidth={SW} />
    <text x={0} y={12} textAnchor="middle" fontFamily="Consolas, monospace" fontWeight={700} fontSize={38} fill={color}>{value}</text>
    <text x={0} y={70} textAnchor="middle" fontFamily={FONT} fontSize={18} fill={P.soft}>{label}</text>
  </g>
);

/** Path that draws itself: pass 0..1 progress. Dashed by default (data flow). */
export const Flow: React.FC<{ d: string; t: number; color?: string; dashed?: boolean }> = ({ d, t, color = P.ink, dashed = true }) => (
  <g>
    <path d={d} fill="none" stroke={P.line} strokeWidth={SW} strokeDasharray={dashed ? "2 10" : undefined} strokeLinecap="round" pathLength={1} />
    <path d={d} fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
  </g>
);

export const Label: React.FC<{ x: number; y: number; children: React.ReactNode; color?: string; size?: number; anchor?: "start" | "middle" | "end"; weight?: number }> = ({
  x, y, children, color = P.ink, size = 24, anchor = "middle", weight = 700,
}) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={FONT} fontSize={size} fontWeight={weight} fill={color}>{children}</text>
);
