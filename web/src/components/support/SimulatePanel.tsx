"use client";

import { useRef, useState } from "react";
import { SUPPORT_GATEWAY, errorMessage, postJSON } from "@/lib/api";
import { fmtCost, fmtPct, isLocal } from "@/lib/format";
import type { SupportAnswer } from "@/lib/types";
import { ServedPill } from "@/components/ServedBadge";
import Sparkline from "@/components/Sparkline";
import { Card, ErrorBanner } from "@/components/ui";

const CUSTOMERS = 30;

type Step = { question: string; servedBy: string };

// Replays the built-in customer questions one at a time so the share bar moves live.
export default function SimulatePanel({
  questions,
  running,
  setRunning,
  onStep,
  onReset,
}: {
  questions: string[];
  running: boolean;
  setRunning: (r: boolean) => void;
  onStep: () => void;
  onReset: () => void;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const stop = useRef(false);

  const batch = questions.slice(0, CUSTOMERS);
  const local = steps.filter((s) => isLocal(s.servedBy)).length;
  const running_share = steps.map((_, i) => steps.slice(0, i + 1).filter((s) => isLocal(s.servedBy)).length / (i + 1));

  async function run() {
    setSteps([]);
    setCost(0);
    setError(null);
    stop.current = false;
    setRunning(true);
    for (const question of batch) {
      if (stop.current) break;
      try {
        const a = await postJSON<SupportAnswer>(SUPPORT_GATEWAY, "/api/support/ask", { question });
        setSteps((s) => [...s, { question, servedBy: a.served_by }]);
        setCost((c) => c + (a.cost_usd || 0));
        onStep();
      } catch (e) {
        setError(errorMessage(e));
        break;
      }
    }
    setRunning(false);
  }

  async function reset() {
    if (!window.confirm("Forget the support demo's history and memory? The student starts from scratch.")) return;
    setResetting(true);
    try {
      await postJSON(SUPPORT_GATEWAY, "/api/support/reset");
      setSteps([]);
      setCost(0);
      setError(null);
      onReset();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setResetting(false);
    }
  }

  const share = steps.length ? local / steps.length : 0;

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Rush hour</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {CUSTOMERS} customers ask the usual questions in different words. Early ones go to the teacher; as memory fills,
        the student answers on its own.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {running ? (
          <button type="button" className="btn border border-zinc-300 text-zinc-800 dark:border-zinc-700 dark:text-zinc-100" onClick={() => (stop.current = true)}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={run} disabled={batch.length === 0 || resetting}>
            Simulate {CUSTOMERS} customers
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={reset} disabled={running || resetting}>
          {resetting ? "Resetting…" : "Reset memory"}
        </button>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Answered locally</span>
          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
            {steps.length}/{batch.length || CUSTOMERS} customers
          </span>
        </div>
        <div
          className="mt-2 flex h-3 overflow-hidden rounded-full bg-violet-200 dark:bg-violet-900/50"
          role="progressbar"
          aria-label="Share answered locally"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
        >
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-xs">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtPct(steps.length ? share : null)} student</span>
          <span className="text-zinc-500 dark:text-zinc-400">cost {fmtCost(cost)}</span>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Running student share</p>
        <Sparkline values={running_share} label={`Running student share, now ${fmtPct(share)}`} />
      </div>

      {steps.length > 0 && (
        <ul className="mt-4 space-y-1.5" aria-label="Latest simulated customers">
          {steps
            .slice(-5)
            .reverse()
            .map((s, i) => (
              <li key={`${steps.length - i}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-zinc-600 dark:text-zinc-400">{s.question}</span>
                <ServedPill servedBy={s.servedBy} size="sm" />
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}
