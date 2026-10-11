// 04: what the same recipe could do with real training budgets and real production traffic.

import Section from "@/components/guide/Section";

const IDEAS = [
  {
    code: "DISTILL",
    title: "Train the student on what it learns",
    text: "LoRA-fine-tune the student on the teacher answers it collects, so lessons move from memory into the weights and escalations trend toward zero. GLM-5.2's MIT license allows it.",
  },
  {
    code: "ANY TASK",
    title: "A trained judge for every domain",
    text: "Our judge took 15 minutes on a free GPU. The same recipe, with data labelled by running the answer, works for code, data extraction, support replies and forms.",
  },
  {
    code: "SUPPORT AT SCALE",
    title: "Call centres and help desks",
    text: "Millions of near-identical tickets a day. The repeats move to one GPU in your own data centre, and the large model handles only the new and unusual ones.",
  },
  {
    code: "BHARAT",
    title: "Every Indian language, offline",
    text: "Hinglish already scores 98.7%. Extend it to Marathi, Tamil and Bengali, and run the student in a kirana shop or a village clinic with patchy internet.",
  },
  {
    code: "PRIVACY",
    title: "Data that never leaves",
    text: "Banks, hospitals and governments keep most traffic on their own machines. Only the hard cases go to the large model, and those can be redacted first.",
  },
  {
    code: "FLEET LEARNING",
    title: "Teach once, every instance knows",
    text: "With shared memory, one teacher answer teaches every branch, store and region at once. The more traffic you have, the faster the cost drops.",
  },
];

export default function AtScale() {
  return (
    <Section
      id="scale"
      index="04"
      title="What it could do at scale"
      subtitle="Today it runs on one laptop with a 1.7B model. Here is where the same idea goes with real training budgets."
    >
      <div className="flex flex-col gap-10">
        <ol className="grid gap-px border border-rule bg-rule md:grid-cols-2 lg:grid-cols-3">
          {IDEAS.map((idea, i) => (
            <li key={idea.code} className="flex flex-col gap-3 bg-paper p-5 sm:p-6">
              <span className="flex items-baseline justify-between gap-3">
                <span className="label-mono">{idea.code}</span>
                <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <h3 className="text-lg font-bold tracking-[-0.02em]">{idea.title}</h3>
              <p className="leading-relaxed text-body">{idea.text}</p>
            </li>
          ))}
        </ol>
        <blockquote className="border-l-4 border-local pl-5 text-xl font-bold leading-snug tracking-[-0.02em] sm:text-2xl">
          The big model stops being the default and becomes the teacher. You pay for intelligence once, and then reuse it
          for free.
        </blockquote>
      </div>
    </Section>
  );
}
