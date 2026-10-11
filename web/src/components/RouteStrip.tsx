// A strip of thin bars, one per request: green when the student answered, purple for the teacher.
// Reads left to right, so the demo shows green taking over as the student learns.

import { isLocal } from "@/lib/format";

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
    return <p className="text-xs text-zinc-400 dark:text-zinc-500">No requests yet.</p>;
  }
  return (
    <div>
      <div
        className="flex h-8 items-end gap-[2px] overflow-hidden"
        role="img"
        aria-label={`${label}: ${local} of ${items.length} answered locally`}
      >
        {items.map((s, i) => (
          <span
            key={i}
            className={`min-w-[2px] flex-1 rounded-sm ${isLocal(s) ? "h-full bg-emerald-500" : "h-1/2 bg-violet-500"}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>older</span>
        <span className="flex gap-3">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-sm bg-emerald-500" /> local
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-sm bg-violet-500" /> teacher
          </span>
        </span>
        <span>newer</span>
      </div>
    </div>
  );
}
