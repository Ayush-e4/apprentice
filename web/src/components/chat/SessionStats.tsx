// A compact row of numbers for the current chat session, ruled like an instrument panel.

import { fmtCost, fmtMs, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LocalMark } from "@/components/Markers";

export type SessionNumbers = {
  requests: number;
  local: number;
  cost: number;
  avgMs: number;
  memory?: number;
};

function Item({ label, value, local, className }: { label: string; value: string; local?: boolean; className?: string }) {
  return (
    <div className={cn("min-w-0 bg-paper px-4 py-3", className)}>
      <dt className="flex items-center gap-1.5 truncate text-[0.8125rem] text-muted">
        {local && <LocalMark className="text-local" />}
        {label}
      </dt>
      <dd className={cn("mt-1 text-2xl font-bold tracking-[-0.03em] tabular-nums", local && "text-local")}>{value}</dd>
    </div>
  );
}

export default function SessionStats({ n, title = "This session" }: { n: SessionNumbers; title?: string }) {
  const ratio = n.requests ? n.local / n.requests : null;
  const five = n.memory !== undefined;
  return (
    <section aria-label={title}>
      <p className="label-mono mb-2">{title}</p>
      <dl className={cn("grid grid-cols-2 gap-px border border-ink bg-ink", five ? "sm:grid-cols-5" : "sm:grid-cols-4")}>
        <Item label="Questions" value={fmtNum(n.requests)} />
        <Item label="Answered locally" value={fmtPct(ratio)} local />
        <Item label="Cost" value={fmtCost(n.cost)} />
        <Item label="Avg time" value={n.requests ? fmtMs(n.avgMs) : "–"} />
        {five && <Item label="Memory" value={fmtNum(n.memory)} className="col-span-2 sm:col-span-1" />}
      </dl>
    </section>
  );
}
