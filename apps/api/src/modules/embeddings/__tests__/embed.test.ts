import { beforeAll, describe, expect, it } from "vitest";
import {
  EMBEDDING_DIMENSIONS,
  embed,
  loadEmbeddingModel,
  normalizeForEmbedding,
} from "@/modules/embeddings";

const cosine = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);

describe("embed", () => {
  beforeAll(async () => {
    await loadEmbeddingModel();
  });

  it("returns 384 finite numbers, unit-normalised", async () => {
    const v = await embed("banana");
    expect(v).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(v.every(Number.isFinite)).toBe(true);
    expect(Math.sqrt(cosine(v, v))).toBeCloseTo(1, 3);
  });

  it("gives the same vector for the same normalised text", async () => {
    const a = await embed(normalizeForEmbedding("Banana"));
    const b = await embed(normalizeForEmbedding("banana "));
    expect(a).toEqual(b);
  });

  it("puts a banana closer to another banana than to a detergent", async () => {
    const banana = await embed("banana");
    const prata = await embed("banana prata");
    const detergent = await embed("detergente");
    expect(cosine(banana, prata)).toBeGreaterThan(cosine(banana, detergent));
  });
});
