import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

const create = (base: string, patch: Partial<typeof bananaPrata>) =>
  json(base, "/products", {
    method: "POST",
    body: JSON.stringify({ ...bananaPrata, ...patch }),
  }).then((r) => r.json());

describe("GET /products/search", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("is 400 when q is missing, blank, or longer than 200 characters", async () => {
    expect((await fetch(`${base}/products/search`)).status).toBe(400);
    expect((await fetch(`${base}/products/search?q=%20%20`)).status).toBe(400);
    expect((await fetch(`${base}/products/search?q=${"a".repeat(201)}`)).status).toBe(400);
  });

  it("accepts a 200-character query", async () => {
    expect((await fetch(`${base}/products/search?q=${"a".repeat(200)}`)).status).toBe(200);
  });

  it("returns an empty list when nothing clears the threshold", async () => {
    await create(base, { name: "Detergente" });
    const res = await fetch(`${base}/products/search?q=banana`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns matches with finalPrice and similarity rounded to four places, without embedding", async () => {
    await create(base, { name: "Banana prata" });
    const [hit] = await (await fetch(`${base}/products/search?q=banana`)).json();
    expect(hit.finalPrice).toBe(350);
    expect(hit.similarity).toBe(Number(hit.similarity.toFixed(4)));
    expect(hit).not.toHaveProperty("embedding");
  });

  it("hides zero-stock products from search but not from the list", async () => {
    const soldOut = await create(base, { name: "Banana", price: 100, quantity: 0 });
    const inStock = await create(base, { name: "Banana prata" });
    const hits = await (await fetch(`${base}/products/search?q=banana`)).json();
    const ids = hits.map((h: { id: number }) => h.id);
    expect(ids).toContain(inStock.id); // the filter hides stock 0, not everything
    expect(ids).not.toContain(soldOut.id);
    const list = await (await fetch(`${base}/products`)).json();
    expect(list.map((p: { id: number }) => p.id)).toContain(soldOut.id);
  });

  it("orders by final price, then similarity, then id", async () => {
    const expensive = await create(base, { name: "Banana", price: 1000, discountPercentage: 0 });
    const cheapLessSimilar = await create(base, {
      name: "Banana nanica",
      price: 500,
      discountPercentage: 0,
    });
    const cheapMoreSimilar = await create(base, {
      name: "Banana",
      price: 500,
      discountPercentage: 0,
    });
    const cheapMoreSimilarLater = await create(base, {
      name: "Banana",
      price: 500,
      discountPercentage: 0,
    });
    const hits = await (await fetch(`${base}/products/search?q=banana`)).json();
    expect(hits.map((h: { id: number }) => h.id)).toEqual([
      cheapMoreSimilar.id,
      cheapMoreSimilarLater.id,
      cheapLessSimilar.id,
      expensive.id,
    ]);
  });

  it("caps at 20", async () => {
    for (let i = 0; i < 25; i++) await create(base, { name: "Banana", price: 100 + i });
    const hits = await (await fetch(`${base}/products/search?q=banana`)).json();
    expect(hits).toHaveLength(20);
  });
});
