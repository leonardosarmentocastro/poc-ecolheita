import { describe, expect, it } from "vitest";
import { normalizeForSearch } from "@/modules/products/utils/normalize-for-search";

describe("normalizeForSearch", () => {
  it("trims, lowercases and collapses whitespace like the embedding normalisation", () => {
    expect(normalizeForSearch("  Banana   Prata ")).toBe("banana prata");
    expect(normalizeForSearch("BANANA\tnanica\n")).toBe("banana nanica");
  });
  it("strips accents, so a shopper who skips them still matches", () => {
    expect(normalizeForSearch("Maçã Argentina")).toBe("maca argentina");
    expect(normalizeForSearch("Açúcar refinado")).toBe("acucar refinado");
    expect(normalizeForSearch("FEIJÃO")).toBe("feijao");
  });
  it("leaves an all-accent query non-empty-safe", () => {
    expect(normalizeForSearch("ç")).toBe("c");
    expect(normalizeForSearch("!!!")).toBe("!!!");
  });
});
