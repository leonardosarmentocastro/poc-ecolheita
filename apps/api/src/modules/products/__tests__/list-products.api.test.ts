import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

describe("GET /products", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("returns an empty list when nothing is registered", async () => {
    const res = await fetch(`${base}/products`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("lists products newest first, each with finalPrice", async () => {
    await json(base, "/products", {
      method: "POST",
      body: JSON.stringify({ ...bananaPrata, name: "Banana" }),
    });
    await json(base, "/products", {
      method: "POST",
      body: JSON.stringify({ ...bananaPrata, name: "Banana nanica" }),
    });
    const res = await fetch(`${base}/products`);
    const body = await res.json();
    expect(body.map((p: { name: string }) => p.name)).toEqual(["Banana nanica", "Banana"]);
    expect(body[0].finalPrice).toBe(350);
  });
});
