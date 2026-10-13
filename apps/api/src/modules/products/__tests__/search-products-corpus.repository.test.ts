import { beforeEach, describe, expect, it } from "vitest";
import { seedMarketplaceCorpus } from "@/db/seed";
import { normalizeForEmbedding } from "@/modules/embeddings";
import { findUnlabelled } from "@/modules/relevance/corpus-check";
import {
  CORPUS_LABELS,
  CORPUS_PAGES,
  type CorpusTerm,
} from "@/modules/products/fixtures/marketplace-corpus";
import { productsRepository } from "@/modules/products/repository";

const TERMS = [...new Set(CORPUS_PAGES.map((p) => p.term))] as CorpusTerm[];

describe("the marketplace corpus labels cover every shortlist pair", () => {
  // The global setup truncates products before every test, so seed before each one.
  beforeEach(async () => {
    await seedMarketplaceCorpus();
  });

  it.each(TERMS)("%s: every (term, name) in the 50-row shortlist has a label", async (term) => {
    const shortlist = await productsRepository.shortlist(term);
    expect(shortlist).toHaveLength(50);
    expect(
      findUnlabelled(
        term,
        shortlist.map((p) => p.name),
        CORPUS_LABELS,
      ),
    ).toEqual([]);
  });

  // Coupled to the fixture's ranking: the two "Cesta Básica … Carne E Linguiças" offers share a
  // vector and a search_name, so they rank adjacently and both reach the 50-row shortlist.
  it("carne: two offers with the same title are one labelled row", async () => {
    const shortlist = await productsRepository.shortlist("carne");
    const keys = shortlist.map((p) => normalizeForEmbedding(p.name));
    expect(keys.length).toBeGreaterThan(new Set(keys).size); // the Mercado Livre cestas repeat
    expect(
      findUnlabelled(
        "carne",
        shortlist.map((p) => p.name),
        CORPUS_LABELS,
      ),
    ).toEqual([]);
  });

  it("every label refers to a corpus name", async () => {
    const { CORPUS } = await import("@/modules/products/fixtures/marketplace-corpus");
    const keys = new Set(CORPUS.map((r) => normalizeForEmbedding(r.name)));
    for (const term of TERMS)
      for (const key of Object.keys(CORPUS_LABELS[term])) expect(keys.has(key)).toBe(true);
  });
});
