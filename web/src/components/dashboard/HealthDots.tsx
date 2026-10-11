"use client";

import { useEffect, useState } from "react";
import { ApiError, GATEWAY, getJSON } from "@/lib/api";
import { fmtMs } from "@/lib/format";
import type { Health } from "@/lib/types";

// Health dots for each model behind the gateway. Hidden entirely when the gateway
// has no /api/health endpoint (older versions).
export default function HealthDots() {
  const [health, setHealth] = useState<Health | null>(null);
  const [supported, setSupported] = useState(true);
  const [down, setDown] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const h = await getJSON<Health>(GATEWAY, "/api/health");
        if (!alive) return;
        if (!h || typeof h.checks !== "object") {
          setSupported(false);
          return;
        }
        setHealth(h);
        setDown(false);
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 404) setSupported(false);
        else setDown(true);
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!supported || (!health && !down)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Model health">
      {down && !health && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <span aria-hidden className="h-2 w-2 rounded-full bg-rose-500" /> gateway down
        </span>
      )}
      {health &&
        Object.entries(health.checks).map(([name, c]) => (
          <span
            key={name}
            title={[c.model, c.detail, c.latency_ms != null ? fmtMs(c.latency_ms) : null].filter(Boolean).join(" · ")}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <span aria-hidden className={`h-2 w-2 rounded-full ${c.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
            {name}
            <span className="sr-only">{c.ok ? "healthy" : "unhealthy"}</span>
          </span>
        ))}
    </div>
  );
}
