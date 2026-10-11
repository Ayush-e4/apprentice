// Animated student -> judge -> teacher -> memory diagram. Pure SVG + CSS, two layouts:
// a wide one for tablets and up, a tall one for phones so the labels stay readable.

type Kind = "neutral" | "local" | "teacher" | "memory";
type NodeId = "question" | "student" | "judge" | "answer" | "teacher" | "memory";
type Box = { x: number; y: number };
type Side = "l" | "r" | "t" | "b";

const W = 148;
const H = 66;

const NODES: Record<NodeId, { title: string; sub: string; kind: Kind }> = {
  question: { title: "Question", sub: "OpenAI-compatible API", kind: "neutral" },
  student: { title: "Student", sub: "small model, on laptop", kind: "local" },
  judge: { title: "Judge", sub: "SQL check + fine-tuned", kind: "neutral" },
  answer: { title: "Answer", sub: "back to the app", kind: "neutral" },
  teacher: { title: "Teacher", sub: "large open model", kind: "teacher" },
  memory: { title: "Memory", sub: "teacher answers saved", kind: "memory" },
};

type Edge = [NodeId, Side, NodeId, Side, Kind, string?];

const WIDE = {
  view: "0 0 790 300",
  pos: {
    question: { x: 12, y: 40 },
    student: { x: 222, y: 40 },
    judge: { x: 432, y: 40 },
    answer: { x: 630, y: 40 },
    teacher: { x: 432, y: 212 },
    memory: { x: 222, y: 212 },
  } as Record<NodeId, Box>,
  edges: [
    ["question", "r", "student", "l", "neutral"],
    ["student", "r", "judge", "l", "local", "draft"],
    ["judge", "r", "answer", "l", "local", "pass"],
    ["judge", "b", "teacher", "t", "teacher", "fail"],
    ["teacher", "r", "answer", "b", "teacher"],
    ["teacher", "l", "memory", "r", "memory", "learn"],
    ["memory", "t", "student", "b", "memory", "examples"],
  ] as Edge[],
};

const TALL = {
  view: "0 0 360 470",
  pos: {
    question: { x: 106, y: 8 },
    student: { x: 12, y: 126 },
    judge: { x: 12, y: 254 },
    answer: { x: 106, y: 396 },
    teacher: { x: 200, y: 254 },
    memory: { x: 200, y: 126 },
  } as Record<NodeId, Box>,
  edges: [
    ["question", "b", "student", "t", "neutral"],
    ["student", "b", "judge", "t", "local", "draft"],
    ["judge", "b", "answer", "l", "local", "pass"],
    ["judge", "r", "teacher", "l", "teacher", "fail"],
    ["teacher", "b", "answer", "r", "teacher"],
    ["teacher", "t", "memory", "b", "memory", "learn"],
    ["memory", "l", "student", "r", "memory", "recall"],
  ] as Edge[],
};

const STROKE: Record<Kind, string> = {
  neutral: "stroke-zinc-400 dark:stroke-zinc-500",
  local: "stroke-emerald-500",
  teacher: "stroke-violet-500",
  memory: "stroke-sky-500",
};

// Spelled out in full so Tailwind's class scanner sees them.
const FILL: Record<Kind, string> = {
  neutral: "fill-zinc-400 dark:fill-zinc-500",
  local: "fill-emerald-500",
  teacher: "fill-violet-500",
  memory: "fill-sky-500",
};

const BOX: Record<Kind, string> = {
  neutral: "fill-white stroke-zinc-300 dark:fill-zinc-900 dark:stroke-zinc-700",
  local: "fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/60 dark:stroke-emerald-600",
  teacher: "fill-violet-50 stroke-violet-400 dark:fill-violet-950/60 dark:stroke-violet-600",
  memory: "fill-sky-50 stroke-sky-400 dark:fill-sky-950/60 dark:stroke-sky-600",
};

function anchor(b: Box, side: Side): [number, number] {
  if (side === "l") return [b.x, b.y + H / 2];
  if (side === "r") return [b.x + W, b.y + H / 2];
  if (side === "t") return [b.x + W / 2, b.y];
  return [b.x + W / 2, b.y + H];
}

function Diagram({ layout, className, id }: { layout: typeof WIDE; className: string; id: string }) {
  const paths = layout.edges.map(([a, as, b, bs, kind, label]) => {
    const [x1, y1] = anchor(layout.pos[a], as);
    const [x2, y2] = anchor(layout.pos[b], bs);
    return { d: `M${x1},${y1} L${x2},${y2}`, kind, label, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
  });
  return (
    <svg viewBox={layout.view} className={className} role="img" aria-labelledby={`${id}-title`}>
      <title id={`${id}-title`}>
        A question goes to the student. The judge checks the draft. If it passes, the answer goes back. If it fails,
        the teacher answers, and that answer is saved to memory so the student learns.
      </title>
      <defs>
        {(Object.keys(STROKE) as Kind[]).map((k) => (
          <marker key={k} id={`${id}-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className={FILL[k]} />
          </marker>
        ))}
      </defs>
      {paths.map((p, i) => (
        <g key={i}>
          <path d={p.d} className={`flow-line ${STROKE[p.kind]}`} strokeWidth="2" fill="none" markerEnd={`url(#${id}-arrow-${p.kind})`} />
          {p.kind !== "neutral" && (
            <circle r="4" className={FILL[p.kind]}>
              <animateMotion dur={`${2.2 + (i % 3) * 0.4}s`} repeatCount="indefinite" path={p.d} />
            </circle>
          )}
          {p.label && (
            <text x={p.mx} y={p.my - 7} textAnchor="middle" className="fill-zinc-500 text-[11px] font-medium dark:fill-zinc-400">
              {p.label}
            </text>
          )}
        </g>
      ))}
      {(Object.keys(NODES) as NodeId[]).map((n) => {
        const { x, y } = layout.pos[n];
        const node = NODES[n];
        return (
          <g key={n} className={n === "student" ? "pulse-soft" : undefined}>
            <rect x={x} y={y} width={W} height={H} rx="14" strokeWidth="1.5" className={BOX[node.kind]} />
            <text x={x + W / 2} y={y + 28} textAnchor="middle" className="fill-zinc-900 text-[15px] font-semibold dark:fill-zinc-50">
              {node.title}
            </text>
            <text x={x + W / 2} y={y + 47} textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
              {node.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function FlowDiagram() {
  return (
    <div className="w-full">
      <Diagram layout={WIDE} id="flow-wide" className="hidden h-auto w-full sm:block" />
      <Diagram layout={TALL} id="flow-tall" className="mx-auto block h-auto w-full max-w-sm sm:hidden" />
    </div>
  );
}
