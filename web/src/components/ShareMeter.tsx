"use client";

// The 10-cell student-share meter: filled blue squares for the share answered locally, orange
// outlines for the teacher's share. The cells fill one after another when the value changes.

import { motion } from "motion/react";
import { fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LocalMark, TeacherMark } from "./Markers";

const CELLS = 10;

export default function ShareMeter({
  share,
  title,
  right,
  className,
}: {
  /** 0..1, or null before there is any data. */
  share: number | null;
  title: string;
  right?: string;
  className?: string;
}) {
  const filled = share === null ? 0 : Math.round(share * CELLS);
  const pct = share === null ? null : Math.round(share * 100);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-between gap-3 text-[0.8125rem]">
        <span className="font-semibold">{title}</span>
        <span className="font-mono">{right ?? (pct === null ? "– / –" : `${pct} / ${100 - pct}`)}</span>
      </div>
      <div
        role="meter"
        aria-label="Share answered locally"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? 0}
        aria-valuetext={pct === null ? "No answers yet" : `${pct}% answered locally`}
        className="grid h-6 grid-cols-10 gap-[3px]"
      >
        {Array.from({ length: CELLS }, (_, i) => {
          const on = i < filled;
          const empty = share === null;
          return (
            <motion.span
              key={i}
              initial={false}
              animate={{
                backgroundColor: on ? "#1F4BFF" : "#FFFFFF",
                borderColor: on ? "#1F4BFF" : empty ? "#D4D4D4" : "#B54708",
              }}
              transition={{ duration: 0.18, delay: on ? i * 0.05 : (CELLS - i) * 0.03 }}
              className="border-[1.5px]"
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[0.8125rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <LocalMark className="text-local" /> Student {fmtPct(share)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TeacherMark className="text-teacher" /> Teacher {share === null ? "–" : fmtPct(1 - share)}
        </span>
      </div>
    </div>
  );
}
