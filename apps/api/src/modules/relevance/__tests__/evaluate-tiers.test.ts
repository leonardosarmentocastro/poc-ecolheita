import { describe, expect, it } from "vitest";
import { gradeTiers } from "@/modules/relevance/evaluate-tiers";
import { FILLER_NAMES } from "@/modules/products/fixtures/filler-names";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";

describe("gradeTiers", () => {
  const rows = [
    { name: "Banana", expected: "match" as const, got: "match" as const },
    { name: "Bananada", expected: "related" as const, got: "related" as const },
  ];
  it("passes when every tier agrees and the worst latency is within budget", () => {
    expect(gradeTiers(rows, [400, 1500])).toEqual({
      agree: 2,
      total: 2,
      worstMs: 1500,
      pass: true,
    });
  });
  it("fails on one disagreement", () => {
    expect(
      gradeTiers([...rows, { name: "Pilha AA", expected: "unrelated", got: "related" }], [100])
        .pass,
    ).toBe(false);
  });
  it("fails when the worst latency exceeds 1.5 s", () => {
    expect(gradeTiers(rows, [400, 1501]).pass).toBe(false);
  });
});

describe("FILLER_NAMES", () => {
  it("has at least 36 names, none from the scenario", () => {
    expect(FILLER_NAMES.length).toBeGreaterThanOrEqual(36);
    const scenario = new Set(SEARCH_SCENARIO.map((r) => r.name));
    for (const n of FILLER_NAMES) expect(scenario.has(n)).toBe(false);
  });
});
