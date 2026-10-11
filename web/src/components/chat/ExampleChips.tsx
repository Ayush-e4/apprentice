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
      <p className="label-mono mb-2">{label}</p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {examples.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="min-h-11 shrink-0 border border-rule-strong bg-paper px-3 text-left text-[0.8125rem] text-body transition-colors hover:border-ink hover:text-ink focus-ring disabled:cursor-not-allowed disabled:opacity-45"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
