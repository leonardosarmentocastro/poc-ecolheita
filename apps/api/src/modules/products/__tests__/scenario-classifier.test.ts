import { describe, expect, it } from "vitest";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";

const tiersFor = async (query: string, names: string[]) => {
  const tiers = await scenarioClassifier.classify(
    query,
    names.map((name, i) => ({ id: i + 1, name })),
  );
  return names.map((_, i) => tiers.get(i + 1));
};

describe("scenarioClassifier", () => {
  it("answers the fixture's expected tier for each name", async () => {
    expect(await tiersFor("banana", ["Banana prata", "Bananada", "Pilha AA"])).toEqual([
      "match",
      "related",
      "unrelated",
    ]);
    expect(await tiersFor("bolo", ["Bolo de banana", "Forma de bolo redonda", "Banana"])).toEqual([
      "match",
      "related",
      "unrelated",
    ]);
  });

  it("matches query and name after normalizeForSearch", async () => {
    expect(await tiersFor("  BOLO ", ["bolo de laranja "])).toEqual(["match"]);
  });

  it("answers unrelated for a query or name the fixture does not list", async () => {
    expect(await tiersFor("detergente", ["Banana"])).toEqual(["unrelated"]);
    expect(await tiersFor("banana", ["Maçã"])).toEqual(["unrelated"]);
  });
});
