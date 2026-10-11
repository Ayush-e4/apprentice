"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SUPPORT_GATEWAY, errorMessage, postJSON } from "@/lib/api";
import { fmtCost, fmtPct, isLocal } from "@/lib/format";
import type { SupportAnswer } from "@/lib/types";
import { ServedPill } from "@/components/ServedBadge";
import ShareMeter from "@/components/ShareMeter";
import Sparkline from "@/components/Sparkline";
import { Card, ErrorBanner } from "@/components/ui";

const CUSTOMERS = 30;

type Step = { question: string; servedBy: string };

// Replays the built-in customer questions one at a time so the share meter moves live.
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
  const runningShare = steps.map((_, i) => steps.slice(0, i + 1).filter((s) => isLocal(s.servedBy)).length / (i + 1));

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

  const share = steps.length ? local / steps.length : null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-ink px-4 py-3.5 sm:px-5">
        <h2 className="text-base font-bold">Rush hour</h2>
        <span className="font-mono text-xs text-muted">
          {steps.length}/{batch.length || CUSTOMERS} customers
        </span>
      </div>
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <p className="leading-relaxed text-soft">
          {CUSTOMERS} customers ask the usual questions in different words. Early ones go to the teacher; as memory fills,
          the student answers on its own.
        </p>

        <div className="flex flex-wrap gap-2">
          {running ? (
            <button type="button" className="btn btn-outline" onClick={() => (stop.current = true)}>
              <span aria-hidden className="h-2.5 w-2.5 bg-ink" /> Stop
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

        {error && <ErrorBanner message={error} />}

        <ShareMeter share={share} title="Student share · this run" />
        <p className="-mt-3 font-mono text-xs text-muted">
          {fmtPct(share)} local · cost {fmtCost(cost)}
        </p>

        <div>
          <p className="label-mono mb-2">Running student share</p>
          <Sparkline values={runningShare} label={`Running student share, now ${fmtPct(share)}`} />
        </div>

        {steps.length > 0 && (
          <ul className="flex flex-col border-t border-rule" aria-label="Latest simulated customers">
            <AnimatePresence initial={false}>
              {steps
                .slice(-5)
                .reverse()
                .map((s, i) => (
                  <motion.li
                    key={steps.length - i}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="flex items-center justify-between gap-3 border-b border-rule py-2 text-[0.8125rem]"
                  >
                    <span className="truncate text-soft">{s.question}</span>
                    <ServedPill servedBy={s.servedBy} size="sm" />
                  </motion.li>
                ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </Card>
  );
}
