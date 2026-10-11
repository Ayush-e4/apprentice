# Apprentice web app

A Next.js front end for Apprentice: an overview of how it works, the two demo apps (Kirana Copilot and QuickBite
Support) and a dashboard. It talks to the Python gateway's JSON API; it has no backend of its own.

## Run it

You need Node 20 or newer and a running Apprentice gateway (see the main [README](../README.md)).

```bash
cd web
npm install
npm run dev -- -p 3100
```

Open <http://localhost:3100>.

For a production build: `npm run build`, then `npm start -- -p 3100`.

## Configuration

The browser only calls this app. `next.config.ts` rewrites `/gw/*` and `/support-gw/*` to the gateways on the
server side, so there is no CORS to set up. Copy `.env.example` to `.env.local`, or set the variables in your shell:

| Variable | Default | Used for |
|---|---|---|
| `APPRENTICE_URL` | `http://localhost:8000` | Main gateway: Kirana Copilot, `/api/stats`, `/api/traces`, `/api/evals`, `/api/health` |
| `SUPPORT_URL` | `http://localhost:8001` | Gateway serving the QuickBite support demo (`/api/support/*`), with its own memory |

Both can point at the same gateway. The values are read when the dev server starts (or at build time), so restart
after changing them.

PowerShell example against a gateway on port 8080:

```powershell
$env:APPRENTICE_URL="http://localhost:8080"; $env:SUPPORT_URL="http://localhost:8080"; npm run dev -- -p 3100
```

## Pages

| Page | What it shows |
|---|---|
| `/` | The one-line pitch, an animated student → judge → teacher → memory diagram, the benchmark's headline numbers, live gateway stats (requests, share answered locally, cost, memory size, a strip of who answered each recent request) and links to the two apps. |
| `/kirana` | **Kirana Copilot.** A chat for a shop owner, in English or Hinglish. Example chips come from `/api/shop/examples`. Each answer is a big number or a table, with a badge (blue "Answered locally" with a filled square, or orange "Teacher" with an outlined triangle), judge score, time, cost, remembered examples and a collapsible "Why + SQL". Session totals sit at the top. |
| `/support` | **QuickBite Support** (a fictional food-delivery brand). A customer chat with message bubbles, example chips and the same badge on each answer. "Simulate 30 customers" replays the built-in questions one by one with a live student-share bar and sparkline. "Reset memory" clears this demo's traces and memory. |
| `/dashboard` | Live stats, the benchmark runs from `/api/evals` as a table and an accuracy vs student-share bar chart, live requests from `/api/traces` (polled every 3 s), and health dots per model when the gateway has `/api/health`. |

Every page shows a loading state, and a clear "Gateway not reachable at …" message when the gateway is down. The layout
works down to 375 px wide.

## Design

Design B, "Swiss Instrument": a white ground, black 1 px rules and a 12-column grid, set in Schibsted Grotesk with Geist
Mono for labels (both loaded with `next/font/google`). Electric blue `#1F4BFF` with a filled square means "answered
locally"; burnt orange `#B54708` with an outlined triangle means "teacher", so status never relies on colour alone. The
theme is light only. Colours are CSS variables in `src/app/globals.css`, exposed to Tailwind as `ink`, `muted`, `rule`,
`local`, `teacher` and so on.

Motion uses the [`motion`](https://motion.dev) package, plus four [Magic UI](https://magicui.design) components (MIT)
copied into `src/components/magicui/`: Animated Beam (the "How it works" diagram), Number Ticker (headline results),
Border Beam (the Kirana and QuickBite product windows) and Blur Fade (section reveals). `MotionConfig
reducedMotion="user"` and `useReducedMotion()` turn movement off when the system asks for reduced motion.

## Layout of the code

```
src/app/          pages (one folder per route) and the shared layout
src/components/   UI, split by page: overview/, kirana/, support/, dashboard/, chat/ (shared chat parts), magicui/
src/lib/          types.ts (API shapes), api.ts (fetch client), format.ts, usePoll.ts, utils.ts (cn)
```

No chart or UI kits: charts are HTML and inline SVG, styling is Tailwind CSS, and the only runtime additions are
`motion`, `clsx` and `tailwind-merge` (for the `cn()` helper in `src/lib/utils.ts`). Every file stays under 300 lines, which
is why `package-lock.json` is not committed (it is gitignored; `npm install` creates it locally).

## Checks

```bash
npm run lint
npm run build
```
