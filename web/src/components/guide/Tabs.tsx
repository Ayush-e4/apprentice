"use client";

// Accessible tabs (WAI-ARIA tabs pattern): real buttons, aria-selected, roving tabindex,
// Left/Right/Home/End move between tabs. Used for OS and MCP-client choices.

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tab = { id: string; label: string; content: ReactNode };

export default function Tabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [current, setCurrent] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (current === last ? 0 : current + 1)
      : e.key === "ArrowLeft" ? (current === 0 ? last : current - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setCurrent(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="min-w-0">
      <div role="tablist" aria-label={label} className="flex flex-wrap border-b border-ink">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={i === current}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={i === current ? 0 : -1}
            onClick={() => setCurrent(i)}
            onKeyDown={onKey}
            className={cn(
              "relative -mb-px inline-flex min-h-11 items-center px-3 text-sm font-medium sm:px-4 sm:text-[0.9375rem] transition-colors focus-ring",
              i === current ? "border border-ink border-b-paper bg-paper text-ink" : "border border-transparent text-muted hover:text-ink",
            )}
          >
            {i === current && <span aria-hidden className="absolute inset-x-0 -top-px h-[3px] bg-local" />}
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={i !== current}
          className="pt-5"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
