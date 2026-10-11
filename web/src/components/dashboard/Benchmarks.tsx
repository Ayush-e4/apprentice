"use client";

import { GATEWAY, getJSON } from "@/lib/api";
import { fmtCost, fmtMs, fmtNum, fmtPct } from "@/lib/format";
import type { EvalRun } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import { Card, ErrorBanner, SectionTitle, Skeleton } from "@/components/ui";
import EvalChart from "./EvalChart";

const HEAD = ["Phase", "Mode", "N", "Accuracy", "Student share", "Cost", "p50", "p95", "Memory"];

export default function Benchmarks() {
  const { data, error, loading, refresh } = usePoll(() => getJSON<EvalRun[]>(GATEWAY, "/api/evals"), 30000);
  const runs = data ?? [];

  return (
    <section aria-labelledby="bench-title" className="space-y-4">
      <div id="bench-title">
        <SectionTitle
          title="Benchmark runs"
          subtitle="Recorded by python -m bench.run_eval on this gateway."
          right={
            <button type="button" className="btn-ghost" onClick={refresh}>
              Refresh
            </button>
          }
        />
      </div>
      {error && <ErrorBanner message={error} onRetry={refresh} />}
      {loading && !data && !error && <Skeleton className="h-64" />}
      {data && runs.length === 0 && (
        <Card className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No benchmark runs on this gateway yet. Run <code className="font-mono">python -m bench.run_eval all</code> to fill this in.
        </Card>
      )}
      {runs.length > 0 && (
        <>
          <Card className="p-4 sm:p-5">
            <EvalChart runs={runs} />
          </Card>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    {HEAD.map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 ${i > 1 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">{r.phase}</td>
                      <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{r.mode}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(r.n)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {fmtPct(r.accuracy, 1)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmtPct(r.student_share, 0)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtCost(r.cost_usd)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMs(r.p50_ms)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMs(r.p95_ms)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(r.memory_size)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </section>
  );
}
