const REPO = "https://github.com/Ayush-e4/apprentice";

const MODELS = ["Qwen3 1.7B — Apache-2.0", "GLM-5.2 — MIT", "Kev-0.8B — Apache-2.0"];

export default function Footer() {
  return (
    <footer className="border-t border-ink">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm leading-relaxed sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-extrabold tracking-[-0.03em]">apprentice</span>
          <span className="text-muted">MIT License</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="label-mono">Built at</span>
          <span>Hacktoberfest 2026, Mumbai</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="label-mono">Open-weight models</span>
          {MODELS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <span className="label-mono">Source</span>
          <a href={REPO} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-local hover:underline focus-ring">
            github.com/Ayush-e4/apprentice
          </a>
        </div>
      </div>
    </footer>
  );
}
