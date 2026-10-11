"use client";

import { GATEWAY, getJSON } from "@/lib/api";
import { fmtCost, fmtMs, fmtTime } from "@/lib/format";
import type { Trace } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import { ServedPill } from "@/components/ServedBadge";
import { Card, ErrorBanner, SectionTitle, Skeleton } from "@/components/ui";

export default function LiveTraces() {
  const { data, error, loading, refresh } = usePoll(() => getJSON<Trace[]>(GATEWAY, "/api/traces?limit=30"), 3000);

  return (
    <section aria-labelledby="traces-title" className="space-y-4">
      <div id="traces-title">
        <SectionTitle
          title="Live requests"
          subtitle="The latest 30 requests, refreshed every 3 seconds."
          right={
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span aria-hidden className="pulse-soft h-2 w-2 rounded-full bg-emerald-500" /> live
            </span>
          }
        />
      </div>
      {error && <ErrorBanner message={error} onRetry={refresh} />}
      {loading && !data && !error && <Skeleton className="h-48" />}
      {data && data.length === 0 && (
        <Card className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No requests yet. Ask Kirana Copilot something and it will show up here.
        </Card>
      )}
      {data && data.length > 0 && (
        <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {data.map((t) => (
            <div key={t.id} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <ServedPill servedBy={t.served_by} size="sm" />
                <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{fmtTime(t.ts)}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-800 dark:text-zinc-200" title={t.question ?? ""}>
                  {t.question || "(no question)"}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={t.reason ?? ""}>
                  {[t.tag, t.mode, t.reason].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex gap-3 text-xs tabular-nums text-zinc-600 sm:justify-end dark:text-zinc-400">
                {t.check_score !== null && <span>judge {t.check_score.toFixed(2)}</span>}
                <span>{fmtMs(t.latency_ms)}</span>
                <span>{fmtCost(t.cost_usd)}</span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
