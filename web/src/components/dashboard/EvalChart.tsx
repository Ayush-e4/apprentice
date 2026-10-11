// Grouped bars: accuracy and student share for each benchmark run. Inline SVG, no chart library.

import type { EvalRun } from "@/lib/types";

const PLOT_H = 180;
const LEFT = 36;

export function runLabel(r: EvalRun): string {
  return `${r.phase} · ${r.mode}`;
}

export default function EvalChart({ runs }: { runs: EvalRun[] }) {
  // Fixed-ish canvas so a handful of runs does not blow the bars up; many runs scroll sideways.
  const width = Math.max(680, LEFT + runs.length * 64 + 12);
  const GROUP_W = (width - LEFT - 12) / Math.max(runs.length, 1);
  const BAR_W = Math.min(26, GROUP_W * 0.3);
  const flat = GROUP_W >= 120;
  const y = (v: number) => 10 + (1 - v) * PLOT_H;
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Accuracy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Answered by student
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${PLOT_H + 70}`}
          style={{ minWidth: 560 }}
          className="h-auto w-full"
          role="img"
          aria-label="Accuracy and student share for each benchmark run"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={LEFT} x2={width - 4} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-zinc-800" />
              <text x={LEFT - 6} y={y(t) + 3} textAnchor="end" className="fill-zinc-400 text-[11px] dark:fill-zinc-500">
                {t * 100}%
              </text>
            </g>
          ))}
          {runs.map((r, i) => {
            const gx = LEFT + i * GROUP_W + (GROUP_W - BAR_W * 2 - 4) / 2;
            const acc = r.accuracy ?? 0;
            const sh = r.student_share ?? 0;
            return (
              <g key={r.id}>
                <rect x={gx} y={y(acc)} width={BAR_W} height={PLOT_H + 10 - y(acc)} rx="3" className="fill-indigo-500">
                  <title>{`${runLabel(r)}: accuracy ${(acc * 100).toFixed(1)}%`}</title>
                </rect>
                <rect x={gx + BAR_W + 4} y={y(sh)} width={BAR_W} height={PLOT_H + 10 - y(sh)} rx="3" className="fill-emerald-500">
                  <title>{`${runLabel(r)}: student share ${(sh * 100).toFixed(1)}%`}</title>
                </rect>
                <text
                  x={gx + BAR_W + 2}
                  y={PLOT_H + 28}
                  textAnchor={flat ? "middle" : "end"}
                  transform={flat ? undefined : `rotate(-30 ${gx + BAR_W + 2} ${PLOT_H + 28})`}
                  className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
                >
                  {runLabel(r).slice(0, 26)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
