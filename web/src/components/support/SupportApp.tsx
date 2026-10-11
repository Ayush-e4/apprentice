"use client";

import { useEffect, useState } from "react";
import { SUPPORT_GATEWAY, errorMessage, getJSON } from "@/lib/api";
import type { SupportQuestions, SupportStats } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import SessionStats from "@/components/chat/SessionStats";
import RouteStrip from "@/components/RouteStrip";
import { Card, ErrorBanner } from "@/components/ui";
import SimulatePanel from "./SimulatePanel";
import SupportChat from "./SupportChat";

export default function SupportApp() {
  const [questions, setQuestions] = useState<SupportQuestions>({ examples: [], simulation: [] });
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const stats = usePoll(() => getJSON<SupportStats>(SUPPORT_GATEWAY, "/api/support/stats"), 10000);

  useEffect(() => {
    getJSON<SupportQuestions>(SUPPORT_GATEWAY, "/api/support/questions")
      .then(setQuestions)
      .catch((e) => setQuestionsError(errorMessage(e)));
  }, []);

  const t = stats.data?.totals;

  return (
    <div className="space-y-4">
      {stats.error && !stats.data && <ErrorBanner message={stats.error} onRetry={stats.refresh} />}
      <SessionStats
        title="Support desk totals"
        n={{
          requests: t?.requests ?? 0,
          local: t?.by_student ?? 0,
          cost: t?.cost_usd ?? 0,
          avgMs: t?.avg_latency_ms ?? 0,
          memory: stats.data?.memory_size ?? 0,
        }}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SupportChat
          examples={questions.examples}
          examplesError={questionsError}
          onAnswered={stats.refresh}
          locked={simulating}
        />
        <div className="space-y-4">
          <SimulatePanel
            questions={questions.simulation}
            running={simulating}
            setRunning={setSimulating}
            onStep={stats.refresh}
            onReset={stats.refresh}
          />
          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Who answered, request by request</h2>
            <RouteStrip servedBy={(stats.data?.timeline ?? []).map((x) => x.served_by)} max={80} label="Support requests" />
          </Card>
        </div>
      </div>
    </div>
  );
}
