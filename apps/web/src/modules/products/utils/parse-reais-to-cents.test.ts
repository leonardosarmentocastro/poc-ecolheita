import { describe, expect, it } from "vitest";
import { parseReaisToCents } from "@/modules/products/utils/parse-reais-to-cents";

describe("parseReaisToCents", () => {
  it("parses Brazilian decimals", () => {
    expect(parseReaisToCents("4,99")).toBe(499);
    expect(parseReaisToCents("1.234,56")).toBe(123456);
  });
  it("parses keyboard-style decimals", () => {
    expect(parseReaisToCents("4.99")).toBe(499);
    expect(parseReaisToCents("6")).toBe(600);
  });
  it("accepts zero and rejects junk and negatives", () => {
    expect(parseReaisToCents("0")).toBe(0);
    expect(parseReaisToCents("abc")).toBeNull();
    expect(parseReaisToCents("")).toBeNull();
    expect(parseReaisToCents("-1")).toBeNull();
  });
});
