// 02: everything that shipped, grouped by area, one line per item with the number that backs it.

import { LocalMark } from "@/components/Markers";
import Section from "@/components/guide/Section";

const GROUPS: { code: string; title: string; items: string[] }[] = [
  {
    code: "BACKEND",
    title: "A gateway any app can drop in",
    items: [
      "OpenAI-compatible API in FastAPI: an app switches by changing one URL",
      "Student → SQL check → judge → teacher cascade, with the reason, time and cost on every answer",
      "Memory of teacher answers with nomic-embed-text search, scoped per app after we measured 263 cross-app leaks",
      "SQLite for traces, memory and eval runs, plus a health check for every model and the database",
      "Read-only SQL sandbox; found and closed a real VACUUM INTO / ATTACH write hole",
      "Automatic fallback: if our judge goes down, GLM-5.2 takes over judging with no downtime",
    ],
  },
  {
    code: "MODELS",
    title: "Two models fine-tuned today",
    items: [
      "Kev-0.8B fine-tuned into a SQL judge in about 15 minutes on a free Colab T4: 45.7% → 99.3%",
      "Judge v2 on 2,418 examples, including 374 real student mistakes and Hinglish: unseen shapes 74.3% → 78.0%, Hinglish 94.7% → 98.7%",
      "Judge v1 published as a GitHub release with a one-file server",
      "Training data built from our own benchmark, labelled by executing every query, so no guessed labels",
      "Student latency cut from 12.5 s to 1.4 s by switching off Qwen3's hidden reasoning",
    ],
  },
  {
    code: "FRONTEND",
    title: "A product, not a notebook",
    items: [
      "Next.js 15, React 19 and Tailwind v4 web app with 6 pages",
      "Design chosen from 3 Claude Design variations, then built with Motion and 4 Magic UI components",
      "Kirana Copilot: a Mumbai shop owner asks in English or Hinglish and gets the number",
      "QuickBite: a support desk with a 30-customer rush-hour simulation and live routing meter",
      "Live dashboard: requests, cost, benchmark runs and model health, polled every few seconds",
    ],
  },
  {
    code: "MCP + DEVELOPERS",
    title: "Usable from Claude, Cursor or code",
    items: [
      "MCP server with 5 tools, tested in Claude Code and Claude Desktop",
      "Installable with one uvx command, no clone needed",
      "Developer guide page, a one-command demo script and a Claude Desktop installer",
      "Live public demo over Cloudflare tunnels",
    ],
  },
  {
    code: "EVALS + SAFETY",
    title: "Measured, not claimed",
    items: [
      "265-question benchmark from 16 templates, graded by running the SQL against the gold answer",
      "Full system: 97.5% accuracy at 13% of the large model's cost, with 86% answered locally",
      "37 hostile inputs (injection, writes, nonsense): 36 handled safely, database never changed",
      "Unseen question types and Hinglish held-out sets that the judge never trained on",
    ],
  },
  {
    code: "ENGINEERING",
    title: "Built like it will be maintained",
    items: [
      "29 pull requests, each reviewed before merge; nothing pushed straight to main",
      "210 tests in CI on every PR; every source file under 300 lines",
      "MIT license, contributor guide, issue and PR templates, docs for every eval",
    ],
  },
];

export default function Shipped() {
  return (
    <Section id="shipped" index="02" title="What shipped" subtitle="Backend, models, frontend, MCP, evals and the engineering around them.">
      <div className="grid gap-px border border-rule bg-rule lg:grid-cols-2">
        {GROUPS.map((g) => (
          <article key={g.code} className="flex min-w-0 flex-col gap-4 bg-paper p-5 sm:p-7">
            <header className="flex flex-col gap-1.5">
              <span className="label-mono">{g.code}</span>
              <h3 className="text-xl font-bold tracking-[-0.02em]">{g.title}</h3>
            </header>
            <ul className="flex flex-col gap-2.5">
              {g.items.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed text-body">
                  <LocalMark className="mt-[0.55rem] text-local" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
