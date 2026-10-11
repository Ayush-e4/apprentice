"use client";

import { GATEWAY, getJSON } from "@/lib/api";
import { fmtCost, fmtNum, fmtPct, share } from "@/lib/format";
import type { Stats } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import RouteStrip from "@/components/RouteStrip";
import StatCard from "@/components/StatCard";
import { Card, ErrorBanner, SectionTitle, Skeleton } from "@/components/ui";

export default function LiveStats() {
  const { data, error, loading, refresh } = usePoll(() => getJSON<Stats>(GATEWAY, "/api/stats"), 5000);

  const live = (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <span aria-hidden className="pulse-soft h-2 w-2 rounded-full bg-emerald-500" /> live · every 5 s
    </span>
  );

  return (
    <section aria-labelledby="live-title">
      <div id="live-title">
        <SectionTitle title="Live from the gateway" subtitle="Every request through this gateway, all apps combined." right={!error ? live : undefined} />
      </div>
      {error && !data && <ErrorBanner message={error} onRetry={refresh} />}
      {loading && !data && !error && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Requests" value={fmtNum(data.totals.requests)} accent="indigo" />
            <StatCard
              label="Answered locally"
              value={fmtPct(share(data.totals.by_student, data.totals.requests))}
              note={`${fmtNum(data.totals.by_student)} by the student`}
              accent="emerald"
            />
            <StatCard label="Total cost" value={fmtCost(data.totals.cost_usd)} note="teacher calls only" accent="violet" />
            <StatCard label="Memory" value={fmtNum(data.memory_size)} note="remembered teacher answers" accent="sky" />
          </div>
          <Card className="mt-3 p-4">
            <RouteStrip servedBy={data.timeline.map((t) => t.served_by)} />
          </Card>
        </>
      )}
    </section>
  );
}
