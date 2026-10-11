"use client";

// A code block with a Copy button. Geist Mono, square, black rule; long lines scroll inside the box
// so the page itself never scrolls sideways on a phone. `highlight` marks every occurrence of a
// string (the gateway URL) in the local blue; the copied text is always the plain code.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** navigator.clipboard needs a secure context (https or localhost); fall back to a hidden textarea otherwise. */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    const ok = await writeClipboard(text);
    setCopied(ok);
    if (timer.current) clearTimeout(timer.current);
    if (ok) timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      className={cn("btn-ghost shrink-0 font-mono text-xs", copied && "border-ok text-ok", className)}
    >
      <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        {copied ? <path d="M2 7.5l3 3 7-7" /> : <path d="M4.5 4.5V1.5h8v8h-3M1.5 4.5h8v8h-8z" />}
      </svg>
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function marked(code: string, highlight?: string): ReactNode {
  if (!highlight || !code.includes(highlight)) return code;
  return code.split(highlight).flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <mark key={i} className="bg-local/10 font-semibold text-local">
            {highlight}
          </mark>,
          part,
        ],
  );
}

export default function CodeBlock({
  code,
  label,
  highlight,
  className,
}: {
  code: string;
  label: string;
  highlight?: string;
  className?: string;
}) {
  return (
    <figure className={cn("min-w-0 border border-ink bg-paper", className)}>
      <figcaption className="flex items-center justify-between gap-3 border-b border-ink py-1 pl-4 pr-1">
        <span className="label-mono truncate">{label}</span>
        <CopyButton text={code} label={`${label} code`} className="border-transparent" />
      </figcaption>
      <pre tabIndex={0} className="overflow-x-auto bg-wash px-4 py-3.5 font-mono text-[0.8125rem] leading-relaxed text-ink focus-ring">
        <code>{marked(code, highlight)}</code>
      </pre>
    </figure>
  );
}
