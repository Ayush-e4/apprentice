"use client";

// In-page contents: a sticky list on desktop, a collapsed disclosure on phones.
// Highlights the section currently in view.

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const SECTIONS = [
  { id: "what", label: "What Apprentice is" },
  { id: "mcp", label: "Try it in your Claude" },
  { id: "api", label: "Use it from your app" },
  { id: "self-host", label: "Run your own gateway" },
  { id: "judge", label: "Train your own judge" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "links", label: "Links" },
];

function List({ active, onPick }: { active: string; onPick?: () => void }) {
  return (
    <ol className="flex flex-col">
      {SECTIONS.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={onPick}
            aria-current={active === s.id ? "location" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 border-l-[3px] pl-3 text-[0.9375rem] transition-colors focus-ring",
              active === s.id ? "border-local font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
            {s.label}
          </a>
        </li>
      ))}
    </ol>
  );
}

export default function Toc() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label="On this page" className="min-w-0">
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="guide-toc"
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-12 w-full items-center justify-between border border-ink px-4 text-[0.9375rem] font-medium focus-ring"
        >
          On this page
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d={open ? "M2 9l5-5 5 5" : "M2 5l5 5 5-5"} />
          </svg>
        </button>
        {open && (
          <div id="guide-toc" className="border border-t-0 border-ink px-2 py-2">
            <List active={active} onPick={() => setOpen(false)} />
          </div>
        )}
        <div className="h-6" />
      </div>
      <div className="sticky top-[5.5rem] hidden lg:block">
        <p className="label-mono mb-3">On this page</p>
        <List active={active} />
      </div>
    </nav>
  );
}
