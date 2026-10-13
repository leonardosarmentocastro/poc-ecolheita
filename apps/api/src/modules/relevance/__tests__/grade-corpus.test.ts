import { describe, expect, it } from "vitest";
import {
  AGREEMENT_FLOOR,
  gradeCorpus,
  LATENCY_BUDGET_MS,
  STABILITY_FLOOR,
  type Answers,
  type CorpusEvalRow,
} from "@/modules/relevance/grade-corpus";
import type { Tier } from "@/modules/relevance/types";
import type { CorpusTerm } from "@/modules/products/fixtures/marketplace-corpus";

const row = (term: CorpusTerm, label: Tier, got: Answers, i: number): CorpusEvalRow => ({
  term,
  name: `${term} ${label} ${i}`,
  label,
  got,
});
/** n hold-out rows that are right in every run, m that are wrong in every run. */
const holdout = (right: number, wrong: number): CorpusEvalRow[] => [
  ...Array.from({ length: right }, (_, i) => row("uva", "match", ["match", "match", "match"], i)),
  ...Array.from({ length: wrong }, (_, i) =>
    row("papel higiênico", "match", ["related", "related", "related"], i),
  ),
];
const tuning = (): CorpusEvalRow[] => [row("banana", "match", ["match", "match", "match"], 0)];

describe("gradeCorpus", () => {
  it("passes at exactly 80% agreement in every run and 80% stability", () => {
    const g = gradeCorpus([...tuning(), ...holdout(40, 10)], [400]);
    expect(g.holdout.agreement).toEqual([0.8, 0.8, 0.8]);
    expect(g.holdout.stability).toBe(1);
    expect(g.verdict).toBe("PASS");
  });

  it("fails at 39 of 50 (78%) in one run, even when the other two runs pass", () => {
    const rows = [...tuning(), ...holdout(40, 10)];
    rows[1] = { ...rows[1], got: ["related", "match", "match"] }; // run 1 drops to 39/50
    const g = gradeCorpus(rows, [400]);
    expect(g.holdout.agreement[0]).toBeCloseTo(0.78, 5);
    expect(g.verdict).toBe("FAIL");
    expect(g.latencyOnly).toBe(false);
  });

  it("fails on stability below 80% even when every run agrees at 80% or more", () => {
    // 50 rows, all labels match: each run has 45 right, but the wrong rows rotate, so
    // 15 rows flip somewhere → stability 35/50 = 70%.
    const rows: CorpusEvalRow[] = Array.from({ length: 50 }, (_, i) => {
      const got: Answers =
        i < 5
          ? ["related", "match", "match"]
          : i < 10
            ? ["match", "related", "match"]
            : i < 15
              ? ["match", "match", "related"]
              : ["match", "match", "match"];
      return row("uva", "match", got, i);
    });
    const g = gradeCorpus(rows, [400]);
    expect(g.holdout.agreement).toEqual([0.9, 0.9, 0.9]);
    expect(g.holdout.stability).toBe(0.7);
    expect(g.verdict).toBe("FAIL");
  });

  it("passes at exactly 80% stability (40 of 50 rows stable) and fails at 78% (39 of 50)", () => {
    // Every run still agrees at ≥ 80%: the flips are spread across runs.
    const build = (flips: number): CorpusEvalRow[] =>
      Array.from({ length: 50 }, (_, i) => {
        const got: Answers =
          i < flips
            ? i % 3 === 0
              ? ["related", "match", "match"]
              : i % 3 === 1
                ? ["match", "related", "match"]
                : ["match", "match", "related"]
            : ["match", "match", "match"];
        return row("uva", "match", got, i);
      });
    const ten = gradeCorpus(build(10), [400]);
    expect(ten.holdout.stability).toBe(0.8);
    expect(ten.holdout.agreement.every((a) => a >= 0.8)).toBe(true);
    expect(ten.verdict).toBe("PASS");
    const eleven = gradeCorpus(build(11), [400]);
    expect(eleven.holdout.stability).toBeCloseTo(0.78, 5);
    expect(eleven.verdict).toBe("FAIL");
  });

  it("a tuning group below 80% does not fail the gate", () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) =>
        row("banana", "match", ["related", "related", "related"], i),
      ),
      ...holdout(50, 0),
    ];
    const g = gradeCorpus(rows, [400]);
    expect(g.tuning.agreement).toEqual([0, 0, 0]);
    expect(g.verdict).toBe("PASS");
  });

  it("a failed call makes the result INVALID, not FAIL, and grades the runs that answered", () => {
    const rows = holdout(50, 0);
    rows[0] = { ...rows[0], got: ["match", "match", null] };
    const g = gradeCorpus(rows, [400]);
    expect(g.verdict).toBe("INVALID");
    expect(g.holdout.agreement[0]).toBe(1);
    // A null answer counts as wrong in that run's pooled number; the row table shows "—".
    // Under INVALID the numbers are informative only, never a verdict.
    expect(g.holdout.agreement[2]).toBeCloseTo(49 / 50, 5);
  });

  it("a slow call alone fails, and says so", () => {
    const g = gradeCorpus(holdout(50, 0), [400, LATENCY_BUDGET_MS + 1]);
    expect(g.verdict).toBe("FAIL");
    expect(g.latencyOnly).toBe(true);
    expect(g.worstMs).toBe(LATENCY_BUDGET_MS + 1);
  });

  it("latency at exactly the budget passes", () => {
    expect(gradeCorpus(holdout(50, 0), [LATENCY_BUDGET_MS]).verdict).toBe("PASS");
  });

  it("reports per-class rows and agreement for the classes present", () => {
    const rows = [
      ...holdout(4, 0), // 4 match rows, all right
      row("uva", "related", ["related", "unrelated", "related"], 0),
      row("uva", "unrelated", ["unrelated", "unrelated", "unrelated"], 0),
    ];
    const g = gradeCorpus(rows, [100]);
    expect(g.holdout.byClass.match).toEqual({ rows: 4, agreement: [1, 1, 1] });
    expect(g.holdout.byClass.related).toEqual({ rows: 1, agreement: [1, 0, 1] });
    expect(g.holdout.byClass.unrelated).toEqual({ rows: 1, agreement: [1, 1, 1] });
    expect(g.tuning.byClass.match).toEqual({ rows: 0, agreement: [0, 0, 0] });
  });

  it("pins the gate constants", () => {
    expect(AGREEMENT_FLOOR).toBe(0.8);
    expect(STABILITY_FLOOR).toBe(0.8);
    expect(LATENCY_BUDGET_MS).toBe(1500);
  });
});
