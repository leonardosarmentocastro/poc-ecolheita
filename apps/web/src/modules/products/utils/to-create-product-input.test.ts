import { describe, expect, it } from "vitest";
import { toCreateProductInput } from "@/modules/products/utils/to-create-product-input";

describe("toCreateProductInput", () => {
  it("turns form strings into the API's integers, reais into cents", () => {
    expect(
      toCreateProductInput({
        shopName: " VEC ",
        name: " Banana prata ",
        priceReais: "5,00",
        quantity: "10",
        discountPercentage: "30",
      }),
    ).toEqual({
      shopName: "VEC",
      name: "Banana prata",
      price: 500,
      quantity: 10,
      discountPercentage: 30,
    });
  });
});
