"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/kirana", label: "Kirana Copilot" },
  { href: "/support", label: "QuickBite Support" },
  { href: "/dashboard", label: "Dashboard" },
];

const REPO = "https://github.com/Ayush-e4/apprentice";

function CodeIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5.5 4L1.5 8l4 4M10.5 4l4 4-4 4" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.03em] text-ink">
      <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="1" width="20" height="20" />
        <path d="M6 15l5-8 5 8M8 12h6" />
      </svg>
      apprentice
    </span>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-ink bg-paper">
      <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center gap-10 px-4 sm:px-6">
        <Link href="/" className="inline-flex min-h-16 items-center focus-ring" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <div className="hidden flex-1 items-center gap-7 text-[0.9375rem] font-medium md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-16 items-center transition-colors focus-ring",
                active(l.href) ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {l.label}
              {active(l.href) && (
                <motion.span
                  layoutId="nav-underline"
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[3px] bg-local"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </Link>
          ))}
        </div>
        <a
          href={REPO}
          target="_blank"
          rel="noreferrer"
          className="ml-auto hidden min-h-11 items-center gap-2 border border-ink px-4 text-[0.9375rem] font-medium hover:bg-ink hover:text-paper focus-ring md:inline-flex"
        >
          <CodeIcon />
          GitHub
        </a>
        <button
          type="button"
          className="ml-auto inline-flex h-11 w-11 items-center justify-center border border-ink focus-ring md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-nav"
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden border-t border-ink md:hidden"
          >
            <ul className="flex flex-col px-4 py-2">
              {[...LINKS, { href: REPO, label: "GitHub" }].map((l, i) => {
                const external = l.href.startsWith("http");
                return (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.2 }}
                    className="border-b border-rule last:border-b-0"
                  >
                    <Link
                      href={l.href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer" : undefined}
                      aria-current={!external && active(l.href) ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-12 items-center justify-between text-base font-medium focus-ring",
                        !external && active(l.href) ? "text-ink" : "text-muted",
                      )}
                    >
                      {l.label}
                      {!external && active(l.href) && <span aria-hidden className="h-2 w-2 bg-local" />}
                      {external && <CodeIcon />}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
