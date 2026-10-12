import { afterEach, describe, expect, it, vi } from "vitest";
import { createJevClassifier } from "@/modules/relevance";
import { answering, startFakeJev } from "./fake-jev";

let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
  vi.unstubAllGlobals();
});

const one = [{ id: 1, name: "Banana" }];
const serve = async (reply: Parameters<typeof startFakeJev>[0]) => {
  const fake = await startFakeJev(reply);
  close = fake.close;
  return fake;
};

describe("createJevClassifier failures", () => {
  it.each([401, 422, 429, 500, 529])(
    "rejects as status on %i, without retrying and without the key",
    async (status) => {
      const fake = await serve(() => ({ status, body: { error: "x" } }));
      const err = await createJevClassifier({ apiKey: "secret-key", url: fake.url })
        .classify("banana", one)
        .catch((e) => e);
      expect(err).toMatchObject({ name: "ClassifierError", kind: "status" });
      expect(String(err.message)).not.toContain("secret-key");
      expect(fake.requests).toHaveLength(1);
    },
  );

  it("releases the connection on a non-2xx answer by cancelling its body", async () => {
    let cancelled = false;
    const body = new ReadableStream({
      cancel() {
        cancelled = true;
      },
    });
    vi.stubGlobal("fetch", async () => new Response(body, { status: 429 }));
    await expect(
      createJevClassifier({ apiKey: "k", url: "http://jev.test" }).classify("b", one),
    ).rejects.toMatchObject({ kind: "status" });
    expect(cancelled).toBe(true);
  });

  it("rejects as invalid on a body that is not JSON", async () => {
    const fake = await serve(() => ({ raw: "<html>oops</html>" }));
    await expect(
      createJevClassifier({ apiKey: "k", url: fake.url }).classify("b", one),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects as invalid when an answer is missing", async () => {
    const fake = await serve(() => ({ body: { answers: {} } }));
    await expect(
      createJevClassifier({ apiKey: "k", url: fake.url }).classify("b", one),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects as invalid on a choice outside the three tiers", async () => {
    const fake = await serve(answering(() => "maybe"));
    await expect(
      createJevClassifier({ apiKey: "k", url: fake.url }).classify("b", one),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("aborts the request and rejects as timeout within the timeout when the answer is late", async () => {
    const fake = await serve((req) => ({ ...answering(() => "match")(req), delayMs: 500 }));
    const started = Date.now();
    await expect(
      createJevClassifier({ apiKey: "k", url: fake.url, timeoutMs: 100 }).classify("b", one),
    ).rejects.toMatchObject({ kind: "timeout" });
    expect(Date.now() - started).toBeLessThan(400);
  });

  it("defaults the timeout to 2000 ms", async () => {
    const { JEV_TIMEOUT_MS } = await import("@/modules/relevance");
    expect(JEV_TIMEOUT_MS).toBe(2000);
  });

  it("rejects as unexpected when the server cannot be reached", async () => {
    const fake = await serve(() => ({}));
    await fake.close();
    close = undefined;
    await expect(
      createJevClassifier({ apiKey: "k", url: fake.url }).classify("b", one),
    ).rejects.toMatchObject({ kind: "unexpected" });
  });
});
