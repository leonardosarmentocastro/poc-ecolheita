import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, embed, normalizeForEmbedding } from "@/modules/embeddings";
import { productsRepository } from "@/modules/products/repository";
import { pool } from "@/db/client";
import { normalizeForSearch } from "@/modules/products/utils/normalize-for-search";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";
import { bananaPrata } from "./fixtures";

describe("productsRepository.create", () => {
  it("stores the embedding of the normalised name", async () => {
    const created = await productsRepository.create({ ...bananaPrata, name: "  Banana   Prata " });
    const stored = await productsRepository.findEmbedding(created.id);
    expect(stored).toHaveLength(EMBEDDING_DIMENSIONS);
    const expected = await embed(normalizeForEmbedding("Banana Prata"));
    stored!.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 5));
  });
});

describe("productsRepository search_name", () => {
  it("writes the accent-stripped normalised name on create", async () => {
    const created = await productsRepository.create({
      ...bananaPrata,
      name: "  Maçã   Argentina ",
    });
    expect(await productsRepository.findSearchName(created.id)).toBe("maca argentina");
  });

  it("rewrites it on rename, and re-embeds a rename that only adds accents", async () => {
    const created = await productsRepository.create({ ...bananaPrata, name: "Maca" });
    const before = await productsRepository.findEmbedding(created.id);
    await productsRepository.update(created.id, { name: "Maçã" });
    expect(await productsRepository.findSearchName(created.id)).toBe("maca");
    expect(await productsRepository.findEmbedding(created.id)).not.toEqual(before);
  });

  it("leaves it alone on a price-only update", async () => {
    const created = await productsRepository.create({ ...bananaPrata, name: "Banana prata" });
    await pool.query("UPDATE products SET search_name = 'sentinel' WHERE id = $1", [created.id]);
    await productsRepository.update(created.id, { price: 999 });
    expect(await productsRepository.findSearchName(created.id)).toBe("sentinel");
  });

  it("is never returned by the API shape", async () => {
    const created = await productsRepository.create(bananaPrata);
    expect(created).not.toHaveProperty("searchName");
  });
});

describe("ecolheita_search_name (the migration's backfill)", () => {
  const names = [
    ...SEARCH_SCENARIO.map((r) => r.name),
    "  \tFEIJÃO  Carioca\n",
    "\u00a0Banana\u00a0",
    "Mac\u0327a\u0303", // "Maçã" typed decomposed (NFD), as some keyboards produce
    "Ōmega ăș",
    "ÁÀÂÃÄ éèêë íìîï óòôõö úùûü Çç Ññ",
  ];
  it.each(names)("matches normalizeForSearch for %j", async (name) => {
    const { rows } = await pool.query("SELECT ecolheita_search_name($1) AS v", [name]);
    expect(rows[0].v).toBe(normalizeForSearch(name));
  });
});
