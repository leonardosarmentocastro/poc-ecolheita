import { describe, expect, it } from "vitest";
import { productFormSchema } from "@/modules/products/schema";

const valid = {
  shopName: "VEC Hortifruti",
  name: "Banana prata",
  priceReais: "5,00",
  quantity: "10",
  discountPercentage: "30",
};

describe("productFormSchema", () => {
  it("accepts a valid form", () => {
    expect(productFormSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    ["shopName", ""],
    ["name", "   "],
    ["priceReais", "abc"],
    ["quantity", "-1"],
    ["quantity", "1.5"],
    ["discountPercentage", "101"],
  ])("rejects %s = %j with a Portuguese message", (field, value) => {
    const result = productFormSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path[0]).toBe(field);
    expect(result.error?.issues[0].message).toMatch(/Obrigatório|Valor inválido|Inteiro|0 a 100/);
  });
});
