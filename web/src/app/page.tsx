import Link from "next/link";
import FlowDiagram from "@/components/overview/FlowDiagram";
import LiveStats from "@/components/overview/LiveStats";
import StatCard from "@/components/StatCard";
import { Card, SectionTitle } from "@/components/ui";

// Headline numbers from the README's benchmark (docs/benchmark.md).
const HEADLINES = [
  { label: "Student alone", value: "25%", note: "accuracy before it learns anything", accent: "amber" as const },
  { label: "Teacher alone", value: "100%", note: "at $0.1261 for the benchmark", accent: "violet" as const },
  { label: "Student after learning", value: "96%", note: "alone, on the laptop, at $0", accent: "emerald" as const },
  {
    label: "Cascade + judge",
    value: "97.5%",
    note: "at 13% of the teacher's cost, 86% answered locally",
    accent: "indigo" as const,
  },
];

const APPS = [
  {
    href: "/kirana",
    title: "Kirana Copilot",
    body: "A shop owner asks about sales in English or Hinglish and gets the number, not SQL.",
    cta: "Ask the shop",
    tone: "from-emerald-500 to-teal-600",
  },
  {
    href: "/support",
    title: "QuickBite Support",
    body: "A food-delivery help desk. Watch the student take over as it learns from the teacher.",
    cta: "Open the help desk",
    tone: "from-violet-500 to-fuchsia-600",
  },
];

export default function Home() {
  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="grid gap-8">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
            OpenAI-compatible gateway · open models only
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            A small model that{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-indigo-500 bg-clip-text text-transparent">learns on the job</span>.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            A small student model on your laptop answers first. A SQL check and a fine-tuned judge decide whether it got it
            right. If not, a large teacher answers, and that answer goes into memory, so next time the student gets it right
            on its own.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/kirana" className="btn btn-primary">
              Try Kirana Copilot
            </Link>
            <Link href="/dashboard" className="btn border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
              See the benchmark
            </Link>
          </div>
        </div>
        <Card className="p-3 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <FlowDiagram />
          </div>
        </Card>
      </section>

      <section aria-labelledby="headline-title">
        <div id="headline-title">
          <SectionTitle title="What the benchmark shows" subtitle="Text-to-SQL, 80 held-out questions. Student: Qwen3 1.7B on a laptop GPU. Teacher: a large open model." />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {HEADLINES.map((h) => (
            <StatCard key={h.label} label={h.label} value={h.value} note={h.note} accent={h.accent} />
          ))}
        </div>
        <Card className="mt-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">The judge is a fine-tuned Kev-0.8B</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Held-out accuracy at telling right SQL from wrong SQL.</p>
          </div>
          <div className="flex items-center gap-3 text-2xl font-bold tabular-nums">
            <span className="text-zinc-400 line-through decoration-2 dark:text-zinc-500">45.7%</span>
            <span aria-hidden className="text-zinc-400">→</span>
            <span className="text-emerald-600 dark:text-emerald-400">99.3%</span>
          </div>
        </Card>
      </section>

      <LiveStats />

      <section aria-labelledby="apps-title">
        <div id="apps-title">
          <SectionTitle title="Try it" subtitle="Two apps on the same gateway idea." />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {APPS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-ring dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${a.tone}`} />
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{a.body}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 group-hover:gap-2 dark:text-indigo-400">
                {a.cta} <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
