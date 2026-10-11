"use client";

import { useEffect, useRef, useState } from "react";
import { SUPPORT_GATEWAY, errorMessage, postJSON } from "@/lib/api";
import type { SupportAnswer } from "@/lib/types";
import Composer from "@/components/chat/Composer";
import ExampleChips from "@/components/chat/ExampleChips";
import ServedBadge from "@/components/ServedBadge";
import WhyPanel from "@/components/WhyPanel";
import { Card, ErrorBanner, TypingDots } from "@/components/ui";

type Turn = { id: number; question: string; answer?: SupportAnswer; error?: string };

function BotAvatar() {
  return (
    <span
      aria-hidden
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-xs font-bold text-white shadow-sm"
    >
      QB
    </span>
  );
}

export default function SupportChat({
  examples,
  examplesError,
  onAnswered,
  locked,
}: {
  examples: string[];
  examplesError: string | null;
  onAnswered: () => void;
  locked: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function ask(question: string) {
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question }]);
    setBusy(true);
    try {
      const answer = await postJSON<SupportAnswer>(SUPPORT_GATEWAY, "/api/support/ask", { question });
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer } : x)));
      onAnswered();
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: errorMessage(e) } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex h-[640px] max-h-[80dvh] min-h-[460px] flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <BotAvatar />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">QuickBite Help</p>
          <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online · usually replies in seconds
          </p>
        </div>
      </div>

      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto bg-zinc-50/60 p-3 sm:p-4 dark:bg-zinc-950/30" aria-live="polite">
        <div className="flex items-end gap-2">
          <BotAvatar />
          <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-zinc-800 shadow-sm dark:bg-zinc-800 dark:text-zinc-100">
            Hi! I&apos;m the QuickBite assistant. Ask me about orders, refunds, payments or delivery.
          </p>
        </div>
        {turns.map((t) => (
          <div key={t.id} className="space-y-3">
            <div className="flex justify-end">
              <p className="rise-in max-w-[85%] rounded-2xl rounded-br-md bg-orange-500 px-4 py-2.5 text-sm text-white shadow-sm">
                {t.question}
              </p>
            </div>
            <div className="rise-in flex items-start gap-2">
              <BotAvatar />
              <div className="min-w-0 max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm dark:bg-zinc-800 dark:text-zinc-100">
                {!t.answer && !t.error && <TypingDots />}
                {t.error && <ErrorBanner message={t.error} />}
                {t.answer && (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">{t.answer.answer}</p>
                    <div className="mt-3 border-t border-zinc-100 pt-2.5 dark:border-zinc-700">
                      <ServedBadge meta={t.answer} />
                      <WhyPanel reason={t.answer.reason} title="Why" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-zinc-200 p-3 sm:p-4 dark:border-zinc-800">
        {examplesError ? (
          <ErrorBanner message={examplesError} />
        ) : (
          <ExampleChips examples={examples.slice(0, 6)} onPick={ask} disabled={busy || locked} label="Common questions" />
        )}
        <Composer onSend={ask} busy={busy || locked} label="Message QuickBite support" placeholder="Type your message…" />
      </div>
    </Card>
  );
}
