import { describe, expect, it } from "vitest";
import { centsToReaisInput } from "@/modules/products/utils/cents-to-reais-input";

describe("centsToReaisInput", () => {
  it("formats cents as a reais string a person can edit, no currency symbol", () => {
    expect(centsToReaisInput(500)).toBe("5,00");
    expect(centsToReaisInput(123456)).toBe("1234,56");
    expect(centsToReaisInput(0)).toBe("0,00");
  });
});
