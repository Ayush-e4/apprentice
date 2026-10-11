// Renders a Kirana Copilot result: a single big number, or a clean table, or a friendly error.

import { fmtCell } from "@/lib/format";
import type { ShopAnswer } from "@/lib/types";

function humanize(col: string): string {
  const s = col
    .replace(/\(\*\)/g, "")
    .replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AnswerView({ a }: { a: ShopAnswer }) {
  if (a.error) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-300">
        Couldn&apos;t get an answer from the shop database: <span className="font-mono text-xs">{a.error}</span>
      </p>
    );
  }
  if (a.rows.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No matching records.</p>;
  }

  // One cell: show it big.
  if (a.rows.length === 1 && a.columns.length === 1) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{humanize(a.columns[0])}</p>
        <p className="mt-1 break-words text-4xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          {fmtCell(a.rows[0][0])}
        </p>
      </div>
    );
  }

  // One row, a few columns: show a headline value with details.
  if (a.rows.length === 1 && a.columns.length <= 3) {
    const [head, ...rest] = a.columns;
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{humanize(head)}</p>
        <p className="mt-1 break-words text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          {fmtCell(a.rows[0][0])}
        </p>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {rest.map((c, i) => (
            <div key={c} className="flex gap-1.5">
              <dt className="text-zinc-500 dark:text-zinc-400">{humanize(c)}</dt>
              <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{fmtCell(a.rows[0][i + 1])}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {a.columns.map((c) => (
              <th
                key={c}
                scope="col"
                className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
              >
                {humanize(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {a.rows.map((r, i) => (
            <tr key={i} className="odd:bg-zinc-50/70 dark:odd:bg-zinc-800/40">
              {r.map((v, j) => (
                <td key={j} className={`px-3 py-2 ${typeof v === "number" ? "text-right tabular-nums" : ""} text-zinc-800 dark:text-zinc-200`}>
                  {fmtCell(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {a.truncated && <p className="mt-2 px-1 text-xs text-zinc-500">Showing the first {a.rows.length} rows.</p>}
    </div>
  );
}
