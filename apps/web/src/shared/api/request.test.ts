import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "@/shared/api/request";

describe("request", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns parsed JSON on 2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    await expect(request<{ ok: boolean }>("/x")).resolves.toEqual({ ok: true });
  });

  it("returns undefined on 204", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(request<void>("/x")).resolves.toBeUndefined();
  });

  it("throws ApiError with status and issues on a 400", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: "validation_error", issues: [{ path: ["name"], message: "x" }] }),
        {
          status: 400,
        },
      ),
    );
    const err = await request<never>("/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("validation_error");
    expect(err.issues).toHaveLength(1);
  });
});
