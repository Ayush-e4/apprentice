// 03: call the gateway from your own code with any OpenAI client. Snippets and options from the README.

import CodeBlock from "./CodeBlock";
import Section, { Code, DataTable } from "./Section";
import Tabs from "./Tabs";

function python(gw: string) {
  return `from openai import OpenAI

client = OpenAI(base_url="${gw}/v1", api_key="unused")
reply = client.chat.completions.create(
    model="apprentice",
    messages=[{"role": "user", "content": "Explain a SQL LEFT JOIN in one sentence."}],
    extra_body={"apprentice": {"mode": "cascade"}},
)
print(reply.choices[0].message.content)
print(reply.model_extra["apprentice"])  # served_by, escalated, reason, cost_usd, latency_ms, ...`;
}

function curl(gw: string) {
  return `curl ${gw}/v1/chat/completions -H "Content-Type: application/json" \\
  -d '{"model": "apprentice", "messages": [{"role": "user", "content": "Hello"}], "apprentice": {"mode": "student"}}'`;
}

const RESPONSE = `"apprentice": {
  "served_by": "teacher",
  "escalated": true,
  "reason": "no similar memory (best sim 0.00)",
  "cost_usd": 0.00016,
  "latency_ms": 2140,
  "memory_hits": 0,
  "top_sim": 0.0,
  "check_score": null,
  "trace_id": 10
}`;

const OPTIONS: [string, string, string, string][] = [
  ["mode", "cascade · student · teacher", "cascade", "cascade tries the student and escalates when a check fails; the others call one model only."],
  ["memory", "true · false", "true", "Add similar remembered teacher answers to the student's prompt as examples."],
  ["learn", "true · false", "true", "Store teacher answers in memory (with a verifier, only ones that pass it)."],
  ["verifier", "sql", "none", "The student's SQL must run on the shop database and return rows, or the request escalates."],
  ["judge", "decision · llm", "none", "A second check on answers that passed the verifier. Low scores escalate."],
  ["scope", "any string", "hash of system messages", "Memory scope: remembered answers are reused only within the same scope."],
  ["tag", "any string", "none", "Label stored with the trace."],
];

export default function OwnApp({ gw }: { gw: string }) {
  return (
    <Section
      id="api"
      index="03"
      title="Use it from your own app"
      subtitle="The gateway speaks the OpenAI chat completions API, so any OpenAI client works. Use the model name apprentice."
    >
      <div className="flex flex-col gap-8">
        <Tabs
          label="Client"
          tabs={[
            { id: "python", label: "Python", content: <CodeBlock label="Python · pip install openai" code={python(gw)} highlight={gw} /> },
            { id: "curl", label: "curl", content: <CodeBlock label="curl · macOS / Linux shell" code={curl(gw)} highlight={gw} /> },
          ]}
        />
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <h3 className="text-xl font-bold tracking-[-0.02em]">What comes back</h3>
            <p className="leading-relaxed text-body">
              A standard chat completion plus an <Code>apprentice</Code> field that says who answered and why. Streaming
              is not supported yet.
            </p>
          </div>
          <CodeBlock label="Response · illustrative values" code={RESPONSE} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-xl font-bold tracking-[-0.02em]">Per-request options</h3>
          <p className="max-w-2xl leading-relaxed text-body">
            Put them in an <Code>apprentice</Code> object in the request body, or send <Code>X-Apprentice-&lt;Option&gt;</Code>{" "}
            headers (for example <Code>X-Apprentice-Mode: student</Code>).
          </p>
          <DataTable
            caption="Per-request options"
            head={["Option", "Values", "Default", "Meaning"]}
            rows={OPTIONS.map(([o, v, d, m]) => [o, <span key="v" className="font-mono text-[0.8125rem]">{v}</span>, d, m])}
          />
        </div>
      </div>
    </Section>
  );
}
