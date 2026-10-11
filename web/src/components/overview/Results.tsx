"use client";

// Headline benchmark results as horizontal accuracy bars, plus three supporting numbers.
// Every number comes from the README / docs (benchmark.md, judges.md, generalization.md).

import { motion, useReducedMotion } from "motion/react";
import { LocalMark, TeacherMark } from "@/components/Markers";
import Ticker from "./Ticker";

type Segment = { width: number; color: string };
type Row = { label: string; note?: string; value: number; decimals?: number; bars: Segment[]; mark?: "local" | "teacher" | "both"; strong?: boolean };

const GREY = "#A3A3A3";
const BLUE = "var(--local)";
const ORANGE = "var(--teacher)";

const ROWS: Row[] = [
  { label: "Student alone", note: "Qwen3 1.7B · $0", value: 25, bars: [{ width: 25, color: GREY }] },
  { label: "Teacher alone", note: "GLM-5.2 · $0.1261", value: 100, bars: [{ width: 100, color: ORANGE }], mark: "teacher" },
  { label: "Student after learning", note: "with the trained judge · $0", value: 96, bars: [{ width: 96, color: BLUE }], mark: "local" },
  {
    label: "Full system",
    note: "13% of the teacher cost · 86% local",
    value: 97.5,
    decimals: 1,
    bars: [
      { width: 83.85, color: BLUE },
      { width: 13.65, color: ORANGE },
    ],
    mark: "both",
    strong: true,
  },
];

const CELLS = [
  { code: "JUDGE · HELD-OUT", body: "Kev-0.8B, fine-tuned on a free Colab GPU, on 610 held-out judge examples.", from: 45.7, to: 99.3 },
  { code: "SUPPORT BOT · 30 CUSTOMERS", body: "18 of 30 answered locally, $0.025 in total for the simulated run.", value: 60, suffix: "% local" },
  { code: "KNOWN LIMIT", body: "Judge accuracy on question types it was not trained on.", value: 76.8, decimals: 1, suffix: "%", warn: true },
];

function Mark({ mark }: { mark?: Row["mark"] }) {
  if (mark === "local") return <LocalMark className="text-local" />;
  if (mark === "teacher") return <TeacherMark className="text-teacher" />;
  if (mark === "both")
    return (
      <span className="inline-flex items-center gap-1">
        <LocalMark className="text-local" />
        <TeacherMark className="text-teacher" />
      </span>
    );
  return <span aria-hidden className="inline-block h-2 w-2 bg-[#A3A3A3]" />;
}

export default function Results() {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-10">
      <div className="border-t border-ink">
        {ROWS.map((r, i) => (
          <div
            key={r.label}
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 border-b py-4 md:grid-cols-[16rem_minmax(0,1fr)_5rem] ${r.strong ? "border-ink" : "border-rule"}`}
          >
            <span className={`flex items-baseline gap-2 ${r.strong ? "font-bold" : "font-medium"}`}>
              <span className="translate-y-[-1px]">
                <Mark mark={r.mark} />
              </span>
              <span>
                {r.label} {r.note && <span className="block text-[0.8125rem] font-normal text-muted md:inline">{r.note}</span>}
              </span>
            </span>
            <div className="order-last col-span-2 flex h-5 bg-wash md:order-none md:col-span-1" aria-hidden>
              {r.bars.map((b, j) => (
                <motion.div
                  key={j}
                  className="h-full"
                  style={reduce ? { background: b.color, width: `${b.width}%` } : { background: b.color }}
                  initial={reduce ? false : { width: 0 }}
                  whileInView={reduce ? undefined : { width: `${b.width}%` }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.9, delay: 0.1 * i + (j ? 0.5 : 0), ease: [0.2, 0, 0, 1] }}
                />
              ))}
            </div>
            <span className="text-right text-xl font-bold">
              <Ticker value={r.value} decimals={r.decimals ?? 0} suffix="%" delay={0.1 * i} />
            </span>
          </div>
        ))}
      </div>
      <div className="grid gap-px border border-rule bg-rule md:grid-cols-3">
        {CELLS.map((c) => (
          <div key={c.code} className="flex flex-col gap-2 bg-paper p-5 sm:p-6">
            <span className={`flex items-center gap-1.5 font-mono text-xs ${c.warn ? "text-teacher" : "text-muted"}`}>
              {c.warn && <TeacherMark />}
              {c.code}
            </span>
            <span className="text-[1.75rem] font-bold tracking-[-0.03em] sm:text-[2rem]">
              {c.from !== undefined ? (
                <>
                  <Ticker value={c.from} decimals={1} suffix="%" /> <span aria-hidden>→</span>
                  <span className="sr-only">to</span> <Ticker value={c.to} decimals={1} suffix="%" delay={0.4} />
                </>
              ) : (
                <Ticker value={c.value ?? 0} decimals={c.decimals ?? 0} suffix={c.suffix} />
              )}
            </span>
            <span className="text-[0.9375rem] leading-relaxed text-soft">{c.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
