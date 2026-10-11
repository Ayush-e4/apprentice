// Display helpers shared by every page.

export function isLocal(servedBy: string | null | undefined): boolean {
  return !!servedBy && servedBy.toLowerCase().startsWith("student");
}

export function fmtCost(usd: number | null | undefined): string {
  const v = usd ?? 0;
  if (v === 0) return "$0";
  if (v < 0.0001) return "<$0.0001";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(v < 1 ? 3 : 2)}`;
}

export function fmtMs(ms: number | null | undefined): string {
  const v = ms ?? 0;
  if (v >= 1000) return `${(v / 1000).toFixed(1)} s`;
  return `${Math.round(v)} ms`;
}

export function fmtPct(ratio: number | null | undefined, digits = 0): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "–";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return new Intl.NumberFormat("en-IN").format(n);
}

export function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return "–";
  if (typeof v === "number") {
    return Number.isInteger(v) ? fmtNum(v) : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(v);
  }
  return String(v);
}

export function fmtTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function share(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}
