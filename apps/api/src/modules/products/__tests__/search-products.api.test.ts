import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { productsRepository } from "@/modules/products/repository";
import { ClassifierError, type Classifier } from "@/modules/relevance";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";
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

describe("GET /products/search with a classifier", () => {
  afterEach(() => vi.restoreAllMocks());
  const servers: Server[] = [];
  const serve = async (classifier: Classifier) => {
    const s = await startServer({ classifier });
    servers.push(s.server);
    return s.base;
  };
  afterAll(async () => {
    for (const s of servers) await stopServer(s);
  });

  it("answers untiered, in shortlist order, and logs only the failure kind when it fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing: Classifier = {
      classify: async () => Promise.reject(new ClassifierError("timeout")),
    };
    const b = await serve(failing);
    for (let i = 0; i < 3; i++) await create(b, { name: ["Banana", "Bolo", "Pilha"][i] });
    const body = await search(b, "segredo-da-busca");
    const expected = (await productsRepository.shortlist("segredo-da-busca")).map((p) => p.id);
    expect(body).toMatchObject({ tiered: false });
    expect(body.results.map((p: { id: number }) => p.id)).toEqual(expected);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toBe("search answered untiered: classifier timeout");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("segredo-da-busca");
  });

  it("answers untiered when the classifier leaves a candidate without a tier", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = await serve({ classify: async () => new Map() });
    await create(b, { name: "Banana" });
    expect((await search(b, "banana")).tiered).toBe(false);
    expect(String(warn.mock.calls[0][0])).toBe("search answered untiered: classifier invalid");
  });

  it("answers untiered, not 500, when the classifier has a bug", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = await serve({
      classify: async () => {
        throw new TypeError("boom");
      },
    });
    await create(b, { name: "Banana" });
    const res = await fetch(`${b}/products/search?q=banana`);
    expect(res.status).toBe(200);
    expect((await res.json()).tiered).toBe(false);
    expect(String(warn.mock.calls[0][0])).toBe("search answered untiered: classifier unexpected");
  });

  it("logs nothing when no classifier is configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { server: plain, base: b } = await startServer();
    servers.push(plain);
    await create(b, { name: "Banana" });
    expect((await search(b, "banana")).tiered).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it("answers an empty tiered list without asking when nothing is in stock", async () => {
    const classify = vi.fn();
    const b = await serve({ classify });
    await create(b, { name: "Banana", quantity: 0 });
    expect(await search(b, "banana")).toEqual({ tiered: true, matches: [], related: [] });
    expect(classify).not.toHaveBeenCalled();
  });

  it("puts two offers of the same name in the same section", async () => {
    const b = await serve(scenarioClassifier);
    const one = await create(b, { name: "Banana", price: 300 });
    const two = await create(b, { name: "banana ", price: 200 });
    const body = await search(b, "banana");
    expect(body.matches.map((p: { id: number }) => p.id)).toEqual([two.id, one.id]);
  });
});
