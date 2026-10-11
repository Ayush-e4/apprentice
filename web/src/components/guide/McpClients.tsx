// The per-client instructions for step 2 of the MCP section: Claude Code, Claude Desktop, Cursor.
// Every command and config has the gateway URL substituted in.

import CodeBlock from "./CodeBlock";
import { Code } from "./Section";
import Tabs from "./Tabs";

const SOURCE = "git+https://github.com/Ayush-e4/apprentice";

export function claudeCodeCommand(gw: string) {
  return `claude mcp add apprentice -e APPRENTICE_URL=${gw} -- uvx --from ${SOURCE} apprentice-mcp`;
}

export function mcpJson(gw: string) {
  return JSON.stringify(
    {
      mcpServers: {
        apprentice: {
          command: "uvx",
          args: ["--from", SOURCE, "apprentice-mcp"],
          env: { APPRENTICE_URL: gw },
        },
      },
    },
    null,
    2,
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="max-w-2xl text-sm leading-relaxed text-muted">{children}</p>;
}

export default function McpClients({ gw }: { gw: string }) {
  return (
    <Tabs
      label="MCP client"
      tabs={[
        {
          id: "claude-code",
          label: "Claude Code",
          content: (
            <div className="flex flex-col gap-3">
              <p className="text-body">
                Recommended. Run once in any terminal, then type <Code>/mcp</Code> inside Claude Code to check that{" "}
                <Code>apprentice</Code> is connected with five tools.
              </p>
              <CodeBlock label="Terminal" code={claudeCodeCommand(gw)} highlight={gw} />
            </div>
          ),
        },
        {
          id: "claude-desktop",
          label: "Claude Desktop",
          content: (
            <div className="flex flex-col gap-3">
              <ol className="flex max-w-2xl list-decimal flex-col gap-1.5 pl-5 text-body marker:font-mono marker:text-muted">
                <li>Open Settings → Developer → Edit Config.</li>
                <li>
                  Paste this into <Code>claude_desktop_config.json</Code> (merge it into <Code>mcpServers</Code> if you
                  already have one) and save.
                </li>
                <li>Fully quit Claude from the system tray (not just the window), then reopen it.</li>
              </ol>
              <CodeBlock label="claude_desktop_config.json" code={mcpJson(gw)} highlight={gw} />
              <Note>
                Claude Code is the more reliable route: Claude Desktop rewrites its config while it is running and can
                overwrite edits made in the meantime.
              </Note>
            </div>
          ),
        },
        {
          id: "cursor",
          label: "Cursor",
          content: (
            <div className="flex flex-col gap-3">
              <p className="max-w-2xl text-body">
                Add the same entry to <Code>~/.cursor/mcp.json</Code> (all projects) or <Code>.cursor/mcp.json</Code> (one
                project), then enable it under Cursor Settings → MCP.
              </p>
              <CodeBlock label="~/.cursor/mcp.json" code={mcpJson(gw)} highlight={gw} />
            </div>
          ),
        },
      ]}
    />
  );
}
