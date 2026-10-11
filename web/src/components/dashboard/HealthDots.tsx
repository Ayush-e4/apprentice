"use client";

import { useEffect, useState } from "react";
import { ApiError, GATEWAY, getJSON } from "@/lib/api";
import { fmtMs } from "@/lib/format";
import type { Health } from "@/lib/types";

function Dot({ ok }: { ok: boolean }) {
  return ok ? (
    <svg aria-hidden width="8" height="8" viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="4" fill="var(--ok)" />
    </svg>
  ) : (
    <svg aria-hidden width="8" height="8" viewBox="0 0 8 8">
      <path d="M1 1l6 6M7 1L1 7" stroke="var(--bad)" strokeWidth="2" />
    </svg>
  );
}

// Health dots for each model behind the gateway. Hidden entirely when the gateway
// has no /api/health endpoint (older versions). Each chip also says "up" or "down" in words.
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
    <ul className="flex flex-wrap items-center gap-1.5 font-mono text-xs" aria-label="Model health">
      {down && !health && (
        <li className="inline-flex min-h-8 items-center gap-1.5 border border-bad px-2.5 text-bad">
          <Dot ok={false} /> gateway down
        </li>
      )}
      {health &&
        Object.entries(health.checks).map(([name, c]) => (
          <li
            key={name}
            title={[c.model, c.detail, c.latency_ms != null ? fmtMs(c.latency_ms) : null].filter(Boolean).join(" · ")}
            className={`inline-flex min-h-8 items-center gap-1.5 border px-2.5 ${c.ok ? "border-rule text-body" : "border-bad text-bad"}`}
          >
            <Dot ok={c.ok} />
            {name} {c.ok ? "up" : "down"}
          </li>
        ))}
    </ul>
  );
}
