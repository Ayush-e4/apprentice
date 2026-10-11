// Collapsible "Why + SQL" explanation under an answer.

export default function WhyPanel({
  reason,
  sql,
  model,
  title = "Why + SQL",
}: {
  reason: string | null;
  sql?: string | null;
  model?: string;
  title?: string;
}) {
  if (!reason && !sql) return null;
  return (
    <details className="group mt-3 border-t border-rule text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold select-none hover:text-local focus-ring [&::-webkit-details-marker]:hidden">
        <svg aria-hidden viewBox="0 0 10 10" className="h-2.5 w-2.5 transition-transform group-open:rotate-90" fill="currentColor">
          <path d="M2 1l6 4-6 4z" />
        </svg>
        {title}
      </summary>
      <div className="space-y-3 pb-1">
        {reason && (
          <p className="leading-relaxed text-soft">
            <span className="label-mono mr-2">Routing</span>
            {reason}
            {model && <span className="font-mono text-xs text-muted"> · model {model}</span>}
          </p>
        )}
        {sql && (
          <pre className="overflow-x-auto bg-wash p-4 font-mono text-[0.8125rem] leading-relaxed text-ink">
            <code>{sql}</code>
          </pre>
        )}
      </div>
    </details>
  );
}
