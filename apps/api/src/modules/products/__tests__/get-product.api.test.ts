import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

describe("GET /products/:id", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("returns the product with finalPrice", async () => {
    const created = await (
      await json(base, "/products", { method: "POST", body: JSON.stringify(bananaPrata) })
    ).json();
    const res = await fetch(`${base}/products/${created.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ...bananaPrata, id: created.id, finalPrice: 350 });
  });

  it("is 404 for an unknown id", async () => {
    const res = await fetch(`${base}/products/999999`);
    expect(res.status).toBe(404);
  });

  it("is 404 for a non-numeric id, never 500", async () => {
    const res = await fetch(`${base}/products/abc`);
    expect(res.status).toBe(404);
  });
});
