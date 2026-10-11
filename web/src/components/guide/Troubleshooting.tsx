// 06: the four problems people hit most, from docs/mcp.md and docs/judges.md.

import type { ReactNode } from "react";
import Section, { Code } from "./Section";

function items(gw: string): { q: string; a: ReactNode }[] {
  return [
    {
      q: "“Apprentice gateway is not reachable”",
      a: (
        <>
          The gateway isn&apos;t running, or runs somewhere else. Open <Code>{gw}/v1/models</Code> in a browser to check.
          Start it with <Code>uvicorn apprentice.gateway:app --port 8000</Code>, or set <Code>APPRENTICE_URL</Code> to its
          root URL (without <Code>/v1</Code>).
        </>
      ),
    },
    {
      q: "Claude doesn’t show the apprentice tool",
      a: (
        <>
          Claude Desktop only reads its config at start: fully quit it from the system tray and reopen it. If the entry
          keeps disappearing, use Claude Code instead and check with <Code>/mcp</Code>.
        </>
      ),
    },
    {
      q: "“uvx: command not found”",
      a: <>The installer updates your PATH for new terminals only. Close the terminal, open a new one, and run the command again.</>,
    },
    {
      q: "The judge shows “unavailable”",
      a: (
        <>
          The decision judge (often served from a Colab session) is down. With <Code>JUDGE_FALLBACK=llm</Code> in{" "}
          <Code>.env</Code>, the gateway asks the LLM judge instead: slower and stricter, but never less safe. The
          dashboard&apos;s health dots show when it is back.
        </>
      ),
    },
  ];
}

export default function Troubleshooting({ gw }: { gw: string }) {
  return (
    <Section id="troubleshooting" index="06" title="Troubleshooting">
      <dl className="grid border-t border-ink md:grid-cols-2">
        {items(gw).map((it, i) => (
          <div
            key={it.q}
            className={`flex min-w-0 flex-col gap-2 border-b border-rule py-5 ${i % 2 ? "md:border-l md:pl-6" : "md:pr-6"}`}
          >
            <dt className="text-lg font-bold">{it.q}</dt>
            <dd className="break-words leading-relaxed text-body">{it.a}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
