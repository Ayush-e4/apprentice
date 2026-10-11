"use client";

// The badge and metadata row shown under every answer in both chat apps.
// "Answered locally" is a solid blue tag with a square; "Teacher" an orange outline with a triangle.

import { motion } from "motion/react";
import type { AnswerMeta } from "@/lib/types";
import { fmtCost, fmtMs, isLocal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LocalMark, TeacherMark } from "./Markers";

export function ServedPill({ servedBy, size = "md" }: { servedBy: string; size?: "sm" | "md" }) {
  const local = isLocal(servedBy);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-[0.8125rem]",
        local ? "bg-local text-paper" : "border-[1.5px] border-teacher text-teacher",
      )}
    >
      {local ? <LocalMark /> : <TeacherMark />}
      {local ? "Answered locally" : "Teacher"}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-rule-strong px-2 py-1 font-mono text-xs text-body">
      <span className="text-muted">{label}</span>
      {value}
    </span>
  );
}

export default function ServedBadge({ meta }: { meta: AnswerMeta }) {
  const items: [string, string][] = [];
  if (meta.judge_score !== undefined && meta.judge_score !== null) items.push(["judge", meta.judge_score.toFixed(2)]);
  items.push(["time", fmtMs(meta.latency_ms)], ["cost", fmtCost(meta.cost_usd)]);
  items.push(["remembered", String(meta.memory_hits ?? 0)]);
  if (meta.top_sim !== undefined && meta.top_sim !== null && meta.top_sim > 0) items.push(["similarity", meta.top_sim.toFixed(2)]);

  return (
    <ul aria-label="Answer details" className="flex flex-wrap items-center gap-1.5">
      {[<ServedPill key="pill" servedBy={meta.served_by} />, ...items.map(([l, v]) => <Meta key={l} label={l} value={v} />)].map(
        (node, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 30, delay: i * 0.04 }}
            className="flex"
          >
            {node}
          </motion.li>
        ),
      )}
    </ul>
  );
}
