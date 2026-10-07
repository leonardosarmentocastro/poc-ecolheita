import { describe, expect, it } from "vitest";
import { toProductFormValues } from "@/modules/products/utils/to-product-form-values";

describe("toProductFormValues", () => {
  it("turns a product into editable strings", () => {
    const at = "2026-09-22T12:00:00.000Z";
    expect(
      toProductFormValues({
        id: 1,
        shopName: "VEC",
        name: "Banana prata",
        price: 500,
        quantity: 10,
        discountPercentage: 0,
        finalPrice: 500,
        createdAt: at,
        updatedAt: at,
      }),
    ).toEqual({
      shopName: "VEC",
      name: "Banana prata",
      priceReais: "5,00",
      quantity: "10",
      discountPercentage: "0",
    });
  });
});
