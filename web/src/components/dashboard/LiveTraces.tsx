"use client";

import { AnimatePresence, motion } from "motion/react";
import { GATEWAY, getJSON } from "@/lib/api";
import { fmtCost, fmtMs, fmtTime } from "@/lib/format";
import type { Trace } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import { ServedPill } from "@/components/ServedBadge";
import { LiveTag } from "@/components/overview/LiveStats";
import { Card, ErrorBanner, SectionTitle, Skeleton } from "@/components/ui";

export default function LiveTraces() {
  const { data, error, loading, refresh } = usePoll(() => getJSON<Trace[]>(GATEWAY, "/api/traces?limit=30"), 3000);

  return (
    <section aria-labelledby="traces-title">
      <SectionTitle
        id="traces-title"
        index="03"
        title="Live requests"
        subtitle="The latest 30 requests, refreshed every 3 seconds."
        right={<LiveTag every="EVERY 3 S" />}
      />
      <div className="flex flex-col gap-4">
        {error && <ErrorBanner message={error} onRetry={refresh} />}
        {loading && !data && !error && <Skeleton className="h-48" />}
        {data && data.length === 0 && (
          <Card className="border-dashed p-6 text-sm text-soft">
            No requests yet. Ask Kirana Copilot something and it will show up here.
          </Card>
        )}
        {data && data.length > 0 && (
          <ul className="border-t border-ink">
            <AnimatePresence initial={false}>
              {data.map((t) => (
                <motion.li
                  key={t.id}
                  layout="position"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="grid gap-1.5 border-b border-rule py-3 sm:grid-cols-[13rem_minmax(0,1fr)_auto] sm:items-center sm:gap-6"
                >
                  <div className="flex items-center gap-2">
                    <ServedPill servedBy={t.served_by} size="sm" />
                    <span className="whitespace-nowrap font-mono text-[0.6875rem] text-muted">{fmtTime(t.ts)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem]" title={t.question ?? ""}>
                      {t.question || "(no question)"}
                    </p>
                    <p className="truncate font-mono text-xs text-muted" title={t.reason ?? ""}>
                      {[t.tag, t.mode, t.reason].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-3 font-mono text-xs text-soft sm:justify-end">
                    {t.check_score !== null && <span>judge {t.check_score.toFixed(2)}</span>}
                    <span>{fmtMs(t.latency_ms)}</span>
                    <span>{fmtCost(t.cost_usd)}</span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
