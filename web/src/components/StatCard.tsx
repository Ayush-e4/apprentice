// A single number with a label and an optional note. Meant to sit in a StatGrid, whose 1px gaps
// draw the black rules between cells.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = { ink: "text-ink", local: "text-local", teacher: "text-teacher" } as const;
export type Tone = keyof typeof TONES;

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-px border border-ink bg-ink lg:grid-cols-4", className)}>{children}</div>
  );
}

export default function StatCard({
  label,
  value,
  note,
  tone = "ink",
  children,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: Tone;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-paper p-4 sm:p-5">
      <p className="text-[0.8125rem] text-muted">{label}</p>
      <p className={cn("text-[2rem] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[2.5rem]", TONES[tone])}>{value}</p>
      {note && <p className="text-[0.8125rem] leading-snug text-muted">{note}</p>}
      {children}
    </div>
  );
}
