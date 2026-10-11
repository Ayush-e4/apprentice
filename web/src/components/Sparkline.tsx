// A tiny line chart of values between 0 and 1 (for example, the running student share).

export default function Sparkline({
  values,
  height = 56,
  label,
}: {
  values: number[];
  height?: number;
  label: string;
}) {
  const w = 300;
  const h = height;
  const pad = 4;
  if (values.length < 2) {
    return (
      <div className="grid place-items-center border border-dashed border-rule-strong font-mono text-xs text-muted" style={{ height }}>
        The line appears as answers come in
      </div>
    );
  }
  const x = (i: number) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(1, v))) * (h - pad * 2);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label={label}>
      <line x1={pad} x2={w - pad} y1={y(0.5)} y2={y(0.5)} stroke="var(--rule-strong)" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
      <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="var(--ink)" vectorEffect="non-scaling-stroke" />
      <path d={line} stroke="var(--local)" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="3.5" fill="var(--local)" />
    </svg>
  );
}
