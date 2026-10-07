import { describe, expect, it } from "vitest";
import { finalPrice } from "@/modules/products/utils/final-price";

describe("finalPrice", () => {
  it("applies the discount to integer cents", () => {
    expect(finalPrice(600, 50)).toBe(300);
    expect(finalPrice(800, 80)).toBe(160);
  });

  it("rounds half up", () => {
    // 333 * 0.5 = 166.5 → 167
    expect(finalPrice(333, 50)).toBe(167);
  });

  it("is the price itself at 0% and zero at 100%", () => {
    expect(finalPrice(499, 0)).toBe(499);
    expect(finalPrice(499, 100)).toBe(0);
  });
});
