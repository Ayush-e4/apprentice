// A single number with a label and an optional note. Used for headline and live stats.

import type { ReactNode } from "react";

const ACCENTS = {
  indigo: "from-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  emerald: "from-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  violet: "from-violet-500/10 text-violet-600 dark:text-violet-400",
  sky: "from-sky-500/10 text-sky-600 dark:text-sky-400",
  amber: "from-amber-500/10 text-amber-600 dark:text-amber-400",
} as const;

export type Accent = keyof typeof ACCENTS;

export default function StatCard({
  label,
  value,
  note,
  accent = "indigo",
  children,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  accent?: Accent;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white bg-gradient-to-br to-transparent p-4 shadow-sm shadow-zinc-900/5 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 ${ACCENTS[accent]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{value}</p>
      {note && <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{note}</p>}
      {children}
    </div>
  );
}
