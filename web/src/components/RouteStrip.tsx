"use client";

// A strip of thin bars, one per request: a full-height blue bar when the student answered,
// a half-height orange bar for the teacher. Reads left to right, so the demo shows blue taking over.

import { motion } from "motion/react";
import { isLocal } from "@/lib/format";
import { Legend } from "./Markers";

export default function RouteStrip({
  servedBy,
  max = 120,
  label = "Recent requests",
}: {
  servedBy: string[];
  max?: number;
  label?: string;
}) {
  const items = servedBy.slice(-max);
  const local = items.filter(isLocal).length;
  if (items.length === 0) {
    return <p className="font-mono text-xs text-muted">No requests yet.</p>;
  }
  return (
    <div>
      <div
        className="flex h-10 items-end gap-[2px] overflow-hidden border-b border-ink"
        role="img"
        aria-label={`${label}: ${local} of ${items.length} answered locally`}
      >
        {items.map((s, i) => (
          <motion.span
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ originY: 1 }}
            className={`min-w-[2px] flex-1 ${isLocal(s) ? "h-full bg-local" : "h-1/2 bg-teacher"}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted">
        <span>older</span>
        <Legend local={`local ${local}`} teacher={`teacher ${items.length - local}`} />
        <span>newer</span>
      </div>
    </div>
  );
}
