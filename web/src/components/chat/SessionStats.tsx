// A compact row of numbers for the current chat session.

import { fmtCost, fmtMs, fmtNum, fmtPct } from "@/lib/format";

export type SessionNumbers = {
  requests: number;
  local: number;
  cost: number;
  avgMs: number;
  memory?: number;
};

function Item({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
      <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className={`text-lg font-bold tabular-nums ${tone ?? "text-zinc-900 dark:text-zinc-50"}`}>{value}</dd>
    </div>
  );
}

export default function SessionStats({ n, title = "This session" }: { n: SessionNumbers; title?: string }) {
  const ratio = n.requests ? n.local / n.requests : null;
  return (
    <section aria-label={title}>
      <dl className={`grid grid-cols-2 gap-2 ${n.memory !== undefined ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
        <Item label="Questions" value={fmtNum(n.requests)} />
        <Item label="Answered locally" value={fmtPct(ratio)} tone="text-emerald-600 dark:text-emerald-400" />
        <Item label="Cost" value={fmtCost(n.cost)} tone="text-violet-600 dark:text-violet-400" />
        <Item label="Avg time" value={n.requests ? fmtMs(n.avgMs) : "–"} />
        {n.memory !== undefined && <Item label="Memory" value={fmtNum(n.memory)} tone="text-sky-600 dark:text-sky-400" />}
      </dl>
    </section>
  );
}
