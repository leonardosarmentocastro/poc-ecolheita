import { describe, expect, it } from "vitest";
import { seedSearchScenario } from "@/db/seed";
import { SEARCH_SCENARIO, EXPECTED_TIERS } from "@/modules/products/fixtures/search-scenario";
import { productsRepository } from "@/modules/products/repository";

describe("seedSearchScenario", () => {
  it("leaves exactly the fixture's 14 rows in the table, each with a vector", async () => {
    await productsRepository.create({
      shopName: "x",
      name: "leftover",
      price: 1,
      quantity: 1,
      discountPercentage: 0,
    });
    await seedSearchScenario();
    const all = await productsRepository.findAll();
    expect(all).toHaveLength(14);
    expect(new Set(all.map((p) => p.name))).toEqual(new Set(SEARCH_SCENARIO.map((r) => r.name)));
    expect(await productsRepository.findEmbedding(all[0].id)).toHaveLength(384);
  });

  it("names only fixture keys in the expected tiers", () => {
    const keys = new Set(SEARCH_SCENARIO.map((r) => r.key));
    for (const { matches, related } of Object.values(EXPECTED_TIERS))
      for (const key of [...matches, ...related]) expect(keys).toContain(key);
  });
});
