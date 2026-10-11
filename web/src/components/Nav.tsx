"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/kirana", label: "Kirana Copilot" },
  { href: "/support", label: "QuickBite Support" },
  { href: "/dashboard", label: "Dashboard" },
];

const REPO = "https://github.com/Ayush-e4/apprentice";

function GitHubIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm"
      >
        A
      </span>
      Apprentice
    </span>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active(href)
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="rounded-lg focus-ring" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${linkClass(l.href)} focus-ring`} aria-current={active(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer" className="btn-ghost ml-2" aria-label="Apprentice on GitHub">
            <GitHubIcon />
            <span className="hidden lg:inline">GitHub</span>
          </a>
        </div>
        <button
          type="button"
          className="btn-ghost md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>
      {open && (
        <div id="mobile-nav" className="border-t border-zinc-200 px-4 py-3 md:hidden dark:border-zinc-800">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${linkClass(l.href)} focus-ring`}
                aria-current={active(l.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <a href={REPO} target="_blank" rel="noreferrer" className={`${linkClass("#")} flex items-center gap-2 focus-ring`}>
              <GitHubIcon /> GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
