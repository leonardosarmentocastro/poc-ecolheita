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

  it("encodes the query into /products/search", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("[]", { status: 200 }));
    await productsAPI.search("banana prata");
    expect(String(spy.mock.calls[0][0])).toMatch(/\/products\/search\?q=banana%20prata$/);
  });
});
