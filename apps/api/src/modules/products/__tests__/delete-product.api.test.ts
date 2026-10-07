import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

describe("DELETE /products/:id", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("deletes (204), then GET is 404 and a second delete is 404", async () => {
    const created = await (
      await json(base, "/products", { method: "POST", body: JSON.stringify(bananaPrata) })
    ).json();
    expect((await fetch(`${base}/products/${created.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await fetch(`${base}/products/${created.id}`)).status).toBe(404);
    expect((await fetch(`${base}/products/${created.id}`, { method: "DELETE" })).status).toBe(404);
    const list = await (await fetch(`${base}/products`)).json();
    expect(list).toEqual([]);
  });

  it("is 404 for a non-numeric or out-of-range id", async () => {
    expect((await fetch(`${base}/products/abc`, { method: "DELETE" })).status).toBe(404);
    expect((await fetch(`${base}/products/99999999999`, { method: "DELETE" })).status).toBe(404);
  });
});
