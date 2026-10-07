import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, embed, normalizeForEmbedding } from "@/modules/embeddings";
import { productsRepository } from "@/modules/products/repository";
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
