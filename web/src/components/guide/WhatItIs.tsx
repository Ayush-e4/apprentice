// 01: what Apprentice is, in one paragraph and a three-step flow.

import Link from "next/link";
import { LocalMark, TeacherMark } from "@/components/Markers";
import Section from "./Section";

const FLOW = [
  {
    mark: <LocalMark className="text-local" />,
    who: "Student answers",
    text: "A small open model (Qwen3 1.7B via Ollama) answers first, with similar remembered answers as examples.",
  },
  {
    mark: <span aria-hidden className="h-2 w-2 shrink-0 border border-ink" />,
    who: "Judge checks",
    text: "A SQL check runs the query, and an optional trained judge scores the answer. A failing answer escalates.",
  },
  {
    mark: <TeacherMark className="text-teacher" />,
    who: "Teacher teaches",
    text: "A large open model answers instead, and its answer goes into memory, so the student gets it right next time.",
  },
];

export default function WhatItIs() {
  return (
    <Section id="what" index="01" title="What Apprentice is">
      <div className="flex flex-col gap-8">
        <p className="max-w-3xl text-lg leading-relaxed text-body">
          Apprentice is an OpenAI-compatible gateway. You send it a normal chat completion; a small model on your own
          machine tries first, a check decides whether that answer is good enough, and a large model steps in only when
          it isn&apos;t. Every response says who answered, why, and what it cost.
        </p>
        <ol className="grid border-t border-ink sm:grid-cols-3">
          {FLOW.map((f, i) => (
            <li key={f.who} className={`flex flex-col gap-2 py-5 sm:pr-5 ${i ? "border-t border-rule sm:border-l sm:border-t-0 sm:pl-5" : ""}`}>
              <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex items-center gap-2 text-lg font-bold">
                {f.mark}
                {f.who}
              </span>
              <span className="leading-relaxed text-body">{f.text}</span>
            </li>
          ))}
        </ol>
        <p>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-medium text-local underline-offset-4 hover:underline focus-ring">
            Full diagram and benchmark results on the Overview
            <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M2 8h11M9 4l4 4-4 4" />
            </svg>
          </Link>
        </p>
      </div>
    </Section>
  );
}
