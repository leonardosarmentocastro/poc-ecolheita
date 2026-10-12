import { afterEach, describe, expect, it } from "vitest";
import { createJevClassifier, JEV_MODEL, TIER_CRITERIA } from "@/modules/relevance";
import { answering, startFakeJev } from "./fake-jev";

let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

const tierByName = (instructions: string) =>
  instructions.includes("Bananada")
    ? "related"
    : instructions.includes("Pilha")
      ? "unrelated"
      : "match";

describe("createJevClassifier", () => {
  it("sends one choice question per candidate, with the pinned model, state and bearer key", async () => {
    const fake = await startFakeJev(answering(tierByName));
    close = fake.close;
    const jev = createJevClassifier({ apiKey: "k-123", url: fake.url });
    await jev.classify("banana", [
      { id: 7, name: "Banana prata" },
      { id: 9, name: "Bananada" },
    ]);
    const [req] = fake.requests;
    expect(req.headers.authorization).toBe("Bearer k-123");
    expect(req.headers["content-type"]).toContain("application/json");
    expect(req.body).toEqual({
      model: JEV_MODEL,
      state: 'A shopper searched a street-market app for: "banana"',
      questions: {
        q1: {
          type: "choice",
          instructions: 'For this search, what is the product "Banana prata"?',
          criteria: TIER_CRITERIA,
        },
        q2: {
          type: "choice",
          instructions: 'For this search, what is the product "Bananada"?',
          criteria: TIER_CRITERIA,
        },
      },
    });
  });

  it("maps each answer back to its candidate id", async () => {
    const fake = await startFakeJev(answering(tierByName));
    close = fake.close;
    const tiers = await createJevClassifier({ apiKey: "k", url: fake.url }).classify("banana", [
      { id: 7, name: "Banana prata" },
      { id: 9, name: "Bananada" },
      { id: 13, name: "Pilha AA" },
    ]);
    expect([...tiers.entries()]).toEqual([
      [7, "match"],
      [9, "related"],
      [13, "unrelated"],
    ]);
  });

  it("escapes quotes and backslashes in names into valid instructions", async () => {
    const fake = await startFakeJev(answering(() => "match"));
    close = fake.close;
    await createJevClassifier({ apiKey: "k", url: fake.url }).classify('bolo "x"', [
      { id: 1, name: 'Bolo "da vó" \\ caseiro' },
    ]);
    expect(fake.requests[0].body.state).toBe(
      'A shopper searched a street-market app for: "bolo \\"x\\""',
    );
    expect(fake.requests[0].body.questions.q1.instructions).toBe(
      'For this search, what is the product "Bolo \\"da vó\\" \\\\ caseiro"?',
    );
  });

  it("ignores an answer for a question it did not ask", async () => {
    const fake = await startFakeJev((req) => {
      const reply = answering(() => "match")(req);
      (reply.body.answers as Record<string, unknown>).q99 = { type: "choice", choice: "match" };
      return reply;
    });
    close = fake.close;
    const tiers = await createJevClassifier({ apiKey: "k", url: fake.url }).classify("banana", [
      { id: 1, name: "Banana" },
    ]);
    expect(tiers.get(1)).toBe("match");
  });

  it("keeps the scenario's names out of the criteria examples", async () => {
    const { SEARCH_SCENARIO } = await import("@/modules/products/fixtures/search-scenario");
    const text = JSON.stringify(TIER_CRITERIA).toLowerCase();
    for (const row of SEARCH_SCENARIO) expect(text).not.toContain(row.name.toLowerCase());
  });
});
