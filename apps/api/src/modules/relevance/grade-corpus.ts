import type { Tier } from "@/modules/relevance/types";
import { HOLDOUT_TERMS, type CorpusTerm } from "@/modules/products/fixtures/marketplace-corpus";

/** The gate (spec § The gate). Constants, not flags: changing the bar is a design change. */
export const RUNS = 3;
export const AGREEMENT_FLOOR = 0.8;
export const STABILITY_FLOOR = 0.8;
export const LATENCY_BUDGET_MS = 1500;

/** One tier per run; `null` when that run's Jev call failed for the row's term. */
export type Answers = [Tier | null, Tier | null, Tier | null];

export interface CorpusEvalRow {
  term: CorpusTerm;
  name: string;
  label: Tier;
  got: Answers;
}

export interface ClassSummary {
  rows: number;
  agreement: [number, number, number];
}

export interface GroupSummary {
  rows: number;
  /** Fraction of rows whose tier equals the label, per run. */
  agreement: [number, number, number];
  /** Fraction of rows with the same tier in all runs. */
  stability: number;
  byClass: Record<Tier, ClassSummary>;
}

export type Verdict = "PASS" | "FAIL" | "INVALID";

export interface CorpusGrade {
  verdict: Verdict;
  /** FAIL only because of latency: both floors met on the hold-out (spec § A slow call). */
  latencyOnly: boolean;
  worstMs: number;
  tuning: GroupSummary;
  holdout: GroupSummary;
}

const TIERS: readonly Tier[] = ["match", "related", "unrelated"];
const ratio = (n: number, d: number) => (d === 0 ? 0 : n / d);

const agreementOf = (rows: CorpusEvalRow[]): [number, number, number] =>
  [0, 1, 2].map((run) => ratio(rows.filter((r) => r.got[run] === r.label).length, rows.length)) as [
    number,
    number,
    number,
  ];

const summarise = (rows: CorpusEvalRow[]): GroupSummary => ({
  rows: rows.length,
  agreement: agreementOf(rows),
  stability: ratio(
    rows.filter((r) => r.got[0] !== null && r.got.every((t) => t === r.got[0])).length,
    rows.length,
  ),
  byClass: Object.fromEntries(
    TIERS.map((tier) => {
      const ofClass = rows.filter((r) => r.label === tier);
      return [tier, { rows: ofClass.length, agreement: agreementOf(ofClass) }];
    }),
  ) as Record<Tier, ClassSummary>,
});

/** Grades three runs over the corpus; the verdict is decided on the hold-out terms only. */
export const gradeCorpus = (rows: CorpusEvalRow[], latenciesMs: number[]): CorpusGrade => {
  const isHoldout = (r: CorpusEvalRow) => HOLDOUT_TERMS.includes(r.term);
  const holdout = summarise(rows.filter(isHoldout));
  const tuning = summarise(rows.filter((r) => !isHoldout(r)));
  const worstMs = Math.max(0, ...latenciesMs);
  const anyFailed = rows.some((r) => r.got.some((t) => t === null));
  const floorsMet =
    holdout.agreement.every((a) => a >= AGREEMENT_FLOOR) && holdout.stability >= STABILITY_FLOOR;
  const withinBudget = worstMs <= LATENCY_BUDGET_MS;
  const verdict: Verdict = anyFailed ? "INVALID" : floorsMet && withinBudget ? "PASS" : "FAIL";
  return {
    verdict,
    latencyOnly: verdict === "FAIL" && floorsMet && !withinBudget,
    worstMs,
    tuning,
    holdout,
  };
};
