import { describe, expect, it } from "vitest";
import { gradeCorpus, type CorpusEvalRow } from "@/modules/relevance/grade-corpus";
import { HOLDOUT_MARKER, renderCorpusReport } from "@/modules/relevance/print-corpus-grade";

const rows: CorpusEvalRow[] = [
  {
    term: "banana",
    name: "Banana Prata - 1 Und",
    label: "match",
    got: ["match", "match", "match"],
  },
  // A cross-page row: a hold-out product inside a TUNING term's shortlist. Printing it by
  // default is correct; its banana label says nothing about its uva label.
  {
    term: "banana",
    name: "Uva Crimson",
    label: "unrelated",
    got: ["unrelated", "unrelated", "unrelated"],
  },
  { term: "uva", name: "Uva Crimson", label: "match", got: ["match", "related", null] },
  {
    term: "papel higiênico",
    name: "Neve Supreme 16 rolos",
    label: "match",
    got: ["match", "match", "match"],
  },
];

describe("renderCorpusReport", () => {
  it("prints tuning row tables (cross-page rows included) and no hold-out row table by default", () => {
    const out = renderCorpusReport(rows, gradeCorpus(rows, [300]), { showHoldout: false });
    expect(out).toContain("### banana (2 rows)");
    expect(out).toContain("| Uva Crimson | unrelated | unrelated | unrelated | unrelated | yes |");
    expect(out).not.toMatch(/^### uva \(/m);
    expect(out).not.toMatch(/^### papel higiênico \(/m);
    expect(out).not.toContain("Neve Supreme");
    expect(out).toContain("hold-out rows hidden (--show-holdout)");
  });

  it("prints hold-out row tables with --show-holdout, after the marker, a failed run as —", () => {
    const out = renderCorpusReport(rows, gradeCorpus(rows, [300]), { showHoldout: true });
    const [above, below] = out.split(HOLDOUT_MARKER);
    expect(above).not.toMatch(/^### uva \(/m);
    expect(above).toContain("INVALID"); // the verdict is above the marker
    expect(below).toContain("### uva (1 rows)");
    expect(below).toContain("| Uva Crimson | match | match | related | — | no |");
    expect(below).toContain("Neve Supreme 16 rolos");
  });

  it("prints both group summaries with per-class lines, the latency line and the verdict", () => {
    const out = renderCorpusReport(rows, gradeCorpus(rows, [300]), { showHoldout: false });
    expect(out).toContain("## tuning (2 rows)");
    expect(out).toContain("## hold-out (2 rows)");
    expect(out).toContain("| pooled | 2 | 2/2 (100.0%) | 1/2 (50.0%) | 1/2 (50.0%) |"); // hold-out
    expect(out).toContain("| match | 2 | 2/2 (100.0%) | 1/2 (50.0%) | 1/2 (50.0%) |"); // hold-out, class match
    expect(out).toContain("stability 1/2 (50.0%)");
    expect(out).toContain("tuning mean 100.00% (3 runs · 2 rows · margin 50.00 pp)");
    expect(out).toContain("hold-out mean 66.67% (3 runs · 2 rows · margin 50.00 pp)");
    expect(out).toContain("worst latency 300 ms (budget 1500)");
    expect(out).toContain("INVALID");
  });
});
