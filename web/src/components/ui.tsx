// Small presentational building blocks used across pages.

import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{children}</div>}
    </header>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-rose-500" />
        {message}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost text-rose-700 dark:text-rose-200">
          Retry
        </button>
      )}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400" role="status">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-500 dark:border-zinc-700 dark:border-t-indigo-400"
      />
      {label}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-800 ${className}`} />;
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" role="status" aria-label="Thinking">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}
