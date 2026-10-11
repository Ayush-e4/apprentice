// Clickable example questions above a chat box.

export default function ExampleChips({
  examples,
  onPick,
  disabled,
  label = "Try asking",
}: {
  examples: string[];
  onPick: (q: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  if (examples.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {examples.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-left text-sm text-zinc-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800 focus-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-200"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
