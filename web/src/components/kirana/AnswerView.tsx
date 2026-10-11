// Renders a Kirana Copilot result: a single big number, or a clean table, or a friendly error.

import { fmtCell } from "@/lib/format";
import type { ShopAnswer } from "@/lib/types";

function humanize(col: string): string {
  const s = col.replace(/\(\*\)/g, "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AnswerView({ a }: { a: ShopAnswer }) {
  if (a.error) {
    return (
      <p className="text-sm text-teacher">
        Couldn&apos;t get an answer from the shop database: <span className="font-mono text-xs">{a.error}</span>
      </p>
    );
  }
  if (a.rows.length === 0) {
    return <p className="text-sm text-soft">No matching records.</p>;
  }

  // One cell: show it big.
  if (a.rows.length === 1 && a.columns.length === 1) {
    return (
      <div>
        <p className="label-mono">{humanize(a.columns[0])}</p>
        <p className="mt-1 break-words text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{fmtCell(a.rows[0][0])}</p>
      </div>
    );
  }

  // One row, a few columns: show a headline value with details.
  if (a.rows.length === 1 && a.columns.length <= 3) {
    const [head, ...rest] = a.columns;
    return (
      <div>
        <p className="label-mono">{humanize(head)}</p>
        <p className="mt-1 break-words text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{fmtCell(a.rows[0][0])}</p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {rest.map((c, i) => (
            <div key={c} className="flex gap-1.5">
              <dt className="text-muted">{humanize(c)}</dt>
              <dd className="font-semibold">{fmtCell(a.rows[0][i + 1])}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto border border-rule" tabIndex={0} role="region" aria-label="Answer table">
        <table className="w-full min-w-max border-collapse text-sm tabular-nums">
          <thead>
            <tr className="bg-wash">
              {a.columns.map((c) => (
                <th key={c} scope="col" className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase text-soft">
                  {humanize(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {a.rows.map((r, i) => (
              <tr key={i} className="border-t border-rule">
                {r.map((v, j) => (
                  <td key={j} className={`px-3 py-2.5 ${typeof v === "number" ? "text-right" : ""}`}>
                    {fmtCell(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {a.truncated && <p className="mt-2 font-mono text-xs text-muted">Showing the first {a.rows.length} rows.</p>}
    </div>
  );
}
