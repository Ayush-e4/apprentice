// 05: the judge notebooks and the released judge. Numbers are from docs/judges.md only.

import Section from "./Section";

const COLAB = "https://colab.research.google.com/github/Ayush-e4/apprentice/blob/main/notebooks";

const CARDS = [
  {
    tag: "Notebook · v1",
    title: "Train the SQL judge",
    href: `${COLAB}/train_sql_judge.ipynb`,
    cta: "Open in Colab",
    text: "Fine-tunes Kev-0.8B on a free Colab T4 GPU to tell right SQL from wrong, and can serve it on a temporary public URL.",
    stat: "45.7% → 99.3%",
    statLabel: "released Kev-0.8B vs fine-tuned, 610 held-out examples",
  },
  {
    tag: "Notebook · v2",
    title: "Train judge v2",
    href: `${COLAB}/train_sql_judge_v2.ipynb`,
    cta: "Open in Colab",
    text: "Fine-tunes v2 from the released v1 judge with unseen question types and Hinglish rewrites, and scores both.",
    stat: "74.3% → 78.0%",
    statLabel: "unseen question shapes; Hinglish 94.7% → 98.7%",
  },
  {
    tag: "Release",
    title: "Released judge v1",
    href: "https://github.com/Ayush-e4/apprentice/releases/tag/judge-v1",
    cta: "View on GitHub",
    text: "The fine-tuned v1 judge, published as a GitHub release, so you can serve it for judge=decision without training.",
    stat: null,
    statLabel: null,
  },
];

export default function TrainJudge() {
  return (
    <Section
      id="judge"
      index="05"
      title="Train your own judge"
      subtitle="The judge decides when the student's answer is good enough. Train one on a free GPU, or use the released one."
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {CARDS.map((c) => (
          <li key={c.title} className="flex min-w-0 flex-col border border-ink">
            <div className="flex flex-1 flex-col gap-3 p-5">
              <span className="label-mono">{c.tag}</span>
              <h3 className="text-xl font-bold tracking-[-0.02em]">{c.title}</h3>
              <p className="leading-relaxed text-body">{c.text}</p>
              {c.stat && (
                <p className="mt-auto flex flex-col gap-1 border-t border-rule pt-3">
                  <span className="text-2xl font-bold tracking-[-0.03em] text-local">{c.stat}</span>
                  <span className="text-sm text-muted">{c.statLabel}</span>
                </p>
              )}
            </div>
            <a
              href={c.href}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-between border-t border-ink px-5 font-medium hover:bg-ink hover:text-paper focus-ring"
            >
              {c.cta}
              <span className="sr-only"> (opens in a new tab)</span>
              <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 10L10 4M5 4h5v5" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
