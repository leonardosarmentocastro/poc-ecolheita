# Search relevance tiers — slice 3: Jev classifies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Owns:** the Jev classifier — the request, answer parsing, the failure kinds and the 2 s timeout, `TYPESAFE_API_KEY` selecting it, and `tiers:eval` with its agreement and latency gates.

**Goal:** Real searches are tiered by TypeSafe Jev (`jev-1.13.0`) when `TYPESAFE_API_KEY` is set, and a human-run `tiers:eval` shows Jev agrees with the scenario's expected tiers within the latency budget.

**Architecture:** `createJevClassifier({ apiKey, url?, timeoutMs?, model? })` implements slice 2's `Classifier`: one `POST /v1/systemone` per search, one `choice` question per candidate (slice 2 already sends one candidate per distinct name), criteria from one module shared with the eval. Every failure becomes a `ClassifierError` with kind `timeout` / `status` / `invalid` / `unexpected`; the resolver (slice 2) already answers untiered on it. `classifierFromEnv` picks scenario, then Jev, then none. `tiers:eval` runs the real shortlist and the production adapter and prints a table for the PR body.

**Tech Stack:** Node 24 (`fetch`, `AbortSignal.timeout`, `node:http` for the fake server), Vitest 4, tsx.

**Spec:** `docs/superpowers/specs/2026-10-07-search-relevance-tiers-design.md` — read § The classifier seam, § Jev implementation, § When Jev fails, § Testing (Jev adapter, Real Jev, `tiers:eval`), § Accepted risks.

## Global Constraints

- Endpoint `POST https://api.typesafe.ai/v1/systemone`; header `Authorization: Bearer <TYPESAFE_API_KEY>`; `content-type: application/json` ([API reference](https://docs.typesafe.ai/api.md), checked 2026-10-07).
- Model pinned: `jev-1.13.0`. Never `jev-latest`.
- Body: `{ model, state, questions }`; `state` = `A shopper searched a street-market app for: "<q>"` (built with `JSON.stringify(q)` for the quotes); one question per candidate keyed `q1`, `q2`, … in candidate order: `{ type: "choice", instructions: "For this search, what is the product <JSON.stringify(name)>?", criteria: TIER_CRITERIA }`.
- Answer: `answers.qN.choice` must be `match`, `related` or `unrelated`. `confidence` is not used by the API.
- Failure → `ClassifierError`: no response within **2000 ms** (request aborted) → `timeout`; non-2xx → `status`; body not JSON, missing `answers`, missing answer for any candidate, or a choice outside the three tiers → `invalid`; anything else (network error) → `unexpected`. No retries.
- The key is never logged, never in an error message, never committed. `TYPESAFE_API_KEY` lives in `apps/api/.env` only; both `.env.example` files name it with an empty value.
- `SEARCH_CLASSIFIER=scenario` wins over `TYPESAFE_API_KEY`.
- Criteria examples must not reuse the scenario's names, or `tiers:eval` would grade Jev on its own prompt.
- `tiers:eval` gates (spec § Testing): every scenario row's tier equals the fixture's for both queries; the 50-candidate case run 5 times, worst latency ≤ **1.5 s**; any timeout fails. A failure is reported to the human — the fixture is never bent; criteria wording may be changed and re-run.
- Local gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:stories`, `pnpm e2e`.
- **This machine:** API tests with `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test`; e2e with `E2E_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_e2e`.

## Review Focus

- A product name with quotes or backslashes (`Bolo "da vó" \ caseiro`) must produce valid JSON instructions, not a 422 or a broken request. → Task 1 test.
- Jev answering 401 (bad or revoked key) must answer untiered with kind `status`, and the log must not contain the key. → Task 2 test.
- A 429 or 529 (rate limit, overload) must not be retried inside the 2 s budget. → Task 2 test (one request seen).
- A response with an extra, unknown question id must be ignored, not fail the call. → Task 1 test.
- A response arriving after the timeout must not resolve the classify call late. → Task 2 test.

---

### Task 1: Criteria and the Jev request/answer

**Files:**
- Create: `apps/api/src/modules/relevance/criteria.ts`, `apps/api/src/modules/relevance/jev-classifier.ts`
- Modify: `apps/api/src/modules/relevance/index.ts`
- Test: `apps/api/src/modules/relevance/__tests__/jev-classifier.test.ts`, `apps/api/src/modules/relevance/__tests__/fake-jev.ts` (test helper)

**Interfaces:**
- Consumes: `Classifier`, `Candidate`, `Tier`, `ClassifierError` (slice 2).
- Produces:
  - `TIER_CRITERIA` (`criteria.ts`) — `Record<Tier, { what: string; not_for?: string; examples: string[] }>`.
  - `JEV_URL = "https://api.typesafe.ai/v1/systemone"`, `JEV_MODEL = "jev-1.13.0"`, `JEV_TIMEOUT_MS = 2000`.
  - `createJevClassifier(opts: { apiKey: string; url?: string; timeoutMs?: number; model?: string }): Classifier`.
  - Test helper `startFakeJev(handler: (req: { headers: IncomingHttpHeaders; body: any }) => { status?: number; body?: unknown; raw?: string; delayMs?: number }): Promise<{ url: string; requests: { headers: IncomingHttpHeaders; body: any }[]; close(): Promise<void> }>`.

- [ ] **Step 1: Write the fake server helper** (`__tests__/fake-jev.ts`)

```ts
import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

type Seen = { headers: IncomingHttpHeaders; body: any };
type Reply = { status?: number; body?: unknown; raw?: string; delayMs?: number };

/** A local stand-in for TypeSafe's endpoint (spec § Testing, Jev adapter). */
export const startFakeJev = async (handler: (req: Seen) => Reply) => {
  const requests: Seen[] = [];
  const server = createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      const seen = { headers: req.headers, body: data ? JSON.parse(data) : undefined };
      requests.push(seen);
      const reply = handler(seen);
      setTimeout(() => {
        if (res.destroyed) return;
        res.writeHead(reply.status ?? 200, { "content-type": "application/json" });
        res.end(reply.raw ?? JSON.stringify(reply.body ?? {}));
      }, reply.delayMs ?? 0);
    });
  });
  server.listen(0);
  await new Promise((r) => server.once("listening", r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://localhost:${port}/v1/systemone`,
    requests,
    close: () =>
      new Promise<void>((r) => {
        server.closeAllConnections();
        server.close(() => r());
      }),
  };
};

/** A well-formed answer giving each question the tier the callback picks. */
export const answering = (pick: (instructions: string) => string) => (req: Seen) => ({
  body: {
    model: "jev-1.13.0",
    answers: Object.fromEntries(
      Object.entries(req.body.questions as Record<string, { instructions: string }>).map(
        ([id, q]) => [id, { type: "choice", choice: pick(q.instructions), confidence: 0.9, probabilities: {} }],
      ),
    ),
    usage: { input_tokens: 1, output_tokens: 0 },
  },
});
```

- [ ] **Step 2: Write the failing tests** (`jev-classifier.test.ts`)

```ts
import { afterEach, describe, expect, it } from "vitest";
import { createJevClassifier, JEV_MODEL, TIER_CRITERIA } from "@/modules/relevance";
import { answering, startFakeJev } from "./fake-jev";

let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

const tierByName = (instructions: string) =>
  instructions.includes("Bananada") ? "related" : instructions.includes("Pilha") ? "unrelated" : "match";

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
        q1: { type: "choice", instructions: 'For this search, what is the product "Banana prata"?', criteria: TIER_CRITERIA },
        q2: { type: "choice", instructions: 'For this search, what is the product "Bananada"?', criteria: TIER_CRITERIA },
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
    expect(fake.requests[0].body.state).toBe('A shopper searched a street-market app for: "bolo \\"x\\""');
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
    const tiers = await createJevClassifier({ apiKey: "k", url: fake.url }).classify("banana", [{ id: 1, name: "Banana" }]);
    expect(tiers.get(1)).toBe("match");
  });

  it("keeps the scenario's names out of the criteria examples", async () => {
    const { SEARCH_SCENARIO } = await import("@/modules/products/fixtures/search-scenario");
    const text = JSON.stringify(TIER_CRITERIA).toLowerCase();
    for (const row of SEARCH_SCENARIO) expect(text).not.toContain(row.name.toLowerCase());
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/relevance/__tests__/jev-classifier.test.ts`
Expected: FAIL — `createJevClassifier` is not exported.

- [ ] **Step 4: Implement**

`criteria.ts`:

```ts
import type { Tier } from "@/modules/relevance/types";

/**
 * The tier rule (CONTEXT.md, Relevance tier) as Jev `choice` criteria. Examples never reuse
 * the search scenario's names, so tiers:eval does not grade Jev on its own prompt. Changing
 * this wording means re-running tiers:eval.
 */
export const TIER_CRITERIA: Record<Tier, { what: string; not_for?: string; examples: string[] }> = {
  match: {
    what: "The product IS the thing searched for, or a kind, variety or form of it that the shopper would accept as a yes.",
    not_for: "Products made from it, used with it, or merely associated with it.",
    examples: ['"Laranja pera" for "laranja"', '"Pão francês" for "pão"', '"Leite integral" for "leite"'],
  },
  related: {
    what: "Not the thing searched for, but made from it, used with it, or plausibly wanted by someone looking for it.",
    not_for: "The thing itself or a variety of it (match), and products with no real connection (unrelated).",
    examples: [
      '"Suco de laranja" for "laranja"',
      '"Geleia de morango" for "morango"',
      '"Manteiga com sal" for "pão"',
      '"Panela de pressão" for "feijão"',
    ],
  },
  unrelated: {
    what: "Anything with no real connection to what was searched for.",
    examples: ['"Detergente líquido" for "laranja"', '"Ração para cachorro" for "pão"'],
  },
};
```

`jev-classifier.ts`:

```ts
import { TIER_CRITERIA } from "@/modules/relevance/criteria";
import { ClassifierError, type Classifier, type Tier } from "@/modules/relevance/types";

export const JEV_URL = "https://api.typesafe.ai/v1/systemone";
/** Pinned (spec § Jev implementation): an upgrade is a deliberate change, re-checked by tiers:eval. */
export const JEV_MODEL = "jev-1.13.0";
export const JEV_TIMEOUT_MS = 2000;

const TIERS: readonly Tier[] = ["match", "related", "unrelated"];

/** TypeSafe Jev as the search classifier: one request per search, one choice per candidate. */
export const createJevClassifier = ({
  apiKey,
  url = JEV_URL,
  timeoutMs = JEV_TIMEOUT_MS,
  model = JEV_MODEL,
}: {
  apiKey: string;
  url?: string;
  timeoutMs?: number;
  model?: string;
}): Classifier => ({
  async classify(query, candidates) {
    const ids = candidates.map((_, i) => `q${i + 1}`);
    const body = {
      model,
      state: `A shopper searched a street-market app for: ${JSON.stringify(query)}`,
      questions: Object.fromEntries(
        candidates.map((c, i) => [
          ids[i],
          {
            type: "choice",
            instructions: `For this search, what is the product ${JSON.stringify(c.name)}?`,
            criteria: TIER_CRITERIA,
          },
        ]),
      ),
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const name = (err as Error).name;
      throw new ClassifierError(name === "TimeoutError" || name === "AbortError" ? "timeout" : "unexpected");
    }
    if (!res.ok) throw new ClassifierError("status");

    let parsed: { answers?: Record<string, { choice?: unknown }> };
    try {
      parsed = await res.json();
    } catch (err) {
      const name = (err as Error).name;
      throw new ClassifierError(name === "TimeoutError" || name === "AbortError" ? "timeout" : "invalid");
    }

    const tiers = new Map<number, Tier>();
    candidates.forEach((c, i) => {
      const choice = parsed.answers?.[ids[i]]?.choice;
      if (!TIERS.includes(choice as Tier)) throw new ClassifierError("invalid");
      tiers.set(c.id, choice as Tier);
    });
    return tiers;
  },
});
```

`relevance/index.ts`: add `export * from "@/modules/relevance/criteria";` and `export * from "@/modules/relevance/jev-classifier";`.

- [ ] **Step 5: Run them to see them pass** — same command, expected PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/relevance
git commit -m "feat(api): Jev classifier sends one choice per candidate and reads tiers back"
```

---

### Task 2: Failure kinds and the 2 s timeout

**Files:**
- Test: `apps/api/src/modules/relevance/__tests__/jev-classifier-failures.test.ts`
- Modify (only if a test shows a gap): `apps/api/src/modules/relevance/jev-classifier.ts`

**Interfaces:**
- Consumes: `createJevClassifier`, `startFakeJev`, `answering`, `ClassifierError`.

- [ ] **Step 1: Write the tests**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { createJevClassifier } from "@/modules/relevance";
import { answering, startFakeJev } from "./fake-jev";

let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

const one = [{ id: 1, name: "Banana" }];
const serve = async (reply: Parameters<typeof startFakeJev>[0]) => {
  const fake = await startFakeJev(reply);
  close = fake.close;
  return fake;
};

describe("createJevClassifier failures", () => {
  it.each([401, 422, 429, 500, 529])("rejects as status on %i, without retrying and without the key", async (status) => {
    const fake = await serve(() => ({ status, body: { error: "x" } }));
    const err = await createJevClassifier({ apiKey: "secret-key", url: fake.url })
      .classify("banana", one)
      .catch((e) => e);
    expect(err).toMatchObject({ name: "ClassifierError", kind: "status" });
    expect(String(err.message)).not.toContain("secret-key");
    expect(fake.requests).toHaveLength(1);
  });

  it("rejects as invalid on a body that is not JSON", async () => {
    const fake = await serve(() => ({ raw: "<html>oops</html>" }));
    await expect(createJevClassifier({ apiKey: "k", url: fake.url }).classify("b", one)).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects as invalid when an answer is missing", async () => {
    const fake = await serve(() => ({ body: { answers: {} } }));
    await expect(createJevClassifier({ apiKey: "k", url: fake.url }).classify("b", one)).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects as invalid on a choice outside the three tiers", async () => {
    const fake = await serve(answering(() => "maybe"));
    await expect(createJevClassifier({ apiKey: "k", url: fake.url }).classify("b", one)).rejects.toMatchObject({ kind: "invalid" });
  });

  it("aborts and rejects as timeout when the answer is late, and never resolves afterwards", async () => {
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
    await expect(createJevClassifier({ apiKey: "k", url: fake.url }).classify("b", one)).rejects.toMatchObject({ kind: "unexpected" });
  });
});
```

- [ ] **Step 2: Run them**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/relevance/__tests__/jev-classifier-failures.test.ts`
Expected: PASS if Task 1's implementation already covers every kind. If a case fails, it is a red test — fix `jev-classifier.ts` minimally and re-run. (Write these tests before touching the implementation; if all pass first time, temporarily break one branch, e.g. map timeouts to `"unexpected"`, to see the timeout test fail, then restore.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/relevance
git commit -m "test(api): Jev failures reject with their kind, within the timeout, never retried"
```

---

### Task 3: `TYPESAFE_API_KEY` selects Jev

**Files:**
- Modify: `apps/api/src/config/env.ts`, `apps/api/src/config/__tests__/env.test.ts`, `apps/api/src/modules/relevance/classifier-from-env.ts`, `apps/api/src/modules/relevance/__tests__/classifier-from-env.test.ts`, `apps/api/.env.example`, `.env.example`

**Interfaces:**
- Produces: `envSchema` gains `TYPESAFE_API_KEY: z.string().min(1).optional()` (empty → unset); `classifierFromEnv(env: Partial<Pick<Env, "SEARCH_CLASSIFIER" | "TYPESAFE_API_KEY">>): Classifier | null`.

- [ ] **Step 1: Write the failing tests**

`env.test.ts`:

```ts
describe("TYPESAFE_API_KEY", () => {
  it("is optional, and empty means unset", () => {
    expect(envSchema.parse(base).TYPESAFE_API_KEY).toBeUndefined();
    expect(envSchema.parse({ ...base, TYPESAFE_API_KEY: "" }).TYPESAFE_API_KEY).toBeUndefined();
    expect(envSchema.parse({ ...base, TYPESAFE_API_KEY: "k" }).TYPESAFE_API_KEY).toBe("k");
  });
});
```

`classifier-from-env.test.ts` (add):

```ts
  it("is Jev when only the key is set", () => {
    const c = classifierFromEnv({ TYPESAFE_API_KEY: "k" });
    expect(c).not.toBeNull();
    expect(c).not.toBe(scenarioClassifier);
  });
  it("prefers the scenario classifier when both are set", () => {
    expect(classifierFromEnv({ SEARCH_CLASSIFIER: "scenario", TYPESAFE_API_KEY: "k" })).toBe(scenarioClassifier);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/config src/modules/relevance/__tests__/classifier-from-env.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`env.ts`:

```ts
  // TypeSafe Jev's key (spec § The classifier seam). Lives only in apps/api/.env; never logged.
  TYPESAFE_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
```

`classifier-from-env.ts`:

```ts
import type { Env } from "@/config/env";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";
import { createJevClassifier } from "@/modules/relevance/jev-classifier";
import type { Classifier } from "@/modules/relevance/types";

/** Scenario wins (e2e must never reach a dev key), then Jev, then none. */
export const classifierFromEnv = (
  env: Partial<Pick<Env, "SEARCH_CLASSIFIER" | "TYPESAFE_API_KEY">>,
): Classifier | null => {
  if (env.SEARCH_CLASSIFIER === "scenario") return scenarioClassifier;
  if (env.TYPESAFE_API_KEY) return createJevClassifier({ apiKey: env.TYPESAFE_API_KEY });
  return null;
};
```

Both `.env.example` files, under `# apps/api`:

```
# TypeSafe Jev key; unset means search answers untiered. Never commit a real key.
TYPESAFE_API_KEY=
```

- [ ] **Step 4: Run them to see them pass**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/.env.example .env.example
git commit -m "feat(api): TYPESAFE_API_KEY selects Jev; the scenario classifier still wins"
```

---

### Task 4: `tiers:eval`

**Files:**
- Create: `apps/api/src/modules/products/fixtures/filler-names.ts`, `apps/api/src/modules/relevance/evaluate-tiers.ts`, `apps/api/src/db/tiers-eval-cli.ts`
- Modify: `apps/api/package.json` (script `"tiers:eval": "tsx src/db/tiers-eval-cli.ts"`)
- Test: `apps/api/src/modules/relevance/__tests__/evaluate-tiers.test.ts`

**Interfaces:**
- Consumes: `seedSearchScenario`, `SEARCH_SCENARIO`, `EXPECTED_TIERS`, `productsRepository.shortlist`, `createJevClassifier`, `normalizeForEmbedding`, `tierShortlist` is **not** used (the eval grades every shortlisted row, unrelated included).
- Produces:
  - `FILLER_NAMES: readonly string[]` — 74 grocery names, none in the scenario.
  - `type EvalRow = { name: string; expected: Tier; got: Tier }`
  - `gradeTiers(rows: EvalRow[], latenciesMs: number[], budgetMs = 1500): { agree: number; total: number; worstMs: number; pass: boolean }`.

- [ ] **Step 1: Write the failing test** (`evaluate-tiers.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { gradeTiers } from "@/modules/relevance/evaluate-tiers";
import { FILLER_NAMES } from "@/modules/products/fixtures/filler-names";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";

describe("gradeTiers", () => {
  const rows = [
    { name: "Banana", expected: "match" as const, got: "match" as const },
    { name: "Bananada", expected: "related" as const, got: "related" as const },
  ];
  it("passes when every tier agrees and the worst latency is within budget", () => {
    expect(gradeTiers(rows, [400, 1500])).toEqual({ agree: 2, total: 2, worstMs: 1500, pass: true });
  });
  it("fails on one disagreement", () => {
    expect(gradeTiers([...rows, { name: "Pilha AA", expected: "unrelated", got: "related" }], [100]).pass).toBe(false);
  });
  it("fails when the worst latency exceeds 1.5 s", () => {
    expect(gradeTiers(rows, [400, 1501]).pass).toBe(false);
  });
});

describe("FILLER_NAMES", () => {
  it("has at least 36 names, none from the scenario", () => {
    expect(FILLER_NAMES.length).toBeGreaterThanOrEqual(36);
    const scenario = new Set(SEARCH_SCENARIO.map((r) => r.name));
    for (const n of FILLER_NAMES) expect(scenario.has(n)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/relevance/__tests__/evaluate-tiers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`filler-names.ts` — the 74 names the spec's merge measurement used:

```ts
/** Grocery names outside the scenario, for the 50-candidate latency case and catalogue probes. */
export const FILLER_NAMES: readonly string[] = [
  "Arroz branco 5kg", "Feijão carioca 1kg", "Farinha de trigo", "Leite integral", "Manteiga com sal",
  "Ovos brancos dúzia", "Café torrado e moído", "Óleo de soja", "Sal refinado", "Macarrão espaguete",
  "Molho de tomate", "Queijo muçarela", "Presunto fatiado", "Pão francês", "Pão de forma integral",
  "Biscoito recheado", "Chocolate ao leite", "Iogurte natural", "Requeijão cremoso", "Frango inteiro",
  "Linguiça toscana", "Peixe tilápia filé", "Alface crespa", "Tomate italiano", "Cebola",
  "Batata inglesa", "Cenoura", "Abobrinha", "Laranja pera", "Mamão papaia",
  "Abacaxi", "Uva sem semente", "Morango bandeja", "Limão taiti", "Melancia",
  "Detergente líquido", "Sabão em pó", "Papel higiênico", "Água sanitária", "Esponja de louça",
  "Shampoo", "Creme dental", "Sabonete", "Refrigerante cola 2L", "Suco de uva integral",
  "Cerveja lata", "Água mineral", "Vinho tinto", "Pipoca de micro-ondas", "Granola",
  "Aveia em flocos", "Mel", "Geleia de morango", "Doce de leite", "Leite condensado",
  "Creme de leite", "Fermento químico", "Panela de pressão", "Frigideira antiaderente", "Pote plástico",
  "Vela de aniversário", "Prato descartável", "Torta de limão", "Pudim de leite", "Brigadeiro",
  "Sorvete de creme", "Coxinha congelada", "Pizza congelada", "Lasanha congelada", "Ração para cachorro",
  "Areia para gato", "Fralda descartável", "Lâmpada LED", "Carvão para churrasco",
];
```

`evaluate-tiers.ts`:

```ts
import type { Tier } from "@/modules/relevance/types";

export type EvalRow = { name: string; expected: Tier; got: Tier };

/** tiers:eval's gates (spec § Testing): every tier agrees, worst latency within budget. */
export const gradeTiers = (rows: EvalRow[], latenciesMs: number[], budgetMs = 1500) => {
  const agree = rows.filter((r) => r.expected === r.got).length;
  const worstMs = Math.max(0, ...latenciesMs);
  return { agree, total: rows.length, worstMs, pass: agree === rows.length && worstMs <= budgetMs };
};
```

`db/tiers-eval-cli.ts`:

```ts
import "dotenv/config";
import { pool } from "@/db/client";
import { seedSearchScenario } from "@/db/seed";
import { env } from "@/config/env";
import { loadEmbeddingModel } from "@/modules/embeddings";
import { createJevClassifier, ClassifierError, type Tier } from "@/modules/relevance";
import { gradeTiers, type EvalRow } from "@/modules/relevance/evaluate-tiers";
import { FILLER_NAMES } from "@/modules/products/fixtures/filler-names";
import {
  EXPECTED_TIERS,
  SEARCH_SCENARIO,
  type ScenarioQuery,
} from "@/modules/products/fixtures/search-scenario";
import { productsRepository } from "@/modules/products/repository";

// Grades real Jev on the search scenario (spec § Testing, tiers:eval). REPLACES the products
// in DATABASE_URL with the scenario. Paste the printed table into the slice's PR body.
if (!env.TYPESAFE_API_KEY) {
  console.error("tiers:eval needs TYPESAFE_API_KEY in apps/api/.env");
  process.exit(1);
}
const jev = createJevClassifier({ apiKey: env.TYPESAFE_API_KEY });

const expectedTier = (q: ScenarioQuery, name: string): Tier => {
  const key = SEARCH_SCENARIO.find((r) => r.name === name)?.key;
  if (key && EXPECTED_TIERS[q].matches.includes(key)) return "match";
  if (key && EXPECTED_TIERS[q].related.includes(key)) return "related";
  return "unrelated";
};

const timed = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
  const t = performance.now();
  const out = await fn();
  return [out, Math.round(performance.now() - t)];
};

await loadEmbeddingModel();
await seedSearchScenario();

const rows: EvalRow[] = [];
const latencies: number[] = [];
let timedOut = false;
console.log("| query | product | expected | Jev | ✓ |\n|---|---|---|---|---|");
for (const q of Object.keys(EXPECTED_TIERS) as ScenarioQuery[]) {
  const shortlist = await productsRepository.shortlist(q);
  try {
    const [tiers, ms] = await timed(() =>
      jev.classify(q, shortlist.map((p) => ({ id: p.id, name: p.name }))),
    );
    latencies.push(ms);
    for (const p of shortlist) {
      const row = { name: p.name, expected: expectedTier(q, p.name), got: tiers.get(p.id)! };
      rows.push(row);
      console.log(`| ${q} | ${p.name} | ${row.expected} | ${row.got} | ${row.expected === row.got ? "✓" : "✗"} |`);
    }
    console.log(`\n${q}: ${shortlist.length} candidates in ${ms} ms\n`);
  } catch (err) {
    timedOut ||= err instanceof ClassifierError && err.kind === "timeout";
    console.log(`\n${q}: FAILED (${err instanceof ClassifierError ? err.kind : "unexpected"})\n`);
    rows.push({ name: `(${q} call)`, expected: "match", got: "unrelated" });
  }
}

const fifty = [...SEARCH_SCENARIO.map((r, i) => ({ id: i + 1, name: r.name })), ...FILLER_NAMES.slice(0, 36).map((name, i) => ({ id: 100 + i, name }))];
for (let run = 1; run <= 5; run++) {
  try {
    const [, ms] = await timed(() => jev.classify("bolo", fifty));
    latencies.push(ms);
    console.log(`50 candidates, run ${run}: ${ms} ms`);
  } catch (err) {
    timedOut ||= err instanceof ClassifierError && err.kind === "timeout";
    console.log(`50 candidates, run ${run}: FAILED (${err instanceof ClassifierError ? err.kind : "unexpected"})`);
    latencies.push(Number.POSITIVE_INFINITY);
  }
}

const grade = gradeTiers(rows, latencies);
console.log(`\nagreement ${grade.agree}/${grade.total} · worst latency ${grade.worstMs} ms (budget 1500) · model jev-1.13.0`);
console.log(grade.pass && !timedOut ? "PASS" : "FAIL — report to the human; never bend the fixture");
await pool.end();
process.exit(grade.pass && !timedOut ? 0 : 1);
```

`package.json` scripts: add `"tiers:eval": "tsx src/db/tiers-eval-cli.ts"`.

- [ ] **Step 4: Run the unit test to see it pass** — same command as Step 2, expected PASS.

- [ ] **Step 5: Run the real eval**

Precondition: `TYPESAFE_API_KEY` is set in `apps/api/.env` (the human's key). If it is not, stop and report **blocked: needs the human's Jev key in apps/api/.env** — never ask for the key in a message and never commit it.

Run: `pnpm --filter api tiers:eval` (wipes the dev database's products and seeds the scenario).
Expected: `PASS`. Save the full output to `.claude/reviews/<date>-search-relevance-tiers-tiers-eval.md` (gitignored) for the PR body.

- If a tier disagrees: change only `TIER_CRITERIA` wording (still without scenario names), re-run, and record each attempt. If wording cannot fix it, stop and report the table to the human.
- If the worst latency exceeds 1500 ms or any call times out: stop and report to the human (they choose between raising the timeout and sending fewer candidates).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src apps/api/package.json
git commit -m "feat(api): tiers:eval grades real Jev on the scenario with a latency gate"
```

---

### Task 5: `CONTEXT.md`, README, gates

**Files:**
- Modify: `CONTEXT.md`

- [ ] **Step 1: Name the classifier in `CONTEXT.md § Search`**

Add:

```markdown
- **Classifier** — TypeSafe Jev, model pinned to `jev-1.13.0`, decides each product's tier
  when `TYPESAFE_API_KEY` is set: one request per search, one question per distinct name,
  2-second budget, no retries. Without a key, or when Jev fails, search answers untiered.
  Changing the model or the criteria wording means re-running `pnpm --filter api tiers:eval`.
```

- [ ] **Step 2: Run every gate**

Run: `pnpm lint && pnpm typecheck && DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm test && pnpm test:stories && E2E_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_e2e pnpm e2e`
Expected: all PASS (e2e still runs the scenario classifier).

- [ ] **Step 3: Check by hand with real Jev**

With the key in `apps/api/.env`: `pnpm --filter api seed`, `pnpm dev`, `/buscar`, search "bolo" — the two sections appear; search "cake" — Jev decides (expect cakes under "Encontramos").

- [ ] **Step 4: Commit**

```bash
git add CONTEXT.md
git commit -m "docs(context): Jev is the search classifier"
```

The PR body for this slice carries the `tiers:eval` output (Task 4, Step 5).
