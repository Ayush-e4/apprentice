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
    <section aria-labelledby="bench-title">
      <SectionTitle
        id="bench-title"
        index="02"
        title="Benchmark runs"
        subtitle={
          <>
            Recorded by <code className="font-mono text-sm">python -m bench.run_eval</code> on this gateway.
          </>
        }
        right={
          <button type="button" className="btn-ghost" onClick={refresh}>
            Refresh
          </button>
        }
      />
      <div className="flex flex-col gap-6">
        {error && <ErrorBanner message={error} onRetry={refresh} />}
        {loading && !data && !error && <Skeleton className="h-64" />}
        {data && runs.length === 0 && (
          <Card className="border-dashed p-6 text-sm text-soft">
            No benchmark runs on this gateway yet. Run <code className="font-mono">python -m bench.run_eval all</code> to fill
            this in.
          </Card>
        )}
        {runs.length > 0 && (
          <>
            <EvalChart runs={runs} />
            <div className="overflow-x-auto border border-rule" tabIndex={0} role="region" aria-label="Benchmark runs table">
              <table className="w-full min-w-[720px] border-collapse text-[0.9375rem] tabular-nums">
                <thead>
                  <tr className="bg-wash">
                    {HEAD.map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={`px-4 py-3 font-mono text-xs font-medium uppercase text-soft ${i > 1 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-t border-rule hover:bg-wash">
                      <td className="px-4 py-3 font-medium">{r.phase}</td>
                      <td className="px-4 py-3 text-muted">{r.mode}</td>
                      <td className="px-4 py-3 text-right">{fmtNum(r.n)}</td>
                      <td className="px-4 py-3 text-right font-bold">{fmtPct(r.accuracy, 1)}</td>
                      <td className="px-4 py-3 text-right text-local">{fmtPct(r.student_share, 0)}</td>
                      <td className="px-4 py-3 text-right">{fmtCost(r.cost_usd)}</td>
                      <td className="px-4 py-3 text-right">{fmtMs(r.p50_ms)}</td>
                      <td className="px-4 py-3 text-right">{fmtMs(r.p95_ms)}</td>
                      <td className="px-4 py-3 text-right">{fmtNum(r.memory_size)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
