import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";

describe("error handler", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("maps a malformed JSON body to 400 invalid_json", async () => {
    const res = await fetch(`${base}/test/middlewares/json`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not json",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("maps a ZodError to 400 validation_error with issues", async () => {
    const res = await fetch(`${base}/test/middlewares/zod-error`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("validation_error");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("maps NotFoundError to 404", async () => {
    const res = await fetch(`${base}/test/middlewares/not-found`);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("resource not found");
  });

  it("maps anything else to 500", async () => {
    const res = await fetch(`${base}/test/middlewares/boom`);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("internal_server_error");
  });
});
