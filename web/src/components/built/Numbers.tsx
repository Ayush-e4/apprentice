// 01: the day in numbers, counted up as they scroll into view. Taken from git, GitHub and pytest.

import Ticker from "@/components/overview/Ticker";
import Section from "@/components/guide/Section";

const STATS = [
  { value: 29, label: "pull requests reviewed and merged" },
  { value: 67, label: "commits on main" },
  { value: 50, label: "green CI runs" },
  { value: 210, label: "automated tests, all passing" },
  { value: 17351, label: "lines of code and docs added" },
  { value: 2, label: "models fine-tuned and shipped" },
  { value: 5281, label: "judge training examples, every label checked by running the SQL" },
  { value: 6, label: "evaluation suites, from benchmark to hostile inputs" },
];

const HEADLINES = [
  { from: 25, to: 96.3, label: "Student accuracy after learning from the teacher, at $0" },
  { from: 45.7, to: 99.3, label: "Our judge before and after fine-tuning on a free Colab GPU" },
  { from: 12.5, to: 1.4, unit: "s", label: "Student answer time after turning off hidden reasoning" },
];

export default function Numbers() {
  return (
    <Section id="numbers" index="01" title="The day in numbers" subtitle="One developer, one AI pair programmer, about five hours of building.">
      <div className="flex flex-col gap-10">
        <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <li key={s.label} className="flex flex-col gap-2 bg-paper p-5 sm:p-6">
              <span className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                <Ticker value={s.value} delay={0.05 * i} />
              </span>
              <span className="text-[0.9375rem] leading-snug text-soft">{s.label}</span>
            </li>
          ))}
        </ul>
        <ul className="grid border-t border-ink md:grid-cols-3">
          {HEADLINES.map((h, i) => (
            <li key={h.label} className={`flex flex-col gap-2 py-5 md:pr-6 ${i ? "border-t border-rule md:border-l md:border-t-0 md:pl-6" : ""}`}>
              <span className="text-[2rem] font-bold tracking-[-0.03em] text-local sm:text-[2.25rem]">
                <Ticker value={h.from} decimals={h.from % 1 ? 1 : 0} suffix={h.unit ?? "%"} /> <span aria-hidden>→</span>
                <span className="sr-only">to</span> <Ticker value={h.to} decimals={1} suffix={h.unit ?? "%"} delay={0.4} />
              </span>
              <span className="leading-relaxed text-body">{h.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
