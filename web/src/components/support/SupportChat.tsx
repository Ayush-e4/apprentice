"use client";

import { useEffect, useRef, useState } from "react";
import { SUPPORT_GATEWAY, errorMessage, postJSON } from "@/lib/api";
import type { SupportAnswer } from "@/lib/types";
import Appear from "@/components/chat/Appear";
import Composer from "@/components/chat/Composer";
import ExampleChips from "@/components/chat/ExampleChips";
import { BorderBeam } from "@/components/magicui/border-beam";
import ServedBadge from "@/components/ServedBadge";
import WhyPanel from "@/components/WhyPanel";
import { ErrorBanner, TypingDots, Window } from "@/components/ui";

type Turn = { id: number; question: string; answer?: SupportAnswer; error?: string };

function Online() {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs text-muted">
      <span aria-hidden className="h-2 w-2 bg-ok" /> online
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
    <Window title="QuickBite Help" right={<Online />} className="h-[680px] max-h-[85dvh] min-h-[480px]">
      <BorderBeam size={100} duration={12} colorFrom="#B54708" colorTo="#B54708" />
      <div ref={scroller} className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        <p className="max-w-[90%] border border-rule px-4 py-3 leading-relaxed">
          Hi, I&apos;m the QuickBite assistant. Ask me about orders, refunds, payments or delivery.
        </p>
        {turns.map((t) => (
          <div key={t.id} className="flex flex-col gap-2.5">
            <Appear from="right" className="ml-auto max-w-[85%]">
              <p className="bg-ink px-4 py-3 leading-relaxed text-paper">{t.question}</p>
            </Appear>
            <Appear delay={0.05} className="max-w-[92%]">
              {!t.answer && !t.error && (
                <div className="border border-rule px-4 py-3">
                  <TypingDots />
                </div>
              )}
              {t.error && <ErrorBanner message={t.error} />}
              {t.answer && (
                <div className="flex flex-col gap-2.5">
                  <p className="whitespace-pre-wrap border border-rule px-4 py-3 leading-relaxed">{t.answer.answer}</p>
                  <ServedBadge meta={t.answer} />
                  <WhyPanel reason={t.answer.reason} title="Why" />
                </div>
              )}
            </Appear>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-ink p-4 sm:p-5">
        <Composer onSend={ask} busy={busy || locked} label="Message QuickBite support" placeholder="Type your message…" />
        {examplesError ? (
          <ErrorBanner message={examplesError} />
        ) : (
          <ExampleChips examples={examples.slice(0, 6)} onPick={ask} disabled={busy || locked} label="Common questions" />
        )}
      </div>
    </Window>
  );
}
