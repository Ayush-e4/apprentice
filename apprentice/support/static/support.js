// QuickBite support demo: chat, routing badges, live session stats and the customer simulation.
const $ = id => document.getElementById(id);
const pct = x => `${Math.round((x || 0) * 100)}%`;
const usd = x => `$${(x || 0).toFixed(x >= 1 ? 2 : x >= 0.01 || !x ? 4 : 6)}`;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const who = name => (name || "").startsWith("student") ? "student" : "teacher";
let busy = false;

function add(cls, html) {
  const el = document.createElement("div");
  el.className = `msg ${cls}`;
  el.innerHTML = html;
  $("chat").appendChild(el);
  $("chat").scrollTop = $("chat").scrollHeight;
  return el;
}

function meta(a) {
  return `<div class="meta"><span class="badge ${who(a.served_by)}">${esc(a.served_by)}</span>
    <span>${esc(a.reason)}</span><span>· ${Math.round(a.latency_ms)} ms</span><span>· ${usd(a.cost_usd)}</span></div>`;
}

async function ask(question) {
  add("user", `<div class="bubble">${esc(question)}</div>`);
  const pending = add("bot pending", `<div class="bubble">Typing…</div>`);
  try {
    const res = await fetch("/api/support/ask", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    pending.className = "msg bot";
    pending.innerHTML = `<div class="bubble">${esc(data.answer)}</div>${meta(data)}`;
    return data;
  } catch (e) {
    pending.className = "msg bot";
    pending.innerHTML = `<div class="bubble">Sorry, something went wrong.</div>
      <div class="meta"><span class="badge error">error</span><span>${esc(e.message)}</span></div>`;
    return null;
  } finally {
    $("chat").scrollTop = $("chat").scrollHeight;
    refresh();
  }
}

function drawBars(timeline) {
  if (!timeline.length) { $("bars").innerHTML = `<span class="muted">No requests yet.</span>`; return; }
  const shown = timeline.slice(-60);
  const max = Math.max(...shown.map(r => r.cost_usd || 0)) || 1;
  $("bars").innerHTML = shown.map(r => {
    const h = Math.max(4, Math.round(100 * (r.cost_usd || 0) / max));
    return `<i class="${who(r.served_by)}" style="height:${h}%" title="#${r.id} ${esc(r.served_by)} ${usd(r.cost_usd)}"></i>`;
  }).join("");
  const half = Math.floor(timeline.length / 2);
  if (half >= 3) {
    const avg = rows => rows.reduce((s, r) => s + (r.cost_usd || 0), 0) / rows.length;
    $("cost-trend").textContent =
      `avg cost: first half ${usd(avg(timeline.slice(0, half)))}, second half ${usd(avg(timeline.slice(half)))}`;
  } else {
    $("cost-trend").textContent = "";
  }
}

function drawSpark(timeline) {
  const win = 10, values = [];
  for (let i = 0; i < timeline.length; i++) {
    const slice = timeline.slice(Math.max(0, i - win + 1), i + 1);
    values.push(slice.filter(r => who(r.served_by) === "student").length / slice.length);
  }
  if (values.length < 2) { $("spark").innerHTML = ""; return; }
  const pts = values.map((v, i) => `${(300 * i / (values.length - 1)).toFixed(1)},${(58 - 56 * v).toFixed(1)}`);
  $("spark").innerHTML = `<polygon class="area" points="0,60 ${pts.join(" ")} 300,60"></polygon>
    <polyline class="line" points="${pts.join(" ")}"></polyline>`;
}

async function refresh() {
  try {
    const s = await fetch("/api/support/stats").then(r => r.json());
    const t = s.totals;
    $("k-requests").textContent = t.requests;
    $("k-share").textContent = t.requests ? pct(t.by_student / t.requests) : "0%";
    $("k-cost").textContent = usd(t.cost_usd);
    $("k-memory").textContent = s.memory_size;
    drawBars(s.timeline);
    drawSpark(s.timeline);
  } catch (e) {
    console.error(e);
  }
}

function setBusy(on) {
  busy = on;
  for (const id of ["send", "simulate", "reset"]) $(id).disabled = on;
  document.querySelectorAll(".chip").forEach(b => { b.disabled = on; });
}

async function run(question) {
  if (busy || !question) return;
  setBusy(true);
  try { await ask(question); } finally { setBusy(false); }
}

$("ask").addEventListener("submit", ev => {
  ev.preventDefault();
  const q = $("q").value.trim();
  $("q").value = "";
  run(q);
});

$("simulate").addEventListener("click", async () => {
  if (busy) return;
  setBusy(true);
  try {
    const { simulation } = await fetch("/api/support/questions").then(r => r.json());
    let student = 0, cost = 0, done = 0;
    for (const q of simulation) {
      $("sim-status").textContent = `Customer ${done + 1} of ${simulation.length}…`;
      const a = await ask(q);
      done++;
      if (a) { student += who(a.served_by) === "student"; cost += a.cost_usd; }
    }
    $("sim-status").textContent =
      `Done: ${student} of ${done} answered by the student (${pct(student / done)}), cost ${usd(cost)}.`;
  } catch (e) {
    $("sim-status").textContent = `Simulation stopped: ${e.message}`;
  } finally {
    setBusy(false);
  }
});

$("reset").addEventListener("click", async () => {
  if (busy || !confirm("Forget this demo's chats and the answers it learned?")) return;
  await fetch("/api/support/reset", { method: "POST" });
  $("chat").innerHTML = "";
  $("sim-status").textContent = "";
  add("bot", `<div class="bubble">Memory cleared. The next question of each kind goes to the teacher again.</div>`);
  refresh();
});

fetch("/api/support/questions").then(r => r.json()).then(({ examples }) => {
  $("examples").innerHTML = examples.map(q => `<button type="button" class="chip">${esc(q)}</button>`).join("");
  $("examples").querySelectorAll(".chip").forEach((b, i) => b.addEventListener("click", () => run(examples[i])));
});

refresh();
