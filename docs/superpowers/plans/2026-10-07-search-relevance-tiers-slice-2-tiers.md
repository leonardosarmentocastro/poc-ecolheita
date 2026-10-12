# Search relevance tiers — slice 2: search answers in tiers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Reviewed:** round 1 (2026-10-07) · round 2 (2026-10-07).
**Owns:** the tiered answer — the classifier seam, the scenario classifier, one question per distinct name, `{ tiered: true, matches, related }` ordered by final price then id, the untiered fallback on classifier failure with its log line, and the page's two sections and empty states.

**Goal:** With a classifier configured, search answers like the street-market seller: matches under "Encontramos…", related products under "Você também pode gostar", unrelated products never shown; when the classifier fails, the slice-1 untiered list.

**Architecture:** A `relevance` module defines `Tier`, `Classifier` and `ClassifierError`. `createApp({ classifier })` stores the classifier in `app.locals`; `start.ts` builds it from the env (`SEARCH_CLASSIFIER=scenario` only, in this slice). The search resolver takes the slice-1 shortlist, asks `tierShortlist` (one question per distinct name, tiers spread to every offer of that name, each tier ordered by final price then id), and falls back to the untiered top 20 on any `ClassifierError`. The scenario classifier answers from the fixture's expected tiers, so tests and e2e run without a vendor. The Jev classifier is slice 3.

**Tech Stack:** Node 24, Express 5, Vitest 4; Next.js 16, Mantine, Storybook (`play()`), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-search-relevance-tiers-design.md` — read § Goal, § The flow, § The classifier seam, § API contract, § When Jev fails, § The page, § The scenario, § Testing, § Existing tests.

## Global Constraints

- Tiers: `"match" | "related" | "unrelated"`. Unrelated never appears in a tiered answer.
- Inside `matches` and inside `related`: final price ascending, then id ascending.
- One question per **distinct name**: names equal after `normalizeForEmbedding` (accents kept — "maca" and "maçã" stay apart) share one question; its tier applies to every offer with that name.
- The classifier receives the shopper's `q` (trimmed by the schema, case and accents as typed) and each candidate's `name` as the shop typed it. Never the shop name.
- `Classifier.classify` resolves a tier for every candidate or rejects; never a partial answer. A missing tier or any rejection → untiered.
- No classifier configured → every answer untiered, an empty one included (`{ tiered: false, results: [] }`). Classifier configured + empty shortlist → `{ tiered: true, matches: [], related: [] }` without calling it.
- Untiered fallback = first 20 of the shortlist (slice 1's `UNTIERED_CAP`), shortlist order.
- On classifier failure the API logs exactly one line naming the failure kind (`console.warn("search answered untiered: classifier <kind>")`); never the query, never a key.
- `SEARCH_CLASSIFIER` accepts only `scenario`; any other value fails the boot. (Slice 3 adds `TYPESAFE_API_KEY`; `scenario` wins when both are set.)
- Copy (pt-BR, exact, curly quotes): "Encontramos N produtos para “q”" ("1 produto" in the singular), "Não encontramos “q”", "Você também pode gostar", "Não conseguimos organizar os resultados por relevância". The three section titles are headings.
- Local gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:stories`, `pnpm e2e`.
- **This machine:** run API tests with `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test` and e2e with `E2E_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_e2e` (5432 is another project).
- **File-count tripwire crossed (~26 files):** the response union changes the API types, the resolver, the web types, three components with their stories, the container and both search e2e files at once; the seam adds its module, env and server wiring. Splitting would leave the web or e2e red between merges.

## Review Focus

- Two offers named "Banana" and "banana " (same normalised name) must land in the same section — one question, two offers. → Task 2 test.
- "Maca" and "Maçã" in one shortlist are two different questions. → Task 2 test.
- A classifier that resolves without a tier for one candidate must yield the untiered answer, not a 500 and not a partial tiered one. → Task 4 test.
- A classifier that throws a non-`ClassifierError` (a bug) must still answer untiered and log kind `unexpected`, never a 500. → Task 4 test.
- Every offer out of stock with a classifier configured → `{ tiered: true, matches: [], related: [] }` and the page says "Não encontramos “q”" without the related heading. → Task 4 and Task 5 tests.

---

### Task 1: The classifier seam and the scenario classifier

**Files:**
- Create: `apps/api/src/modules/relevance/types.ts`, `apps/api/src/modules/relevance/index.ts`, `apps/api/src/modules/products/fixtures/scenario-classifier.ts`
- Test: `apps/api/src/modules/products/__tests__/scenario-classifier.test.ts`

**Interfaces:**
- Consumes: `SEARCH_SCENARIO`, `EXPECTED_TIERS`, `scenarioRow` (slice 1); `normalizeForSearch` (slice 1).
- Produces (`@/modules/relevance`):
  - `type Tier = "match" | "related" | "unrelated"`
  - `interface Candidate { id: number; name: string }`
  - `interface Classifier { classify(query: string, candidates: Candidate[]): Promise<Map<number, Tier>> }`
  - `type ClassifierFailure = "timeout" | "status" | "invalid" | "unexpected"`
  - `class ClassifierError extends Error { readonly kind: ClassifierFailure }`
- Produces (`@/modules/products/fixtures/scenario-classifier`): `scenarioClassifier: Classifier`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";

const tiersFor = async (query: string, names: string[]) => {
  const tiers = await scenarioClassifier.classify(
    query,
    names.map((name, i) => ({ id: i + 1, name })),
  );
  return names.map((_, i) => tiers.get(i + 1));
};

describe("scenarioClassifier", () => {
  it("answers the fixture's expected tier for each name", async () => {
    expect(await tiersFor("banana", ["Banana prata", "Bananada", "Pilha AA"])).toEqual([
      "match",
      "related",
      "unrelated",
    ]);
    expect(await tiersFor("bolo", ["Bolo de banana", "Forma de bolo redonda", "Banana"])).toEqual([
      "match",
      "related",
      "unrelated",
    ]);
  });

  it("matches query and name after normalizeForSearch", async () => {
    expect(await tiersFor("  BOLO ", ["bolo de laranja "])).toEqual(["match"]);
  });

  it("answers unrelated for a query or name the fixture does not list", async () => {
    expect(await tiersFor("detergente", ["Banana"])).toEqual(["unrelated"]);
    expect(await tiersFor("banana", ["Maçã"])).toEqual(["unrelated"]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/products/__tests__/scenario-classifier.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`relevance/types.ts`:

```ts
/** Spec § Goal: what a product is, for one search. */
export type Tier = "match" | "related" | "unrelated";

export interface Candidate {
  id: number;
  /** The product name as the shop typed it (accents kept). Never the shop name. */
  name: string;
}

/** Decides each candidate's tier for a search. Resolves every candidate or rejects. */
export interface Classifier {
  classify(query: string, candidates: Candidate[]): Promise<Map<number, Tier>>;
}

export type ClassifierFailure = "timeout" | "status" | "invalid" | "unexpected";

/** Any classifier failure; the search answers untiered and logs `kind` only. */
export class ClassifierError extends Error {
  constructor(readonly kind: ClassifierFailure) {
    super(`classifier ${kind}`);
    this.name = "ClassifierError";
  }
}
```

`relevance/index.ts`: `export * from "@/modules/relevance/types";`

`fixtures/scenario-classifier.ts`:

```ts
import type { Classifier, Tier } from "@/modules/relevance";
import {
  EXPECTED_TIERS,
  scenarioRow,
  type ScenarioQuery,
} from "@/modules/products/fixtures/search-scenario";
import { normalizeForSearch } from "@/modules/products/utils/normalize-for-search";

const TIERS = new Map<string, Tier>();
for (const [query, { matches, related }] of Object.entries(EXPECTED_TIERS) as [
  ScenarioQuery,
  { matches: string[]; related: string[] },
][]) {
  for (const key of matches) TIERS.set(`${query}|${normalizeForSearch(scenarioRow(key).name)}`, "match");
  for (const key of related) TIERS.set(`${query}|${normalizeForSearch(scenarioRow(key).name)}`, "related");
}

/**
 * The search scenario's expected tiers as a classifier (spec § The classifier seam). For
 * tests and e2e only (`SEARCH_CLASSIFIER=scenario`): a pair the fixture does not list is
 * unrelated.
 */
export const scenarioClassifier: Classifier = {
  async classify(query, candidates) {
    const q = normalizeForSearch(query);
    return new Map(
      candidates.map((c) => [c.id, TIERS.get(`${q}|${normalizeForSearch(c.name)}`) ?? "unrelated"]),
    );
  },
};
```

- [ ] **Step 4: Run it to see it pass** — same command, expected PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/relevance apps/api/src/modules/products/fixtures/scenario-classifier.ts apps/api/src/modules/products/__tests__/scenario-classifier.test.ts
git commit -m "feat(api): classifier seam and the scenario classifier"
```

---

### Task 2: `tierShortlist` — one question per name, tiers ordered by price

**Files:**
- Create: `apps/api/src/modules/products/utils/tier-shortlist.ts`
- Test: `apps/api/src/modules/products/__tests__/tier-shortlist.test.ts`

**Interfaces:**
- Consumes: `Classifier`, `Candidate`, `Tier`, `ClassifierError` (Task 1); `Product` (`@/modules/products/types`); `normalizeForEmbedding`.
- Produces: `tierShortlist(query: string, shortlist: Product[], classifier: Classifier): Promise<{ matches: Product[]; related: Product[] }>` — rejects with `ClassifierError("invalid")` when the classifier leaves a candidate without a tier; rethrows a `ClassifierError`; wraps anything else as `ClassifierError("unexpected")`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { ClassifierError, type Candidate, type Classifier, type Tier } from "@/modules/relevance";
import type { Product } from "@/modules/products/types";
import { tierShortlist } from "@/modules/products/utils/tier-shortlist";

const at = "2026-10-07T00:00:00.000Z";
const product = (id: number, name: string, finalPrice: number): Product =>
  ({ id, name, shopName: "s", price: finalPrice, quantity: 1, discountPercentage: 0, finalPrice, createdAt: at, updatedAt: at }) as unknown as Product;

const byName = (tiers: Record<string, Tier>): Classifier & { calls: Candidate[][] } => {
  const calls: Candidate[][] = [];
  return {
    calls,
    async classify(_q, candidates) {
      calls.push(candidates);
      return new Map(candidates.map((c) => [c.id, tiers[c.name] ?? "unrelated"]));
    },
  };
};

describe("tierShortlist", () => {
  it("splits by tier, drops unrelated, orders each tier by final price then id", async () => {
    const list = [
      product(3, "Banana", 300),
      product(1, "Bananada", 240),
      product(2, "Banana prata", 300),
      product(4, "Pilha AA", 100),
      product(5, "Bolo de banana", 840),
    ];
    const c = byName({ Banana: "match", "Banana prata": "match", Bananada: "related", "Bolo de banana": "related" });
    const got = await tierShortlist("banana", list, c);
    expect(got.matches.map((p) => p.id)).toEqual([2, 3]);
    expect(got.related.map((p) => p.id)).toEqual([1, 5]);
  });

  it("asks once per distinct name and gives every offer of it the same tier", async () => {
    const list = [product(1, "Banana", 300), product(2, "banana ", 200), product(3, "Banana prata", 350)];
    const c = byName({ Banana: "match", "Banana prata": "match" });
    const got = await tierShortlist("banana", list, c);
    expect(c.calls[0]).toEqual([
      { id: 1, name: "Banana" },
      { id: 3, name: "Banana prata" },
    ]);
    expect(got.matches.map((p) => p.id)).toEqual([2, 1, 3]);
  });

  it("keeps accented and unaccented names apart", async () => {
    const c = byName({});
    await tierShortlist("maca", [product(1, "Maca", 100), product(2, "Maçã", 100)], c);
    expect(c.calls[0].map((x) => x.name)).toEqual(["Maca", "Maçã"]);
  });

  it("rejects as invalid when a candidate has no tier", async () => {
    const c: Classifier = { classify: async () => new Map() };
    await expect(tierShortlist("banana", [product(1, "Banana", 1)], c)).rejects.toMatchObject({
      kind: "invalid",
    });
  });

  it("rethrows a ClassifierError and wraps anything else as unexpected", async () => {
    const timeout: Classifier = { classify: vi.fn().mockRejectedValue(new ClassifierError("timeout")) };
    await expect(tierShortlist("b", [product(1, "B", 1)], timeout)).rejects.toMatchObject({ kind: "timeout" });
    const bug: Classifier = { classify: vi.fn().mockRejectedValue(new TypeError("boom")) };
    await expect(tierShortlist("b", [product(1, "B", 1)], bug)).rejects.toMatchObject({ kind: "unexpected" });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/products/__tests__/tier-shortlist.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { normalizeForEmbedding } from "@/modules/embeddings";
import { ClassifierError, type Candidate, type Classifier, type Tier } from "@/modules/relevance";
import type { Product } from "@/modules/products/types";

const byPriceThenId = (a: Product, b: Product) => a.finalPrice - b.finalPrice || a.id - b.id;

/**
 * Spec § The flow, steps 3–4: one question per distinct name (accents kept), the tier spread
 * to every offer of that name, unrelated dropped, each tier cheapest first.
 */
export const tierShortlist = async (
  query: string,
  shortlist: Product[],
  classifier: Classifier,
): Promise<{ matches: Product[]; related: Product[] }> => {
  const representative = new Map<string, Candidate>();
  for (const p of shortlist) {
    const key = normalizeForEmbedding(p.name);
    if (!representative.has(key)) representative.set(key, { id: p.id, name: p.name });
  }

  let answers: Map<number, Tier>;
  try {
    answers = await classifier.classify(query, [...representative.values()]);
  } catch (err) {
    throw err instanceof ClassifierError ? err : new ClassifierError("unexpected");
  }

  const matches: Product[] = [];
  const related: Product[] = [];
  for (const p of shortlist) {
    const tier = answers.get(representative.get(normalizeForEmbedding(p.name))!.id);
    if (tier === undefined) throw new ClassifierError("invalid");
    if (tier === "match") matches.push(p);
    else if (tier === "related") related.push(p);
  }
  return { matches: matches.sort(byPriceThenId), related: related.sort(byPriceThenId) };
};
```

- [ ] **Step 4: Run it to see it pass** — same command, expected PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/products/utils/tier-shortlist.ts apps/api/src/modules/products/__tests__/tier-shortlist.test.ts
git commit -m "feat(api): tierShortlist asks once per distinct name and orders tiers by price"
```

---

### Task 3: Wiring — env, `classifierFromEnv`, `createApp({ classifier })`

**Files:**
- Create: `apps/api/src/modules/relevance/classifier-from-env.ts`, `apps/api/src/modules/relevance/classifier-of.ts`
- Modify: `apps/api/src/modules/relevance/index.ts`, `apps/api/src/config/env.ts`, `apps/api/src/config/__tests__/env.test.ts`, `apps/api/src/server/server.ts`, `apps/api/src/server/start.ts`, `apps/api/test/helpers.ts`
- Test: `apps/api/src/modules/relevance/__tests__/classifier-from-env.test.ts`

**Interfaces:**
- Consumes: `scenarioClassifier` (Task 1), `Env` (`@/config/env`).
- Produces:
  - `envSchema` gains `SEARCH_CLASSIFIER: z.enum(["scenario"]).optional()` (empty string → unset).
  - `classifierFromEnv(env: Partial<Pick<Env, "SEARCH_CLASSIFIER">>): Classifier | null`.
  - `createApp(deps?: { classifier?: Classifier | null }): Express` — stores `deps.classifier ?? null` in `app.locals.classifier`.
  - `classifierOf(req: Request): Classifier | null` (reads `req.app.locals.classifier`).
  - `startServer(deps?: { classifier?: Classifier | null })` in `@test/helpers`.

- [ ] **Step 1: Write the failing tests**

Append to `env.test.ts`:

```ts
describe("SEARCH_CLASSIFIER", () => {
  it("accepts scenario and treats empty as unset", () => {
    expect(envSchema.parse({ ...base, SEARCH_CLASSIFIER: "scenario" }).SEARCH_CLASSIFIER).toBe("scenario");
    expect(envSchema.parse({ ...base, SEARCH_CLASSIFIER: "" }).SEARCH_CLASSIFIER).toBeUndefined();
  });
  it("refuses any other value so the boot fails", () => {
    expect(() => envSchema.parse({ ...base, SEARCH_CLASSIFIER: "jev" })).toThrow();
  });
});
```

`classifier-from-env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifierFromEnv } from "@/modules/relevance/classifier-from-env";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";

describe("classifierFromEnv", () => {
  it("is the scenario classifier for SEARCH_CLASSIFIER=scenario", () => {
    expect(classifierFromEnv({ SEARCH_CLASSIFIER: "scenario" })).toBe(scenarioClassifier);
  });
  it("is none when nothing is configured", () => {
    expect(classifierFromEnv({})).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/config/__tests__/env.test.ts src/modules/relevance`
Expected: FAIL.

- [ ] **Step 3: Implement**

`env.ts`, inside `envSchema`:

```ts
  // Which classifier tiers search results (spec § The classifier seam). `scenario` answers
  // from the test fixture and is for e2e only; unset means none. Slice 3 adds Jev.
  SEARCH_CLASSIFIER: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["scenario"]).optional()),
```

`relevance/classifier-from-env.ts`:

```ts
import type { Env } from "@/config/env";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";
import type { Classifier } from "@/modules/relevance/types";

/** The classifier the env selects, or none (spec § The classifier seam). */
export const classifierFromEnv = (env: Partial<Pick<Env, "SEARCH_CLASSIFIER">>): Classifier | null =>
  env.SEARCH_CLASSIFIER === "scenario" ? scenarioClassifier : null;
```

`relevance/classifier-of.ts`:

```ts
import type { Request } from "express";
import type { Classifier } from "@/modules/relevance/types";

/** The classifier `createApp` was given, or none. */
export const classifierOf = (req: Request): Classifier | null =>
  (req.app.locals.classifier as Classifier | null | undefined) ?? null;
```

`relevance/index.ts`: also export `classifier-of` (not `classifier-from-env`, which imports the fixture; `start.ts` imports it by path).

`server.ts`:

```ts
import type { Classifier } from "@/modules/relevance";

export const createApp = (deps: { classifier?: Classifier | null } = {}): Express => {
  const app = express();
  app.locals.classifier = deps.classifier ?? null;
  connectMiddlewares(app);
  connectRoutes(app);
  connectErrorHandler(app);
  return app;
};
```

`start.ts`: `import { classifierFromEnv } from "@/modules/relevance/classifier-from-env";` and `createApp({ classifier: classifierFromEnv(env) }).listen(…)`.

`test/helpers.ts`: `startServer = async (deps: { classifier?: Classifier | null } = {})` → `createApp(deps).listen(0)`.

- [ ] **Step 4: Run them to see them pass**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api test`
Expected: PASS (existing tests call `startServer()` with no classifier and keep their untiered behaviour).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): createApp takes a classifier; SEARCH_CLASSIFIER=scenario selects the fixture's"
```

---

### Task 4: The route answers in tiers

**Files:**
- Modify: `apps/api/src/modules/products/resolvers/search-products-resolver.ts`, `apps/api/src/modules/products/types.ts`
- Rewrite: `apps/api/src/modules/products/__tests__/search-scenario.api.test.ts`
- Modify: `apps/api/src/modules/products/__tests__/search-products.api.test.ts` (add a `describe` block)

**Interfaces:**
- Consumes: `tierShortlist` (Task 2), `classifierOf` (Task 3), `scenarioClassifier`, `productsRepository.shortlist`, `UNTIERED_CAP`.
- Produces: `type SearchResponse = { tiered: true; matches: Product[]; related: Product[] } | { tiered: false; results: Product[] }`.

- [ ] **Step 1: Write the failing tests**

Replace `search-scenario.api.test.ts`:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";
import { seedSearchScenario } from "@/db/seed";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";
import { EXPECTED_TIERS, SEARCH_SCENARIO, scenarioRow } from "@/modules/products/fixtures/search-scenario";

// Seeded in fixture order: row N of the spec table has id N.
const idOf = (key: string) => SEARCH_SCENARIO.indexOf(scenarioRow(key)) + 1;

describe("the search scenario, tiered", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer({ classifier: scenarioClassifier }));
  });
  afterAll(async () => {
    await stopServer(server);
  });
  beforeEach(async () => {
    await seedSearchScenario();
  });

  it.each(["banana", "bolo"] as const)("%s answers exactly the expected tiers, cheapest first", async (q) => {
    const body = await (await fetch(`${base}/products/search?q=${q}`)).json();
    expect(body.tiered).toBe(true);
    expect(body.matches.map((p: { id: number }) => p.id)).toEqual(EXPECTED_TIERS[q].matches.map(idOf));
    expect(body.related.map((p: { id: number }) => p.id)).toEqual(EXPECTED_TIERS[q].related.map(idOf));
  });
});
```

Append to `search-products.api.test.ts`:

```ts
import { afterEach, vi } from "vitest";
import { ClassifierError, type Classifier } from "@/modules/relevance";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";

describe("GET /products/search with a classifier", () => {
  afterEach(() => vi.restoreAllMocks());
  const servers: Server[] = [];
  const serve = async (classifier: Classifier) => {
    const s = await startServer({ classifier });
    servers.push(s.server);
    return s.base;
  };
  afterAll(async () => {
    for (const s of servers) await stopServer(s);
  });

  it("answers untiered, in shortlist order, and logs only the failure kind when it fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing: Classifier = { classify: async () => Promise.reject(new ClassifierError("timeout")) };
    const b = await serve(failing);
    for (let i = 0; i < 3; i++) await create(b, { name: ["Banana", "Bolo", "Pilha"][i] });
    const body = await search(b, "segredo-da-busca");
    const expected = (await productsRepository.shortlist("segredo-da-busca")).map((p) => p.id);
    expect(body).toMatchObject({ tiered: false });
    expect(body.results.map((p: { id: number }) => p.id)).toEqual(expected);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toBe("search answered untiered: classifier timeout");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("segredo-da-busca");
  });

  it("answers untiered when the classifier leaves a candidate without a tier", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = await serve({ classify: async () => new Map() });
    await create(b, { name: "Banana" });
    expect((await search(b, "banana")).tiered).toBe(false);
    expect(String(warn.mock.calls[0][0])).toBe("search answered untiered: classifier invalid");
  });

  it("answers untiered, not 500, when the classifier has a bug", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = await serve({ classify: async () => { throw new TypeError("boom"); } });
    await create(b, { name: "Banana" });
    const res = await fetch(`${b}/products/search?q=banana`);
    expect(res.status).toBe(200);
    expect((await res.json()).tiered).toBe(false);
    expect(String(warn.mock.calls[0][0])).toBe("search answered untiered: classifier unexpected");
  });

  it("logs nothing when no classifier is configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { server: plain, base: b } = await startServer();
    servers.push(plain);
    await create(b, { name: "Banana" });
    expect((await search(b, "banana")).tiered).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it("answers an empty tiered list without asking when nothing is in stock", async () => {
    const classify = vi.fn();
    const b = await serve({ classify });
    await create(b, { name: "Banana", quantity: 0 });
    expect(await search(b, "banana")).toEqual({ tiered: true, matches: [], related: [] });
    expect(classify).not.toHaveBeenCalled();
  });

  it("puts two offers of the same name in the same section", async () => {
    const b = await serve(scenarioClassifier);
    const one = await create(b, { name: "Banana", price: 300 });
    const two = await create(b, { name: "banana ", price: 200 });
    const body = await search(b, "banana");
    expect(body.matches.map((p: { id: number }) => p.id)).toEqual([two.id, one.id]);
  });
});
```

(The no-classifier tests from slice 1 stay as they are: `startServer()` with no classifier → untiered, an empty one included.)

- [ ] **Step 2: Run them to see them fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/products/__tests__/search-scenario.api.test.ts src/modules/products/__tests__/search-products.api.test.ts`
Expected: FAIL — `body.tiered` is false with the scenario classifier.

- [ ] **Step 3: Implement**

`types.ts`:

```ts
/** A search answer (spec § API contract). */
export type SearchResponse =
  | { tiered: true; matches: Product[]; related: Product[] }
  | { tiered: false; results: Product[] };
```

`search-products-resolver.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { ClassifierError, classifierOf } from "@/modules/relevance";
import { productsRepository } from "@/modules/products/repository";
import { UNTIERED_CAP } from "@/modules/products/search-constants";
import { searchQuerySchema } from "@/modules/products/search-schema";
import type { Product, SearchResponse } from "@/modules/products/types";
import { tierShortlist } from "@/modules/products/utils/tier-shortlist";

const untiered = (shortlist: Product[]): SearchResponse => ({
  tiered: false,
  results: shortlist.slice(0, UNTIERED_CAP),
});

export const searchProductsResolver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { q } = searchQuerySchema.parse(req.query);
    const shortlist = await productsRepository.shortlist(q);
    const classifier = classifierOf(req);
    if (!classifier) {
      res.status(200).json(untiered(shortlist));
      return;
    }
    if (shortlist.length === 0) {
      res.status(200).json({ tiered: true, matches: [], related: [] } satisfies SearchResponse);
      return;
    }
    try {
      const { matches, related } = await tierShortlist(q, shortlist, classifier);
      res.status(200).json({ tiered: true, matches, related } satisfies SearchResponse);
    } catch (err) {
      if (!(err instanceof ClassifierError)) throw err;
      // The failure kind only: never the query, never a key (spec § When Jev fails).
      console.warn(`search answered untiered: classifier ${err.kind}`);
      res.status(200).json(untiered(shortlist));
    }
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 4: Run them to see them pass**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api test && pnpm --filter api typecheck && pnpm --filter api lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): search answers in tiers, and untiered when the classifier fails"
```

---

### Task 5: The page's sections

**Files:**
- Modify: `apps/web/src/modules/products/types.ts`, `apps/web/src/modules/products/components/SearchResults.tsx`, `SearchResults.stories.tsx`

**Interfaces:**
- Consumes: the API union.
- Produces (web `types.ts`): `SearchResponse = { tiered: true; matches: Product[]; related: Product[] } | { tiered: false; results: Product[] }`.

- [ ] **Step 1: Write the failing stories** — add to `SearchResults.stories.tsx` (reuse slice 1's `product(id, shopName, name, finalPrice): Product` helper):

```ts
const cakes = [product(10, "Padaria Pão Quente", "Fatia de bolo red velvet", 800), product(7, "Hortifruti São José", "Bolo de banana", 840)];
const cakeExtras = [product(11, "Mercadinho Candelária", "Mistura para bolo de chocolate", 900)];
const names = (el: HTMLElement) => within(el).getAllByRole("article").map((a) => a.getAttribute("aria-label"));

/** Matches and related: two headed sections, each in the order given. */
export const MatchesAndRelated: Story = {
  args: { query: "bolo", response: { tiered: true, matches: cakes, related: cakeExtras } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const found = c.getByRole("heading", { name: "Encontramos 2 produtos para “bolo”" });
    const also = c.getByRole("heading", { name: "Você também pode gostar" });
    await expect(found.compareDocumentPosition(also) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect(names(canvasElement)).toEqual(["Fatia de bolo red velvet", "Bolo de banana", "Mistura para bolo de chocolate"]);
    await expect(c.queryByText(/Não conseguimos organizar/)).toBeNull();
  },
};

/** One match: the singular. */
export const OneMatch: Story = {
  args: { query: "bolo", response: { tiered: true, matches: cakes.slice(0, 1), related: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { name: "Encontramos 1 produto para “bolo”" })).toBeInTheDocument();
    await expect(c.queryByRole("heading", { name: "Você também pode gostar" })).toBeNull();
  },
};

/** No match, some related: the plain "no", then the related section. */
export const NoMatchButRelated: Story = {
  args: { query: "bolo", response: { tiered: true, matches: [], related: cakeExtras } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { name: "Não encontramos “bolo”" })).toBeInTheDocument();
    await expect(c.getByRole("heading", { name: "Você também pode gostar" })).toBeInTheDocument();
    await expect(names(canvasElement)).toEqual(["Mistura para bolo de chocolate"]);
  },
};

/** Loading or failing over a tiered answer keeps its sections and cards on screen. */
export const LoadingKeepsTieredResults: Story = {
  args: { query: "bolo", response: { tiered: true, matches: cakes, related: cakeExtras }, loading: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("status")).toHaveTextContent("Buscando…");
    await expect(c.getByRole("heading", { name: "Você também pode gostar" })).toBeInTheDocument();
    await expect(c.getAllByRole("article")).toHaveLength(3);
  },
};

export const FailedKeepsTieredResults: Story = {
  args: {
    query: "bolo",
    response: { tiered: true, matches: cakes, related: cakeExtras },
    error: "Não foi possível buscar. Tente novamente.",
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent("Não foi possível buscar. Tente novamente.");
    await expect(c.getAllByRole("article")).toHaveLength(3);
  },
};

/** Nothing at all: only the plain "no". */
export const TieredNothing: Story = {
  args: { query: "bolo", response: { tiered: true, matches: [], related: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { name: "Não encontramos “bolo”" })).toBeInTheDocument();
    await expect(c.queryByRole("heading", { name: "Você também pode gostar" })).toBeNull();
    await expect(c.queryAllByRole("article")).toHaveLength(0);
  },
};
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter web test:stories`
Expected: FAIL — type error on `tiered: true` / headings not found.

- [ ] **Step 3: Implement**

`types.ts`: widen `SearchResponse` to the union above.

`SearchResults.tsx`: after the loading and error lines, render by branch:

```tsx
import { Text, Title } from "@mantine/core";

const plural = (n: number) => (n === 1 ? "1 produto" : `${n} produtos`);

  // …inside the grid, replacing the slice-1 untiered block:
      {response?.tiered === false && (
        <>
          {settled && response.results.length === 0 && <SearchEmptyState query={query} />}
          {response.results.length > 0 && (
            <Text c="dimmed">Não conseguimos organizar os resultados por relevância</Text>
          )}
          {response.results.map((p) => (
            <SearchResultCard key={p.id} product={p} />
          ))}
        </>
      )}
      {response?.tiered === true && (
        <>
          {response.matches.length > 0 ? (
            <Title order={2} size="h4">
              Encontramos {plural(response.matches.length)} para “{query}”
            </Title>
          ) : (
            settled && <SearchEmptyState query={query} />
          )}
          {response.matches.map((p) => (
            <SearchResultCard key={p.id} product={p} />
          ))}
          {response.related.length > 0 && (
            <>
              <Title order={2} size="h4">
                Você também pode gostar
              </Title>
              {response.related.map((p) => (
                <SearchResultCard key={p.id} product={p} />
              ))}
            </>
          )}
        </>
      )}
```

Delete the slice-1 `const results = …` line; keep `settled`.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm --filter web test && pnpm --filter web test:stories && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS (slice-1 stories still pass: they use `tiered: false`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/products
git commit -m "feat(web): search shows matches and related in two headed sections"
```

---

### Task 6: E2E "bolo", `CONTEXT.md`, gates

**Files:**
- Delete: `e2e/modules/products/search-banana.test.ts`
- Create: `e2e/modules/products/search-bolo.test.ts`
- Modify: `e2e/modules/products/edit-and-delete-product.test.ts`, `e2e/playwright.config.ts`, `CONTEXT.md`

- [ ] **Step 1: Point the e2e API at the scenario classifier**

In `e2e/playwright.config.ts`, the API `env` becomes:

```ts
      // Tiers come from the search scenario's fixture, not a vendor (spec § Testing). An
      // explicit value wins over apps/api/.env, which dotenv never overrides.
      env: { PORT: String(API_PORT), DATABASE_URL: DB_URL, SEARCH_CLASSIFIER: "scenario" },
```

- [ ] **Step 2: Write the "bolo" e2e** (`search-bolo.test.ts`), replacing `search-banana.test.ts` (`git rm` it):

```ts
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { seedProduct } from "../../fixtures/seed";
import {
  EXPECTED_TIERS,
  SEARCH_SCENARIO,
  scenarioRow,
} from "../../../apps/api/src/modules/products/fixtures/search-scenario";

async function seedScenario(request: APIRequestContext) {
  for (const row of SEARCH_SCENARIO) {
    const { key: _key, ...input } = row;
    await seedProduct(request, input);
  }
}

const nameOf = (key: string) => scenarioRow(key).name;

async function searchFor(page: import("@playwright/test").Page, q: string) {
  await page.getByRole("searchbox", { name: "Nome do produto" }).fill(q);
  await page.getByRole("button", { name: "Buscar" }).click();
}

test.describe("searching for bolo", () => {
  test.beforeEach(async ({ request, page }) => {
    await seedScenario(request);
    await page.goto("/buscar");
    await expect(page.getByText("Digite o nome de um produto")).toBeVisible();
    await searchFor(page, "bolo");
    await expect(page.getByRole("heading", { name: "Encontramos 3 produtos para “bolo”" })).toBeVisible();
  });

  test("the cakes, then the related products, cheapest first, and no battery", async ({ page }) => {
    const found = page.getByRole("heading", { name: "Encontramos 3 produtos para “bolo”" });
    const also = page.getByRole("heading", { name: "Você também pode gostar" });
    await expect(also).toBeVisible();
    const order = await page
      .locator("article, h2")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? el.textContent));
    const after = (h: string) => order.indexOf(h);
    const matches = EXPECTED_TIERS.bolo.matches.map(nameOf);
    const related = EXPECTED_TIERS.bolo.related.map(nameOf);
    expect(order.filter((x) => matches.includes(x!))).toEqual(matches);
    expect(order.filter((x) => related.includes(x!))).toEqual(related);
    expect(Math.min(...related.map(after))).toBeGreaterThan(after((await also.textContent())!));
    expect(Math.max(...matches.map(after))).toBeLessThan(after((await also.textContent())!));
    expect(after((await found.textContent())!)).toBeLessThan(Math.min(...matches.map(after)));
    await expect(page.getByRole("article", { name: "Pilha AA" })).toHaveCount(0);
    await expect(page.getByText(/Não conseguimos organizar/)).toHaveCount(0);
  });

  // Relies on `retry: false` in useProductSearch: the alert must appear inside Playwright's
  // five-second expect window, not after react-query's default retries.
  test("a failed search shows an error and keeps the previous results", async ({ page }) => {
    const before = await page.getByRole("article").count();
    expect(before).toBe(5);
    await page.route("**/products/search**", (route) => route.abort());
    await searchFor(page, "maçã");
    // Scoped to the page body: Next's route announcer is a second, empty `alert` region.
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Não foi possível buscar. Tente novamente.",
    );
    await expect(page.getByRole("article")).toHaveCount(before);
  });
});

test.describe("retrying a failed search", () => {
  // "Tente novamente" means pressing Buscar again with the same text must search again.
  test("pressing Buscar again with the same text after a failure shows the results", async ({
    request,
    page,
  }) => {
    await seedScenario(request);
    await page.goto("/buscar");
    await page.route("**/products/search**", (route) => route.abort());
    await searchFor(page, "bolo");
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toHaveText("Não foi possível buscar. Tente novamente.");
    await expect(page.getByRole("article")).toHaveCount(0);

    await page.unroute("**/products/search**");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByRole("article").first()).toContainText("R$ 8,00");
  });
});
```

- [ ] **Step 3: Restore "absent from the banana results" in the rename e2e**

In `edit-and-delete-product.test.ts`, rename the first test back to `"renaming Banana to Maçã takes it out of the banana results"` and replace the slice-1 assertions after the search click with:

```ts
  await expect(page.getByRole("heading", { name: /^Encontramos/ })).toBeVisible();
  const names = await page
    .getByRole("article")
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  expect(names).not.toContain("Maçã");
  expect(names).toContain("Banana prata");
```

- [ ] **Step 4: Run the e2e suite**

Run: `E2E_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_e2e pnpm e2e`
Expected: PASS.

- [ ] **Step 5: Add the tier rules to `CONTEXT.md`**

Replace the "Same product across shops" entry under **Ubiquitous language** with:

```markdown
- **Relevance tier** — for one search, every product is a **match** (it *is* the thing
  searched for, or a kind, variety or form of it you would accept as a yes: "Banana prata"
  for banana), **related** (made from it, used with it, or plausibly wanted by someone looking
  for it: "Bananada" and "Bolo de banana" for banana; "Mistura para bolo" and "Forma de bolo"
  for bolo) or **unrelated** (everything else, never shown in a tiered answer). Bananada is
  related to banana, not a match: it is made from banana.
```

Add to **§ Search**:

```markdown
- **Tiered answer** — matches, then related; inside each, final price ascending, then id.
  Distance is reserved as the third key (issue #3). Products with the same name (after
  trimming, lowercasing and collapsing spaces, accents kept) are one question to the
  classifier and always share a tier.
- **Untiered answer** — when no classifier is configured or it fails, the first 20 of the
  shortlist, under a notice that they are not organised by relevance. It may include
  unrelated products.
```

This **Untiered answer** entry replaces slice 1's **Ranking (untiered)** entry; delete that one so the rule is stated once.

- [ ] **Step 6: Run every gate**

Run: `pnpm lint && pnpm typecheck && DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm test && pnpm test:stories && E2E_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_e2e pnpm e2e`
Expected: all PASS.

- [ ] **Step 7: Check by hand**

`pnpm --filter api seed`, add `SEARCH_CLASSIFIER=scenario` to `apps/api/.env` (turbo's strict env mode drops a shell-exported variable), then `pnpm dev`; at `/buscar`, "bolo" shows the three cakes under "Encontramos 3 produtos para “bolo”" and the mix and pan under "Você também pode gostar"; "detergente" shows "Não encontramos “detergente”". Remove the line from `apps/api/.env` afterwards.

- [ ] **Step 8: Commit**

```bash
git add -A e2e CONTEXT.md
git commit -m "test(e2e): searching bolo shows the tiers; docs(context): relevance tiers"
```

## Review decisions

- Plan review round 2: a test proves the no-classifier path logs nothing; log spies are restored in `afterEach`; stories cover loading and error over a tiered answer; `CONTEXT.md` states the untiered rule once.
- Plan review round 1: the stories reuse slice 1's `product(...)` helper by name; `classifierFromEnv` takes a `Partial` env, as its test passes `{}`.
