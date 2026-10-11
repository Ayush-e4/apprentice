# Using Apprentice from MCP clients

Apprentice ships a small [Model Context Protocol](https://modelcontextprotocol.io) server, so Claude Code, Cursor, Claude Desktop and any other MCP client can send questions through the student/teacher cascade and read the gateway's numbers without leaving the editor.

```
MCP client (Claude Code, Cursor, ...)
    │  stdio
    ▼
python -m apprentice.mcp_server  ──HTTP──►  Apprentice gateway (uvicorn apprentice.gateway:app)
                                                 ├─► student (small open model)
                                                 └─► teacher (large open model)
```

The MCP server is a thin HTTP client. It does not import the engine or load model settings: everything goes through the gateway's HTTP API, so the gateway can run on another machine and the MCP server stays light. It never resets data (`/api/reset` is not exposed).

## Install

The `mcp` package is in `requirements.txt`, so the normal install covers it:

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # macOS/Linux: .venv/bin/pip
```

The server uses the MCP Python SDK 2.x (`mcp>=2.3`, where `FastMCP` is called `MCPServer`).

## Run

1. Start the gateway as usual (see the README):

   ```bash
   uvicorn apprentice.gateway:app --port 8000
   ```

2. Register the MCP server with your client (below). The client starts it on demand; to check it by hand, run it from the repo root:

   ```bash
   python -m apprentice.mcp_server
   ```

   It speaks MCP over stdio, so it waits silently for a client. Press Ctrl+C to stop.

| Environment variable | Default | Meaning |
|---|---|---|
| `APPRENTICE_URL` | `http://localhost:8000` | Where the gateway runs |
| `APPRENTICE_TIMEOUT_S` | `300` | Per-request timeout; teacher calls can be slow |

`python -m apprentice.mcp_server` needs the repo on Python's import path. Run it from the repo root, or set `PYTHONPATH` to the repo root as the configs below do, since MCP clients don't always start servers in the project folder.

## Claude Code

From the repo root, with the virtual environment active:

```bash
claude mcp add apprentice -- python -m apprentice.mcp_server
```

From anywhere, with explicit paths and gateway URL (macOS/Linux):

```bash
claude mcp add --env APPRENTICE_URL=http://localhost:8000 --env PYTHONPATH=/path/to/apprentice \
  apprentice -- /path/to/apprentice/.venv/bin/python -m apprentice.mcp_server
```

Or check a project-scoped `.mcp.json` into your own project (Claude Desktop's `claude_desktop_config.json` uses the same `mcpServers` shape):

```json
{
  "mcpServers": {
    "apprentice": {
      "command": "/path/to/apprentice/.venv/bin/python",
      "args": ["-m", "apprentice.mcp_server"],
      "env": {
        "APPRENTICE_URL": "http://localhost:8000",
        "PYTHONPATH": "/path/to/apprentice"
      }
    }
  }
}
```

On Windows, use the venv's `python.exe` and escaped backslashes:

```json
{
  "mcpServers": {
    "apprentice": {
      "command": "C:\\path\\to\\apprentice\\.venv\\Scripts\\python.exe",
      "args": ["-m", "apprentice.mcp_server"],
      "env": {
        "APPRENTICE_URL": "http://localhost:8000",
        "PYTHONPATH": "C:\\path\\to\\apprentice"
      }
    }
  }
}
```

Run `/mcp` inside Claude Code to confirm `apprentice` is connected and lists five tools.

## Cursor

Add the server to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "apprentice": {
      "command": "/path/to/apprentice/.venv/bin/python",
      "args": ["-m", "apprentice.mcp_server"],
      "env": {
        "APPRENTICE_URL": "http://localhost:8000",
        "PYTHONPATH": "/path/to/apprentice"
      }
    }
  }
}
```

Then enable it under Cursor Settings → MCP. Other MCP clients (Windsurf, Zed, Continue, VS Code) take the same command, arguments and environment.

## Tools

| Tool | Arguments | What it does |
|---|---|---|
| `ask` | `question`, `mode` = `cascade` \| `student` \| `teacher`, `system`, `verifier` = `sql`, `judge` = `decision` \| `llm` | Sends a chat completion through the gateway. Returns the answer plus who served it, why, cost, latency and memory use. |
| `ask_shop_sql` | `question`, `mode`, `judge` | Text-to-SQL on the benchmark grocery database, with the benchmark's system prompt and the `sql` verifier. Returns the SQLite query and routing info. The MCP server never runs the SQL. |
| `stats` | none | Request totals, the share served by the student, total cost, average latency, memory size and the configured models. |
| `recent_requests` | `limit` (1 to 100, default 10) | The newest traces: route, reason, cost, latency, question and answer, truncated. |
| `benchmark_results` | none | Runs recorded by `python -m bench.run_eval`: accuracy, student share, cost and latency per phase. |

`ask` and `ask_shop_sql` write a trace and may add a teacher answer to memory, just like any other gateway request. Their traces are tagged `mcp`, so they're easy to pick out in the dashboard. The other three tools are read-only.

### Examples

Prompts you can type in the client, and what comes back. The output is illustrative: model names, numbers and answers depend on your setup.

> Use apprentice to ask "What is the capital of France?"

```
[the teacher's answer]

---
served_by: teacher (glm-5.1)
escalated: yes
reason: no similar memory (best sim 0.00)
cost_usd: 0.000160
latency_ms: 2140
memory_examples: 0 (best similarity 0.00)
trace_id: 10
```

Ask the same thing again, and the student answers from memory: `served_by: student`, `reason: student passed: similar memory found (sim 1.00)`.

> Use ask_shop_sql: what was the total revenue of the Dadar TT store in March 2026?

````
```sql
SELECT SUM(oi.quantity * oi.unit_price) FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN stores s ON s.id = o.store_id WHERE s.name = 'Dadar TT' AND strftime('%m', o.order_date) = '03'
```

---
served_by: teacher (glm-5.1)
escalated: yes
reason: escalated: sql check: SQL error: no such column: revenue
...
````

Here the student's query failed the `sql` verifier, so the teacher answered; the teacher's query is what you get back.

Add `judge: "llm"` (or `"decision"` with a Von/Kev server configured) to have student answers that pass the verifier checked for correctness as well.

> Show Apprentice stats

```
gateway: http://localhost:8000
requests: 16 (student 8, teacher 8; student share 50.0%)
total_cost_usd: 0.001545
avg_latency_ms: 11
memory_size: 4 remembered teacher answers
student: qwen3:1.7b @ http://localhost:11434/v1
teacher: glm-5.1 @ https://...
embed: not configured
judge: not configured
llm_judge: glm-5.1
```

> Show the last 4 Apprentice requests

```
#15 2026-10-11 13:28:05 cascade -> teacher (glm-5.1) $0.000327 20 ms judge 0.00 [mcp]
  why: escalated: sql check: 1 row(s); judge 0.00
  Q: How many orders at Dadar TT?
  A: ```sql SELECT COUNT(*) FROM orders o JOIN stores s ON s.id = o.store_id WHERE s.name = 'Dadar TT'; ```
```

> Show Apprentice benchmark results

```
 id  phase     mode                n accuracy  student   cost_usd  p50_ms  p95_ms memory
  1  baseline  student            80    45.0%   100.0%     0.0000     512     930      0
  2  baseline  teacher            80    81.3%     0.0%     0.0410    2100    4800      0
```

## Troubleshooting

**"Apprentice gateway is not reachable at http://localhost:8000"**
The gateway isn't running, or runs elsewhere. Start it with `uvicorn apprentice.gateway:app --port 8000`, or set `APPRENTICE_URL` in the client config to its address (for example `http://localhost:8040`).

**"... not found. Is APPRENTICE_URL an Apprentice gateway?" or "answered like a plain OpenAI server"**
`APPRENTICE_URL` points at something else, often the model server (Ollama on port 11434) instead of the gateway. Use the gateway's root URL, without `/v1`.

**"Gateway returned HTTP 502 ... ConnectError"**
The gateway is up, but the student or teacher model behind it isn't reachable. Check the endpoints in `.env`, or call `stats` to see what's configured.

**"No module named apprentice"**
The client started the server outside the repo. Set `PYTHONPATH` to the repo root in the client config, as shown above.

**"No module named mcp" or "No module named 'mcp.server.mcpserver'"**
`command` points at a Python without the requirements, or at an environment with the older `mcp` 1.x. Point `command` at the venv's Python and run `pip install -r requirements.txt` there.

**Tool calls time out**
Teacher calls on large models can take a while. Raise `APPRENTICE_TIMEOUT_S`, and your client's own tool timeout if it has one (Claude Code reads `MCP_TOOL_TIMEOUT`, in milliseconds).

**Nothing happens when I run it in a terminal**
That's expected: a stdio MCP server waits for a client on stdin. Logs go to stderr; stdout carries the protocol.
