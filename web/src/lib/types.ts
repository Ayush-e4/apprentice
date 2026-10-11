// Shapes returned by the Apprentice gateway (see apprentice/gateway.py, shop.py, support/router.py).

export type Totals = {
  requests: number;
  by_student: number;
  cost_usd: number;
  avg_latency_ms: number;
};

export type TimelinePoint = {
  id: number;
  served_by: string;
  latency_ms?: number;
  cost_usd: number;
};

export type Endpoint = { name: string; model: string; base_url: string };

export type Stats = {
  totals: Totals;
  memory_size: number;
  timeline: TimelinePoint[];
  config?: {
    student: Endpoint[];
    teacher: Endpoint[];
    embed: string | null;
    judge: string | null;
    llm_judge: string | null;
  };
};

export type Trace = {
  id: number;
  ts: number;
  mode: string;
  served_by: string;
  model: string;
  escalated: number;
  reason: string | null;
  question: string | null;
  response: string | null;
  cost_usd: number | null;
  latency_ms: number | null;
  memory_hits: number | null;
  top_sim: number | null;
  tag: string | null;
  check_score: number | null;
};

export type EvalRun = {
  id: number;
  ts: number;
  phase: string;
  mode: string;
  n: number | null;
  correct: number | null;
  accuracy: number | null;
  student_share: number | null;
  cost_usd: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  memory_size: number | null;
};

export type ShopAnswer = {
  question: string;
  sql: string | null;
  columns: string[];
  rows: (string | number | null)[][];
  truncated: boolean;
  error: string | null;
  served_by: string;
  model: string;
  escalated: boolean;
  reason: string | null;
  judge_score: number | null;
  memory_hits: number;
  cost_usd: number;
  latency_ms: number;
  trace_id: number;
};

export type SupportAnswer = {
  question: string;
  answer: string;
  served_by: string;
  escalated: boolean;
  reason: string | null;
  cost_usd: number;
  latency_ms: number;
  memory_hits: number;
  top_sim: number;
  trace_id: number;
};

export type SupportQuestions = { examples: string[]; simulation: string[] };

export type SupportStats = {
  totals: Totals;
  memory_size: number;
  timeline: TimelinePoint[];
};

export type HealthCheck = { ok: boolean; model?: string | null; detail?: string | null; latency_ms?: number | null };
export type Health = { ok: boolean; checks: Record<string, HealthCheck> };

/** The fields every answer badge needs, shared by Kirana and QuickBite answers. */
export type AnswerMeta = {
  served_by: string;
  reason: string | null;
  cost_usd: number;
  latency_ms: number;
  memory_hits: number;
  judge_score?: number | null;
  top_sim?: number | null;
  model?: string;
};
