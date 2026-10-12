import { beforeEach, describe, expect, it } from "vitest";
import { seedSearchScenario } from "@/db/seed";
import { scenarioRow, SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";
import { productsRepository } from "@/modules/products/repository";

// Seeded in fixture order, so row N of the spec table has id N.
const idOfKey = (key: string) => SEARCH_SCENARIO.indexOf(scenarioRow(key)) + 1;

// Spec § Testing, Shortlist row: with the size set to twice the expected count, every
// expected row is in. Measured worst positions with interleave: 7, 6, 6, 1, 1.
const RECALL: [query: string, expectedIds: number[]][] = [
  ["bolo", [7, 9, 10, 11, 12]],
  ["banana", [1, 2, 3, 4, 5, 7]],
  ["bnana", [1, 2, 3, 4]],
  ["acucar", [14]],
  ["maca", [6]],
];

describe("productsRepository.shortlist", () => {
  beforeEach(async () => {
    await seedSearchScenario();
  });

  it.each(RECALL)("%s: every expected row within twice its count", async (query, expected) => {
    const got = await productsRepository.shortlist(query, { size: expected.length * 2 });
    const ids = got.map((p) => p.id);
    for (const id of expected) expect(ids).toContain(id);
  });

  it("returns every in-stock row once, at most the default size, with no cutoff", async () => {
    const got = await productsRepository.shortlist("bolo");
    expect(got).toHaveLength(SEARCH_SCENARIO.length);
    expect(new Set(got.map((p) => p.id)).size).toBe(got.length);
    expect(got[0]).toHaveProperty("finalPrice");
    expect(got[0]).not.toHaveProperty("searchName");
    expect(got[0]).not.toHaveProperty("embedding");
  });

  it("never includes zero stock", async () => {
    const id = idOfKey("pao-quente-bolo-de-laranja");
    await productsRepository.update(id, { quantity: 0 });
    const got = await productsRepository.shortlist("bolo");
    expect(got.map((p) => p.id)).not.toContain(id);
  });

  it("keeps both offers of a duplicated name", async () => {
    const { key: _key, ...row } = scenarioRow("candelaria-banana");
    const dup = await productsRepository.create(row);
    const got = await productsRepository.shortlist("banana");
    expect(got.map((p) => p.id)).toEqual(
      expect.arrayContaining([idOfKey("candelaria-banana"), dup.id]),
    );
  });

  it("breaks equal distances by id, so the order is stable", async () => {
    const original = idOfKey("pao-quente-bolo-de-laranja");
    const { key: _key, ...row } = scenarioRow("pao-quente-bolo-de-laranja");
    const twin = await productsRepository.create(row); // same name: same distance on both lists
    // Rewrite the original so it now sits after the twin on disk: only the id tie-break
    // can still put it first.
    await productsRepository.update(original, { price: row.price + 1 });
    const ids = (await productsRepository.shortlist("bolo")).map((p) => p.id);
    expect(ids.indexOf(original)).toBeLessThan(ids.indexOf(twin.id));
  });
});
