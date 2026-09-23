import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

describe("POST /products", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("creates a product and returns it with finalPrice (201)", async () => {
    const res = await json(base, "/products", {
      method: "POST",
      body: JSON.stringify(bananaPrata),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ ...bananaPrata, finalPrice: 350 });
    expect(typeof body.id).toBe("number");
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it("trims shop name and name", async () => {
    const res = await json(base, "/products", {
      method: "POST",
      body: JSON.stringify({ ...bananaPrata, shopName: "  CEASA SJC  ", name: "  Banana  " }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.shopName).toBe("CEASA SJC");
    expect(body.name).toBe("Banana");
  });

  it("allows the same shop to register the same name twice (two offers)", async () => {
    const first = await json(base, "/products", {
      method: "POST",
      body: JSON.stringify(bananaPrata),
    });
    const second = await json(base, "/products", {
      method: "POST",
      body: JSON.stringify({ ...bananaPrata, price: 450 }),
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect((await first.json()).id).not.toBe((await second.json()).id);
  });

  it.each([
    ["whitespace-only shop name", { shopName: "   " }],
    ["whitespace-only name", { name: "   " }],
    ["price with decimals", { price: 4.99 }],
    ["price as a string", { price: "4,99" }],
    ["negative price", { price: -1 }],
    ["negative quantity", { quantity: -1 }],
    ["price beyond the column's range", { price: 2_147_483_648 }],
    ["quantity beyond the column's range", { quantity: 2_147_483_648 }],
    ["discount above 100", { discountPercentage: 101 }],
    ["negative discount", { discountPercentage: -1 }],
    ["missing discount", { discountPercentage: undefined }],
  ])("rejects %s (400)", async (_label, patch) => {
    const res = await json(base, "/products", {
      method: "POST",
      body: JSON.stringify({ ...bananaPrata, ...patch }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("validation_error");
  });
});
