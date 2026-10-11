// 04: run your own gateway and web app. Commands from the README; settings from docs/configuration.md.

import CodeBlock from "./CodeBlock";
import Section, { Code, DataTable, Step } from "./Section";
import Tabs from "./Tabs";

const SETUP_UNIX = `git clone https://github.com/Ayush-e4/apprentice.git
cd apprentice
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
ollama pull qwen3:1.7b
cp .env.example .env`;

const SETUP_WIN = `git clone https://github.com/Ayush-e4/apprentice.git
cd apprentice
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
ollama pull qwen3:1.7b
copy .env.example .env`;

const SETTINGS: [string, string][] = [
  ["TEACHER_API_KEY", "Key for the teacher endpoint. The only value you must set."],
  ["TEACHER_BASE_URL / _MODEL", "Large open model; .env.example uses Command Code's Provider API with zai-org/GLM-5.2."],
  ["STUDENT_BASE_URL / _MODEL", "Small model tried first; defaults to Ollama at localhost:11434 with qwen3:1.7b."],
  ["TEACHER_PRICE_IN / _OUT", "USD per 1M tokens, for cost numbers. Without prices costs show as $0."],
  ["EMBED_BASE_URL / _MODEL", "Optional embeddings for memory search; falls back to word overlap if unset."],
  ["MEMORY_MIN_SIM", "Minimum similarity for a remembered answer to be used (default 0.55)."],
  ["JUDGE_BASE_URL / _MODEL", "Optional decision judge for judge=decision (any /v1/systemone server)."],
  ["JUDGE_FALLBACK", "Set to llm to ask the LLM judge when the decision judge is unreachable."],
];

export default function SelfHost() {
  return (
    <Section
      id="self-host"
      index="04"
      title="Run your own gateway"
      subtitle="You need Python 3.11+, Ollama, Node for the web app, and an API key for the teacher endpoint."
    >
      <div className="flex flex-col gap-10">
        <Step n="1" title="Install">
          <Tabs
            label="Operating system"
            tabs={[
              { id: "unix", label: "Mac / Linux", content: <CodeBlock label="Terminal" code={SETUP_UNIX} /> },
              { id: "windows", label: "Windows", content: <CodeBlock label="PowerShell" code={SETUP_WIN} /> },
            ]}
          />
          <p className="max-w-2xl text-body">
            Open <Code>.env</Code> and set <Code>TEACHER_API_KEY</Code>. Every setting is explained in{" "}
            <Code>docs/configuration.md</Code>.
          </p>
          <DataTable caption="Key .env settings" head={["Setting", "Meaning"]} rows={SETTINGS.map(([s, m]) => [s, m])} />
        </Step>

        <Step n="2" title="Start the gateway">
          <CodeBlock label="Terminal" code="uvicorn apprentice.gateway:app --port 8000" />
          <p className="max-w-2xl text-body">The gateway serves APIs only. The UI is the Next.js app in <Code>web/</Code>.</p>
        </Step>

        <Step n="3" title="Start the web app">
          <CodeBlock label="Terminal" code={`cd web\nnpm install\nnpm run build\nnpm start -- -p 3100`} />
          <p className="max-w-2xl text-body">
            Then open <Code>http://localhost:3100</Code>. Set <Code>APPRENTICE_URL</Code> in <Code>web/.env.local</Code> if
            the gateway runs elsewhere.
          </p>
        </Step>

        <Step n="4" title="Or, on Windows, one command">
          <CodeBlock label="PowerShell" code={`powershell -ExecutionPolicy Bypass -File scripts\\demo.ps1`} />
          <p className="max-w-2xl text-body">
            Starts both gateways and the web app, then prints a health check of every dependency.
          </p>
        </Step>
      </div>
    </Section>
  );
}
