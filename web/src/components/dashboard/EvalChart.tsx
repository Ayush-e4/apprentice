"use client";

// Horizontal bars per benchmark run: accuracy in ink, share answered by the student in blue.
// Plain HTML, no chart library; the bars grow in when scrolled into view.

import { motion, useReducedMotion } from "motion/react";
import { fmtPct } from "@/lib/format";
import type { EvalRun } from "@/lib/types";
import { LocalMark } from "@/components/Markers";

export function runLabel(r: EvalRun): string {
  return `${r.phase} · ${r.mode}`;
}

function Bar({ value, color, delay, label }: { value: number | null; color: string; delay: number; label: string }) {
  const reduce = useReducedMotion();
  const width = `${Math.max(0, Math.min(1, value ?? 0)) * 100}%`;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.75rem] items-center gap-3">
      <div className="h-3 bg-wash" aria-hidden>
        <motion.div
          className="h-full"
          style={reduce ? { width, background: color } : { background: color }}
          initial={reduce ? false : { width: 0 }}
          whileInView={reduce ? undefined : { width }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay, ease: [0.2, 0, 0, 1] }}
        />
      </div>
      <span className="text-right font-mono text-xs">
        <span className="sr-only">{label} </span>
        {fmtPct(value, 1)}
      </span>
    </div>
  );
}

export default function EvalChart({ runs }: { runs: EvalRun[] }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-4 bg-ink" /> Accuracy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LocalMark className="text-local" /> Answered by the student
        </span>
      </div>
      <ul className="border-t border-ink" aria-label="Accuracy and student share for each benchmark run">
        {runs.map((r, i) => (
          <li
            key={r.id}
            className="grid gap-x-6 gap-y-2 border-b border-rule py-3 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:items-center"
          >
            <span className="truncate text-sm font-medium" title={runLabel(r)}>
              {runLabel(r)}
            </span>
            <div className="flex flex-col gap-1.5">
              <Bar value={r.accuracy} color="var(--ink)" delay={0.05 * i} label="accuracy" />
              <Bar value={r.student_share} color="var(--local)" delay={0.05 * i + 0.15} label="answered by the student" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
