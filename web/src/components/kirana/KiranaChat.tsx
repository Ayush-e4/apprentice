"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GATEWAY, errorMessage, getJSON, postJSON } from "@/lib/api";
import { isLocal } from "@/lib/format";
import type { ShopAnswer } from "@/lib/types";
import Composer from "@/components/chat/Composer";
import ExampleChips from "@/components/chat/ExampleChips";
import SessionStats from "@/components/chat/SessionStats";
import ServedBadge from "@/components/ServedBadge";
import WhyPanel from "@/components/WhyPanel";
import { Card, ErrorBanner, TypingDots } from "@/components/ui";
import AnswerView from "./AnswerView";

type Turn = { id: number; question: string; answer?: ShopAnswer; error?: string };

export default function KiranaChat() {
  const [examples, setExamples] = useState<string[]>([]);
  const [examplesError, setExamplesError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getJSON<{ examples: string[] }>(GATEWAY, "/api/shop/examples")
      .then((r) => setExamples(r.examples))
      .catch((e) => setExamplesError(errorMessage(e)));
  }, []);

  useEffect(() => {
    if (turns.length) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function ask(question: string) {
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question }]);
    setBusy(true);
    try {
      const answer = await postJSON<ShopAnswer>(GATEWAY, "/api/shop/ask", { question, mode: "cascade", judge: "decision" });
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer } : x)));
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: errorMessage(e) } : x)));
    } finally {
      setBusy(false);
    }
  }

  const session = useMemo(() => {
    const done = turns.flatMap((t) => (t.answer ? [t.answer] : []));
    return {
      requests: done.length,
      local: done.filter((a) => isLocal(a.served_by)).length,
      cost: done.reduce((s, a) => s + (a.cost_usd || 0), 0),
      avgMs: done.length ? done.reduce((s, a) => s + a.latency_ms, 0) / done.length : 0,
    };
  }, [turns]);

  return (
    <div className="flex flex-col gap-4">
      <SessionStats n={session} />

      <Card className="flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-5 p-3 sm:p-5" aria-live="polite">
          {turns.length === 0 && (
            <div className="grid place-items-center py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-2xl dark:bg-emerald-900/40" aria-hidden>
                🛒
              </div>
              <p className="mt-3 font-semibold text-zinc-900 dark:text-zinc-100">Ask about your shop</p>
              <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Sales, stores, products, customers. English or Hinglish. You get the answer, not SQL.
              </p>
            </div>
          )}
          {turns.map((t) => (
            <div key={t.id} className="space-y-3">
              <div className="flex justify-end">
                <p className="rise-in max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm text-white shadow-sm">
                  {t.question}
                </p>
              </div>
              <div className="rise-in rounded-2xl rounded-bl-md border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
                {!t.answer && !t.error && <TypingDots />}
                {t.error && <ErrorBanner message={t.error} onRetry={busy ? undefined : () => ask(t.question)} />}
                {t.answer && (
                  <>
                    <AnswerView a={t.answer} />
                    <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <ServedBadge meta={t.answer} />
                      <WhyPanel reason={t.answer.reason} sql={t.answer.sql} model={t.answer.model} />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <div className="space-y-3 border-t border-zinc-200 p-3 sm:p-4 dark:border-zinc-800">
          {examplesError ? (
            <ErrorBanner message={examplesError} />
          ) : (
            <ExampleChips examples={examples} onPick={ask} disabled={busy} />
          )}
          <Composer
            onSend={ask}
            busy={busy}
            label="Ask a question about your shop"
            placeholder="e.g. March 2026 mein sabse zyada orders kis store pe aaye?"
          />
        </div>
      </Card>
    </div>
  );
}
