// 02, the headline: connect your own Claude to an Apprentice gateway over MCP, without cloning the repo.
// uvx fetches and runs the `apprentice-mcp` command (pyproject.toml) straight from GitHub.

import CodeBlock, { CopyButton } from "./CodeBlock";
import McpClients from "./McpClients";
import Section, { Code, DataTable, Step } from "./Section";
import Tabs from "./Tabs";

const PROMPTS = [
  "Use the apprentice tool to find which store had the most orders in March 2026.",
  "Show apprentice stats.",
  "Show apprentice benchmark results.",
];

const TOOLS: [string, string][] = [
  ["ask", "Send any question through the cascade; returns the answer plus who served it, why, cost and latency."],
  ["ask_shop_sql", "Text-to-SQL on the demo grocery database; returns the SQLite query and routing info (never runs it)."],
  ["stats", "Request totals, share served by the student, cost, latency, memory size and configured models."],
  ["recent_requests", "The newest traces (limit 1 to 100, default 10): route, reason, cost, question and answer."],
  ["benchmark_results", "Recorded benchmark runs: accuracy, student share, cost and latency per phase."],
];

export default function McpSetup({ gw, live }: { gw: string; live: boolean }) {
  return (
    <Section
      id="mcp"
      index="02"
      title="Try it in your Claude"
      subtitle={
        <>
          Through MCP, no clone needed. {live ? "These commands point at the live demo gateway." : "Point it at any running gateway."}
        </>
      }
    >
      <div className="flex flex-col gap-10">
        <Step n="1" title="Install uv">
          <p className="max-w-2xl text-body">
            <Code>uv</Code> provides <Code>uvx</Code>, which runs the Apprentice MCP server straight from GitHub. Open a new
            terminal afterwards so <Code>uvx</Code> is on your PATH.
          </p>
          <Tabs
            label="Operating system"
            tabs={[
              {
                id: "windows",
                label: "Windows",
                content: (
                  <CodeBlock
                    label="PowerShell"
                    code={`powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`}
                  />
                ),
              },
              {
                id: "unix",
                label: "Mac / Linux",
                content: <CodeBlock label="Terminal" code="curl -LsSf https://astral.sh/uv/install.sh | sh" />,
              },
            ]}
          />
        </Step>

        <Step n="2" title="Add Apprentice to your client">
          <McpClients gw={gw} />
        </Step>

        <Step n="3" title="Try these prompts">
          <ul className="flex flex-col border border-ink">
            {PROMPTS.map((p) => (
              <li key={p} className="flex items-center justify-between gap-3 border-b border-rule py-1 pl-4 pr-1 last:border-b-0">
                <span className="min-w-0 py-2 text-body">&ldquo;{p}&rdquo;</span>
                <CopyButton text={p} label="prompt" className="border-transparent" />
              </li>
            ))}
          </ul>
          <DataTable
            caption="The five MCP tools"
            head={["Tool", "What it does"]}
            rows={TOOLS.map(([t, d]) => [t, d])}
          />
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            <Code>ask</Code> and <Code>ask_shop_sql</Code> write a trace tagged <Code>mcp</Code> and may add a teacher
            answer to memory; the other three are read-only. The MCP server never resets data.
          </p>
        </Step>
      </div>
    </Section>
  );
}
