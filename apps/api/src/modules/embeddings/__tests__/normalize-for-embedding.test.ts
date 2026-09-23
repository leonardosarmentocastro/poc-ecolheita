import { describe, expect, it } from "vitest";
import { normalizeForEmbedding } from "@/modules/embeddings/normalize-for-embedding";

describe("normalizeForEmbedding", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeForEmbedding("  Banana   Prata ")).toBe("banana prata");
    expect(normalizeForEmbedding("BANANA\tnanica\n")).toBe("banana nanica");
  });
  it("keeps accents", () => {
    expect(normalizeForEmbedding("Maçã Argentina")).toBe("maçã argentina");
  });
});
