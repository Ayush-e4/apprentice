// The overview's opening: meta line, the large headline, the pitch, two calls to action and the three
// headline results (from docs/benchmark.md), which count up on load. The entrance is plain CSS
// (.rise in globals.css) so the headline shows before hydration and is skipped under reduced motion.

import Link from "next/link";
import { LocalMark } from "@/components/Markers";
import Ticker from "./Ticker";

const META = ["v0 · OpenAI-compatible gateway", "Open-weight models only", "MIT", "Hacktoberfest 2026 · Mumbai"];

const NUMBERS = [
  { value: 97.5, decimals: 1, label: "accuracy, full system", local: false },
  { value: 13, decimals: 0, label: "of the teacher-only cost", local: false },
  { value: 86, decimals: 0, label: "answered locally", local: true },
];

export default function Hero() {
  return (
    <section className="border-b border-rule pb-14 pt-12 sm:pb-16 sm:pt-20">
      <div className="rise mb-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[0.8125rem] text-muted sm:mb-10">
        {META.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="rise" style={{ animationDelay: "80ms" }}>
        <h1 className="text-[clamp(2.25rem,8.5vw,7.5rem)] font-bold leading-[0.92] tracking-[-0.055em]">
          A small model that
          <br />
          learns on the job<span className="text-local">.</span>
        </h1>
      </div>
      <div className="mt-10 grid gap-10 sm:mt-12 lg:grid-cols-2 lg:gap-6">
        <div className="rise flex flex-col gap-7" style={{ animationDelay: "200ms" }}>
          <p className="max-w-xl text-lg leading-relaxed text-body sm:text-xl">
            A small open model on your laptop answers first. A SQL check and a trained judge decide whether it got it
            right. A large open model steps in only when needed, and its answer becomes memory, so the small model gets
            it right next time.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/kirana" className="btn btn-primary min-h-[52px] px-6">
              Try Kirana Copilot
              <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M2 8h11M9 4l4 4-4 4" />
              </svg>
            </Link>
            <Link href="#results" className="btn btn-ink min-h-[52px] px-6">
              See the benchmark
            </Link>
          </div>
        </div>
        <div className="rise" style={{ animationDelay: "300ms" }}>
          <dl className="grid grid-cols-3 border-t border-ink">
            {NUMBERS.map((n, i) => (
              <div
                key={n.label}
                className={`flex flex-col-reverse gap-1.5 pt-4 ${i ? "border-l border-rule pl-3 sm:pl-4" : "pr-3"}`}
              >
                <dt className="flex items-start gap-1.5 text-[0.8125rem] leading-snug text-muted">
                  {n.local && <LocalMark className="mt-1 text-local" />}
                  {n.label}
                </dt>
                <dd className={`text-[1.75rem] font-bold tracking-[-0.04em] sm:text-[2.75rem] ${n.local ? "text-local" : ""}`}>
                  <Ticker value={n.value} decimals={n.decimals} suffix="%" delay={0.3 + i * 0.1} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
