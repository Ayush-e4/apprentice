// The badge and metadata row shown under every answer in both chat apps.

import type { AnswerMeta } from "@/lib/types";
import { fmtCost, fmtMs, isLocal } from "@/lib/format";

export function ServedPill({ servedBy, size = "md" }: { servedBy: string; size?: "sm" | "md" }) {
  const local = isLocal(servedBy);
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad} ${
        local
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30"
          : "bg-violet-100 text-violet-800 ring-1 ring-violet-600/20 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/30"
      }`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${local ? "bg-emerald-500" : "bg-violet-500"}`} />
      {local ? "Answered locally" : "Teacher"}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="text-zinc-400 dark:text-zinc-500">{label}</span>
      <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">{value}</span>
    </span>
  );
}

export default function ServedBadge({ meta }: { meta: AnswerMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <ServedPill servedBy={meta.served_by} />
      {meta.judge_score !== undefined && meta.judge_score !== null && (
        <Meta label="judge" value={meta.judge_score.toFixed(2)} />
      )}
      <Meta label="time" value={fmtMs(meta.latency_ms)} />
      <Meta label="cost" value={fmtCost(meta.cost_usd)} />
      <Meta label="remembered" value={String(meta.memory_hits ?? 0)} />
      {meta.top_sim !== undefined && meta.top_sim !== null && meta.top_sim > 0 && (
        <Meta label="similarity" value={meta.top_sim.toFixed(2)} />
      )}
    </div>
  );
}
