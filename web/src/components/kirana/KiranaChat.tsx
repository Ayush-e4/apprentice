"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GATEWAY, errorMessage, getJSON, postJSON } from "@/lib/api";
import { isLocal } from "@/lib/format";
import type { ShopAnswer } from "@/lib/types";
import Appear from "@/components/chat/Appear";
import Composer from "@/components/chat/Composer";
import ExampleChips from "@/components/chat/ExampleChips";
import SessionStats from "@/components/chat/SessionStats";
import { BorderBeam } from "@/components/magicui/border-beam";
import ServedBadge from "@/components/ServedBadge";
import WhyPanel from "@/components/WhyPanel";
import { ErrorBanner, TypingDots, Window } from "@/components/ui";
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
    <div className="flex flex-col gap-6">
      <SessionStats n={session} />

      <Window title="Kirana Copilot" caption="shop data · Mumbai" className="min-h-[460px]">
        <BorderBeam size={100} duration={12} />
        <div className="flex-1 space-y-6 p-4 sm:p-5" aria-live="polite">
          {turns.length === 0 && (
            <div className="flex flex-col items-start gap-2 py-8">
              <span className="label-mono">Empty session</span>
              <p className="text-2xl font-bold tracking-[-0.03em]">Ask about your shop</p>
              <p className="max-w-md text-soft">
                Sales, stores, products, customers. English or Hinglish. You get the answer, not SQL.
              </p>
            </div>
          )}
          {turns.map((t) => (
            <div key={t.id} className="flex flex-col gap-3">
              <Appear from="right" className="ml-auto max-w-[85%]">
                <p className="bg-ink px-4 py-3 leading-relaxed text-paper">{t.question}</p>
              </Appear>
              <Appear delay={0.05} className="border border-rule p-4 sm:p-5">
                {!t.answer && !t.error && <TypingDots />}
                {t.error && <ErrorBanner message={t.error} onRetry={busy ? undefined : () => ask(t.question)} />}
                {t.answer && (
                  <>
                    <AnswerView a={t.answer} />
                    <div className="mt-4 border-t border-rule pt-4">
                      <ServedBadge meta={t.answer} />
                      <WhyPanel reason={t.answer.reason} sql={t.answer.sql} model={t.answer.model} />
                    </div>
                  </>
                )}
              </Appear>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <div className="flex flex-col gap-4 border-t border-ink p-4 sm:p-5">
          <Composer
            onSend={ask}
            busy={busy}
            showLabel
            label="Ask about your shop"
            placeholder="e.g. March 2026 mein sabse zyada orders kis store pe aaye?"
          />
          {examplesError ? (
            <ErrorBanner message={examplesError} />
          ) : (
            <ExampleChips examples={examples} onPick={ask} disabled={busy} />
          )}
        </div>
      </Window>
    </div>
  );
}
