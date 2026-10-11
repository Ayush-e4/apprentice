// Shows a green/red dot per dependency in any element with id="health".
(function () {
  const el = document.getElementById("health");
  if (!el) return;
  const labels = { student: "student", teacher: "teacher", judge: "judge", embed: "memory search", database: "data" };
  async function refresh() {
    try {
      const h = await (await fetch("/api/health")).json();
      el.innerHTML = Object.entries(h.checks)
        .filter(([name]) => !name.endsWith("-fallback") || !h.checks[name.replace("-fallback", "")].ok)
        .map(([name, c]) => {
          const color = c.ok ? "#1f9d6b" : "#d6336c";
          const tip = `${c.model || name}: ${c.detail}${c.latency_ms != null ? ` (${c.latency_ms} ms)` : ""}`;
          const label = labels[name.replace("-fallback", "")] || name;
          return `<span title="${tip.replace(/"/g, "&quot;")}" style="white-space:nowrap;margin-right:10px">`
               + `<span style="color:${color}">●</span> ${label}${name.endsWith("-fallback") ? " (fallback)" : ""}</span>`;
        }).join("");
    } catch (e) {
      el.innerHTML = `<span style="color:#d6336c">● gateway unreachable</span>`;
    }
  }
  refresh();
  setInterval(refresh, 15000);
})();
