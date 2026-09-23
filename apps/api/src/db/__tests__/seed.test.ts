import { describe, expect, it } from "vitest";
import { seedBananaScenario } from "@/db/seed";
import { BANANA_SCENARIO } from "@/modules/products/fixtures/banana-scenario";
import { productsRepository } from "@/modules/products/repository";

describe("seedBananaScenario", () => {
  it("leaves exactly the fixture's rows in the table, each with a vector", async () => {
    await productsRepository.create({
      shopName: "x",
      name: "leftover",
      price: 1,
      quantity: 1,
      discountPercentage: 0,
    });
    await seedBananaScenario();
    const all = await productsRepository.findAll();
    expect(all).toHaveLength(BANANA_SCENARIO.length);
    expect(new Set(all.map((p) => p.name))).toEqual(new Set(BANANA_SCENARIO.map((r) => r.name)));
    expect(await productsRepository.findEmbedding(all[0].id)).toHaveLength(384);
  });
});
