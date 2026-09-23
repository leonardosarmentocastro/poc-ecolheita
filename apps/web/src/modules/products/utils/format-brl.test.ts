import { describe, expect, it } from "vitest";
import { formatBRL } from "@/modules/products/utils/format-brl";

describe("formatBRL", () => {
  it("formats cents as reais with a comma", () => {
    expect(formatBRL(350)).toBe("R$ 3,50");
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
    expect(formatBRL(0)).toBe("R$ 0,00");
  });
});
