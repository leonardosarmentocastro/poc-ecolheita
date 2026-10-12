import { describe, expect, it, vi } from "vitest";
import { ClassifierError, type Candidate, type Classifier, type Tier } from "@/modules/relevance";
import type { Product } from "@/modules/products/types";
import { tierShortlist } from "@/modules/products/utils/tier-shortlist";

const at = "2026-10-07T00:00:00.000Z";
const product = (id: number, name: string, finalPrice: number): Product =>
  ({
    id,
    name,
    shopName: "s",
    price: finalPrice,
    quantity: 1,
    discountPercentage: 0,
    finalPrice,
    createdAt: at,
    updatedAt: at,
  }) as unknown as Product;

const byName = (tiers: Record<string, Tier>): Classifier & { calls: Candidate[][] } => {
  const calls: Candidate[][] = [];
  return {
    calls,
    async classify(_q, candidates) {
      calls.push(candidates);
      return new Map(candidates.map((c) => [c.id, tiers[c.name] ?? "unrelated"]));
    },
  };
};

describe("tierShortlist", () => {
  it("splits by tier, drops unrelated, orders each tier by final price then id", async () => {
    const list = [
      product(3, "Banana", 300),
      product(1, "Bananada", 240),
      product(2, "Banana prata", 300),
      product(4, "Pilha AA", 100),
      product(5, "Bolo de banana", 840),
    ];
    const c = byName({
      Banana: "match",
      "Banana prata": "match",
      Bananada: "related",
      "Bolo de banana": "related",
    });
    const got = await tierShortlist("banana", list, c);
    expect(got.matches.map((p) => p.id)).toEqual([2, 3]);
    expect(got.related.map((p) => p.id)).toEqual([1, 5]);
  });

  it("asks once per distinct name and gives every offer of it the same tier", async () => {
    const list = [
      product(1, "Banana", 300),
      product(2, "banana ", 200),
      product(3, "Banana prata", 350),
    ];
    const c = byName({ Banana: "match", "Banana prata": "match" });
    const got = await tierShortlist("banana", list, c);
    expect(c.calls[0]).toEqual([
      { id: 1, name: "Banana" },
      { id: 3, name: "Banana prata" },
    ]);
    expect(got.matches.map((p) => p.id)).toEqual([2, 1, 3]);
  });

  it("keeps accented and unaccented names apart", async () => {
    const c = byName({});
    await tierShortlist("maca", [product(1, "Maca", 100), product(2, "Maçã", 100)], c);
    expect(c.calls[0].map((x) => x.name)).toEqual(["Maca", "Maçã"]);
  });

  it("rejects as invalid when a candidate has no tier", async () => {
    const c: Classifier = { classify: async () => new Map() };
    await expect(tierShortlist("banana", [product(1, "Banana", 1)], c)).rejects.toMatchObject({
      kind: "invalid",
    });
  });

  it("rethrows a ClassifierError and wraps anything else as unexpected", async () => {
    const timeout: Classifier = {
      classify: vi.fn().mockRejectedValue(new ClassifierError("timeout")),
    };
    await expect(tierShortlist("b", [product(1, "B", 1)], timeout)).rejects.toMatchObject({
      kind: "timeout",
    });
    const bug: Classifier = { classify: vi.fn().mockRejectedValue(new TypeError("boom")) };
    await expect(tierShortlist("b", [product(1, "B", 1)], bug)).rejects.toMatchObject({
      kind: "unexpected",
    });
  });
});
