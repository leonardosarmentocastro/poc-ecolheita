import {
  HOLDOUT_TERMS,
  TUNING_TERMS,
  type CorpusTerm,
} from "@/modules/products/fixtures/marketplace-corpus";
import {
  LATENCY_BUDGET_MS,
  type CorpusEvalRow,
  type CorpusGrade,
  type GroupSummary,
} from "@/modules/relevance/grade-corpus";
import type { Tier } from "@/modules/relevance/types";

const cell = (t: Tier | null) => t ?? "—";

const rowTable = (term: CorpusTerm, rows: CorpusEvalRow[]): string =>
  [
    `### ${term} (${rows.length} rows)`,
    "| product | label | run 1 | run 2 | run 3 | stable |",
    "|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.name} | ${r.label} | ${cell(r.got[0])} | ${cell(r.got[1])} | ${cell(r.got[2])} | ${
          r.got[0] !== null && r.got.every((t) => t === r.got[0]) ? "yes" : "no"
        } |`,
    ),
    "",
  ].join("\n");

/** "152/185 (82.2%)": the count is exact, the percent is one decimal; never whole percents here. */
const count = (f: number, rows: number) =>
  `${Math.round(f * rows)}/${rows} (${(f * 100).toFixed(1)}%)`;

const summaryTable = (title: string, g: GroupSummary): string => {
  const mean = (g.agreement[0] + g.agreement[1] + g.agreement[2]) / 3;
  const marginPp = g.rows === 0 ? 0 : 100 / g.rows;
  return [
    `## ${title} (${g.rows} rows)`,
    "| class | rows | run 1 | run 2 | run 3 |",
    "|---|---|---|---|---|",
    `| pooled | ${g.rows} | ${g.agreement.map((a) => count(a, g.rows)).join(" | ")} |`,
    ...(["match", "related", "unrelated"] as const).map((tier) => {
      const c = g.byClass[tier];
      return `| ${tier} | ${c.rows} | ${c.agreement.map((a) => count(a, c.rows)).join(" | ")} |`;
    }),
    `stability ${count(g.stability, g.rows)}`,
    // Slice 2's stop rule reads this line: the mean from the raw fractions, the margin = 1/N.
    `${title} mean ${(mean * 100).toFixed(2)}% (3 runs · ${g.rows} rows · margin ${marginPp.toFixed(2)} pp)`,
    "",
  ].join("\n");
};

/** Everything below this line is hold-out row tables; a committed round file stops above it. */
export const HOLDOUT_MARKER = "<!-- hold-out rows -->";

/**
 * The eval's output (spec § The eval step 5): tuning row tables, both summaries, latency,
 * verdict. Hold-out row tables only on request, and then only AFTER the marker, so the part
 * above the marker is always safe to commit.
 */
export const renderCorpusReport = (
  rows: CorpusEvalRow[],
  grade: CorpusGrade,
  { showHoldout }: { showHoldout: boolean },
): string => {
  const byTerm = (term: CorpusTerm) => rows.filter((r) => r.term === term);
  const parts: string[] = [];
  for (const term of TUNING_TERMS) parts.push(rowTable(term, byTerm(term)));
  parts.push(summaryTable("tuning", grade.tuning));
  parts.push(summaryTable("hold-out", grade.holdout));
  parts.push(`worst latency ${grade.worstMs} ms (budget ${LATENCY_BUDGET_MS}) · model jev-1.13.0`);
  parts.push(grade.verdict + (grade.latencyOnly ? " (latency only)" : ""));
  if (showHoldout) {
    parts.push("", HOLDOUT_MARKER, "");
    for (const term of HOLDOUT_TERMS) parts.push(rowTable(term, byTerm(term)));
  } else parts.push("", "hold-out rows hidden (--show-holdout)");
  return parts.join("\n");
};
