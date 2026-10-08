import type { Tier } from "@/modules/relevance/types";

export type EvalRow = { name: string; expected: Tier; got: Tier };

/** tiers:eval's gates (spec § Testing): every tier agrees, worst latency within budget. */
export const gradeTiers = (rows: EvalRow[], latenciesMs: number[], budgetMs = 1500) => {
  const agree = rows.filter((r) => r.expected === r.got).length;
  const worstMs = Math.max(0, ...latenciesMs);
  return { agree, total: rows.length, worstMs, pass: agree === rows.length && worstMs <= budgetMs };
};
