// Small presentational building blocks used across pages: square panels, numbered section
// titles, the page header, and loading / error states. Black 1px rules, no shadows, no radius.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border border-ink bg-paper", className)}>{children}</div>;
}

/** A product window: a titled frame with a mono caption, used for the two live demos. */
export function Window({
  title,
  caption,
  children,
  className,
  right,
  heading: Heading = "h2",
}: {
  title: string;
  heading?: "h2" | "h3";
  caption?: string;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <article className={cn("relative flex flex-col border border-ink bg-paper", className)}>
      <div className="flex items-center justify-between gap-4 border-b border-ink px-4 py-3.5 sm:px-5">
        <Heading className="text-base font-bold">{title}</Heading>
        {right ?? (caption && <span className="truncate font-mono text-xs text-muted">{caption}</span>)}
      </div>
      {children}
    </article>
  );
}

export function SectionTitle({
  index,
  title,
  subtitle,
  right,
  id,
}: {
  index?: string;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-x-6">
          {index && <span className="font-mono text-sm text-muted">{index}</span>}
          <h2 id={id} className="text-[1.75rem] font-bold leading-tight tracking-[-0.035em] sm:text-4xl">
            {title}
          </h2>
        </div>
        {subtitle && <p className="max-w-2xl leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="border-b border-rule pb-10 pt-12 sm:pt-16">
      <p className="label-mono">{eyebrow}</p>
      <h1 className="mt-4 max-w-4xl text-[2.5rem] font-bold leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
        {title}
        <span className="text-local">.</span>
      </h1>
      {children && <div className="mt-6 max-w-2xl text-lg leading-relaxed text-body">{children}</div>}
    </header>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border border-bad border-l-4 bg-paper px-4 py-2 text-sm text-bad"
    >
      <span className="flex items-center gap-2 py-1.5">
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.75" />
        </svg>
        {message}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost border-bad text-bad hover:border-bad">
          Retry
        </button>
      )}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
      <span aria-hidden className="h-3 w-3 animate-spin border-2 border-rule-strong border-t-local" />
      {label}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse bg-wash", className)} />;
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1.5" role="status" aria-label="Thinking">
      {[0, 160, 320].map((d) => (
        <span key={d} className="dot-step h-1.5 w-1.5 bg-ink" style={{ animationDelay: `${d}ms` }} />
      ))}
      <span className="ml-1 font-mono text-xs text-muted">thinking</span>
    </span>
  );
}
