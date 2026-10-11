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
    <details className="group mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 text-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 font-medium text-zinc-600 select-none hover:text-zinc-900 focus-ring dark:text-zinc-400 dark:hover:text-zinc-100">
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-open:rotate-90" fill="currentColor">
          <path d="M7 5l6 5-6 5V5z" />
        </svg>
        {title}
      </summary>
      <div className="space-y-3 px-3 pb-3">
        {reason && (
          <p className="text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Routing: </span>
            {reason}
            {model && <span className="text-zinc-400 dark:text-zinc-500"> · model {model}</span>}
          </p>
        )}
        {sql && (
          <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs leading-relaxed text-zinc-100 dark:bg-black">
            <code>{sql}</code>
          </pre>
        )}
      </div>
    </details>
  );
}
