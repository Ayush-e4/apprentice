"use client";

import { GATEWAY, getJSON } from "@/lib/api";
import { fmtCost, fmtNum, fmtPct, share } from "@/lib/format";
import type { Stats } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import RouteStrip from "@/components/RouteStrip";
import StatCard, { StatGrid } from "@/components/StatCard";
import { Card, ErrorBanner, SectionTitle, Skeleton } from "@/components/ui";

export function LiveTag({ every }: { every: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs text-soft">
      <span aria-hidden className="blink-soft h-2 w-2 bg-ok" /> LIVE · {every}
    </span>
  );
}

export default function LiveStats({ index }: { index?: string }) {
  const { data, error, loading, refresh } = usePoll(() => getJSON<Stats>(GATEWAY, "/api/stats"), 5000);

  return (
    <section aria-labelledby="live-title">
      <SectionTitle
        id="live-title"
        index={index}
        title="Live from the gateway"
        subtitle="Every request through this gateway, all apps combined."
        right={!error ? <LiveTag every="EVERY 5 S" /> : undefined}
      />
      {error && !data && <ErrorBanner message={error} onRetry={refresh} />}
      {loading && !data && !error && (
        <div className="grid grid-cols-2 gap-px border border-rule bg-rule lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}
      {data && (
        <>
          {error && (
            <div className="mb-3">
              <ErrorBanner message={`${error} (showing last data)`} onRetry={refresh} />
            </div>
          )}
          <StatGrid>
            <StatCard label="Requests" value={fmtNum(data.totals.requests)} />
            <StatCard
              label="Answered locally"
              value={fmtPct(share(data.totals.by_student, data.totals.requests))}
              note={`${fmtNum(data.totals.by_student)} by the student`}
              tone="local"
            />
            <StatCard label="Total cost" value={fmtCost(data.totals.cost_usd)} note="teacher calls only" />
            <StatCard label="Memory" value={fmtNum(data.memory_size)} note="remembered teacher answers" />
          </StatGrid>
          <Card className="mt-4 border-rule p-4 sm:p-5">
            <p className="label-mono mb-3">Who answered, request by request</p>
            <RouteStrip servedBy={data.timeline.map((t) => t.served_by)} />
          </Card>
        </>
      )}
    </section>
  );
}
