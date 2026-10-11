"use client";

// 03: why this saves money in production, and a calculator that scales our measured benchmark costs
// (80 questions: teacher alone $0.1261, full system $0.0165) to a company's daily traffic.

import { useState } from "react";
import { LocalMark, TeacherMark } from "@/components/Markers";
import Section from "@/components/guide/Section";
import { cn } from "@/lib/utils";

const TEACHER_PER_REQ = 0.1261 / 80;
const SYSTEM_RATIO = 0.0165 / 0.1261;

const VOLUMES = [
  { n: 10_000, label: "10K" },
  { n: 100_000, label: "100K" },
  { n: 1_000_000, label: "1M" },
  { n: 10_000_000, label: "10M" },
];
const PRICES = [
  { x: 1, label: "GLM-5.2 price (measured)" },
  { x: 10, label: "A 10× pricier model" },
];

const WHY = [
  "Most production traffic repeats: the same questions about orders, refunds, sales and status, all day.",
  "Today every one of those calls pays large-model prices. Apprentice pays them only for the hard ones.",
  "Every local answer is checked, so cheaper does not mean worse: 97.5% against the teacher's 100%.",
  "It gets cheaper over time. Each escalation teaches the student, and the student alone reached 96.3%.",
  "No rewrite: any OpenAI-SDK app switches by changing one URL, and every response says who answered.",
];

function money(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`;
  return `$${n.toFixed(0)}`;
}

function Choice<T>({ items, value, onPick, label, render }: { items: T[]; value: T; onPick: (v: T) => void; label: string; render: (v: T) => string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={render(it)}
          type="button"
          role="radio"
          aria-checked={it === value}
          onClick={() => onPick(it)}
          className={cn(
            "min-h-11 border px-3.5 text-sm font-medium focus-ring",
            it === value ? "border-ink bg-ink text-paper" : "border-rule-strong text-body hover:border-ink",
          )}
        >
          {render(it)}
        </button>
      ))}
    </div>
  );
}

export default function Savings() {
  const [volume, setVolume] = useState(VOLUMES[2]);
  const [price, setPrice] = useState(PRICES[0]);
  const before = volume.n * 365 * TEACHER_PER_REQ * price.x;
  const after = before * SYSTEM_RATIO;

  return (
    <Section
      id="savings"
      index="03"
      title="Why it saves real money"
      subtitle="Companies pay frontier prices for easy, repetitive requests. Apprentice sends those to a free model and keeps the big one for the rest."
    >
      <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ul className="flex flex-col border-t border-ink">
          {WHY.map((w, i) => (
            <li key={w} className="flex gap-4 border-b border-rule py-4 leading-relaxed text-body">
              <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
        <div className="flex min-w-0 flex-col gap-6 border border-ink p-5 sm:p-7">
          <div className="flex flex-col gap-3">
            <span className="label-mono">Requests per day</span>
            <Choice items={VOLUMES} value={volume} onPick={setVolume} label="Requests per day" render={(v) => v.label} />
          </div>
          <div className="flex flex-col gap-3">
            <span className="label-mono">Large model price</span>
            <Choice items={PRICES} value={price} onPick={setPrice} label="Large model price" render={(v) => v.label} />
          </div>
          <dl className="grid gap-px border border-rule bg-rule sm:grid-cols-3" aria-live="polite">
            <div className="flex flex-col gap-1 bg-paper p-4">
              <dt className="flex items-center gap-1.5 text-sm text-muted">
                <TeacherMark className="text-teacher" /> Large model only
              </dt>
              <dd className="text-2xl font-bold tracking-[-0.03em]">{money(before)}/yr</dd>
            </div>
            <div className="flex flex-col gap-1 bg-paper p-4">
              <dt className="flex items-center gap-1.5 text-sm text-muted">
                <LocalMark className="text-local" /> With Apprentice
              </dt>
              <dd className="text-2xl font-bold tracking-[-0.03em]">{money(after)}/yr</dd>
            </div>
            <div className="flex flex-col gap-1 bg-paper p-4">
              <dt className="text-sm text-muted">Saved</dt>
              <dd className="text-2xl font-bold tracking-[-0.03em] text-local">{money(before - after)}/yr</dd>
            </div>
          </dl>
          <p className="text-sm leading-relaxed text-muted">
            A projection, not a measurement: it scales our benchmark&apos;s measured costs (87% saved, 86% answered
            locally) to your traffic. It leaves out the GPU the student runs on, and real savings depend on how
            repetitive your traffic is.
          </p>
        </div>
      </div>
    </Section>
  );
}
