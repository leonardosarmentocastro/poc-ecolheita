import { afterEach, describe, expect, it, vi } from "vitest";
import { productsAPI } from "@/modules/products/api";

describe("productsAPI", () => {
  afterEach(() => vi.restoreAllMocks());

  it("posts the input as JSON to /products", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 201 }));
    await productsAPI.create({
      shopName: "a",
      name: "b",
      price: 1,
      quantity: 1,
      discountPercentage: 0,
    });
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/products$/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toMatchObject({ price: 1 });
  });
});
