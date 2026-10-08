import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { productsRepository } from "@/modules/products/repository";
import { bananaPrata } from "./fixtures";

const create = (base: string) =>
  json(base, "/products", { method: "POST", body: JSON.stringify(bananaPrata) }).then((r) =>
    r.json(),
  );
const patch = (base: string, id: number | string, body: unknown) =>
  json(base, `/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });

describe("PATCH /products/:id", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("updates fields and recomputes finalPrice (200)", async () => {
    const created = await create(base);
    // A pause, so a bumped updatedAt cannot share the creation's millisecond.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const res = await patch(base, created.id, { price: 1000, discountPercentage: 25, quantity: 3 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      id: created.id,
      name: "Banana prata",
      price: 1000,
      discountPercentage: 25,
      quantity: 3,
      finalPrice: 750,
    });
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.updatedAt).getTime(),
    );
    expect(body).not.toHaveProperty("embedding");
  });

  it("an empty body writes nothing: 200, same product, same updatedAt, same vector", async () => {
    const created = await create(base);
    const before = await productsRepository.findEmbedding(created.id);
    const res = await patch(base, created.id, {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: created.id, name: "Banana prata", finalPrice: 350 });
    expect(body.updatedAt).toBe(created.updatedAt);
    expect(await productsRepository.findEmbedding(created.id)).toEqual(before);
  });

  it("re-embeds when the normalised name changes", async () => {
    // "Maçã": the same rename the e2e proves. With no cutoff the renamed offer is still
    // served, under its new name; slice 2 restores "absent from the banana results".
    const created = await create(base);
    const before = await productsRepository.findEmbedding(created.id);
    const res = await patch(base, created.id, { name: "Maçã" });
    expect(res.status).toBe(200);
    const after = await productsRepository.findEmbedding(created.id);
    expect(after).not.toEqual(before);
    const { results } = await (await fetch(`${base}/products/search?q=banana`)).json();
    const hit = results.find((h: { id: number }) => h.id === created.id);
    expect(hit?.name).toBe("Maçã");
  });

  it("keeps the vector when only case or spacing of the name changes", async () => {
    const created = await create(base);
    const before = await productsRepository.findEmbedding(created.id);
    const res = await patch(base, created.id, { name: "  BANANA   prata " });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("BANANA   prata");
    expect(await productsRepository.findEmbedding(created.id)).toEqual(before);
  });

  it.each([
    ["price with decimals", { price: 4.99 }],
    ["whitespace-only name", { name: "   " }],
    ["discount above 100", { discountPercentage: 101 }],
    ["negative quantity", { quantity: -1 }],
  ])("rejects %s (400)", async (_label, body) => {
    const created = await create(base);
    const res = await patch(base, created.id, body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("validation_error");
  });

  it("is 404 for an unknown, non-numeric or out-of-range id", async () => {
    expect((await patch(base, 999999, { price: 1 })).status).toBe(404);
    expect((await patch(base, "abc", { price: 1 })).status).toBe(404);
    expect((await patch(base, 99999999999, { price: 1 })).status).toBe(404);
  });
});
