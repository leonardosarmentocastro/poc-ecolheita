import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { productsRepository } from "@/modules/products/repository";
import { bananaPrata } from "./fixtures";

const create = (base: string, patch: Partial<typeof bananaPrata>) =>
  json(base, "/products", {
    method: "POST",
    body: JSON.stringify({ ...bananaPrata, ...patch }),
  }).then((r) => r.json());

const search = async (base: string, q: string) =>
  (await fetch(`${base}/products/search?q=${encodeURIComponent(q)}`)).json();

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

  it("answers untiered, with finalPrice and without similarity, embedding or searchName", async () => {
    await create(base, { name: "Banana prata" });
    const body = await search(base, "banana");
    expect(body.tiered).toBe(false);
    const [hit] = body.results;
    expect(hit.finalPrice).toBe(350);
    expect(hit).not.toHaveProperty("similarity");
    expect(hit).not.toHaveProperty("embedding");
    expect(hit).not.toHaveProperty("searchName");
  });

  it("has no cutoff: an unrelated product is still returned untiered", async () => {
    const detergent = await create(base, { name: "Detergente" });
    const body = await search(base, "banana");
    expect(body.results.map((p: { id: number }) => p.id)).toContain(detergent.id);
  });

  it("answers an accent-only or punctuation-only query", async () => {
    await create(base, { name: "Maçã" });
    for (const q of ["ç", "!!!"]) {
      const res = await fetch(`${base}/products/search?q=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
      expect((await res.json()).tiered).toBe(false);
    }
  });

  it("hides zero-stock products from search but not from the list", async () => {
    const soldOut = await create(base, { name: "Banana", price: 100, quantity: 0 });
    const inStock = await create(base, { name: "Banana prata" });
    const ids = (await search(base, "banana")).results.map((h: { id: number }) => h.id);
    expect(ids).toContain(inStock.id);
    expect(ids).not.toContain(soldOut.id);
    const list = await (await fetch(`${base}/products`)).json();
    expect(list.map((p: { id: number }) => p.id)).toContain(soldOut.id);
  });

  it("returns the repository's shortlist order, cut to 20", async () => {
    for (let i = 0; i < 25; i++)
      await create(base, { name: i % 2 ? "Banana" : "Bolo", price: 100 + i });
    const body = await search(base, "banana");
    const expected = (await productsRepository.shortlist("banana")).slice(0, 20).map((p) => p.id);
    expect(body.results.map((p: { id: number }) => p.id)).toEqual(expected);
    expect(body.results).toHaveLength(20);
  });

  it("answers an empty list when nothing is in stock", async () => {
    await create(base, { name: "Banana", quantity: 0 });
    expect(await search(base, "banana")).toEqual({ tiered: false, results: [] });
  });
});
