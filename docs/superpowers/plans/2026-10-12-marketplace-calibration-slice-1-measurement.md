# Marketplace calibration — slice 1: Jev is measured against the marketplaces — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Owns:** the measurement — the corpus seed path, the labels and example-collision checks, the `gradeCorpus` grader with its three-run / two-number / per-class / group-split gate, the rewritten `tiers:eval` (with `--show-holdout`, the slow-call re-run and the exit codes), the replacement of the one corpus-colliding example (round 0's wording), and round 0's tables in the PR body.

**Goal:** `pnpm --filter api tiers:eval` seeds the marketplace corpus, runs the whole search three times, and prints agreement, stability, per-class numbers and a PASS / FAIL / INVALID verdict measured on the hold-out terms.

**Architecture:** The corpus fixture (already on the feature branch, `marketplace-corpus.ts`) is seeded through the repository, the only write path. Two pure modules carry the logic the tests pin: `corpus-check.ts` (which criteria examples collide with a corpus or scenario name; which shortlist pairs lack a label) and `grade-corpus.ts` (the gate). The CLI `tiers-eval-cli.ts` is glue: seed, check, three runs of shortlist → one Jev call per term, grade, print. The old all-or-nothing `gradeTiers` and the filler names go away.

**Tech Stack:** Node 24, TypeScript 5.9, Vitest 4 over a real Postgres (pgvector, pg_trgm) and the in-process embedding model, tsx for the CLI, TypeSafe Jev (`jev-1.13.0`) reached only by the CLI.

**Spec:** `docs/superpowers/specs/2026-10-12-marketplace-calibration-design.md` — read § The corpus fixture, § The labels, § The eval, § The gate, § The tuning loop (the rules; the loop itself is slice 2), § Testing, § Delivery slices.

## Global Constraints

- The corpus fixture `apps/api/src/modules/products/fixtures/marketplace-corpus.ts` and the screenshots under `apps/api/test/marketplace/` are **pre-existing inputs** on the feature branch (spec § The capture). This slice reads them and never edits a label, a row or an override. A label the implementer believes is wrong is reported to the human in the PR body.
- Seeding (spec § Seeding): `TRUNCATE products`, then every `CORPUS` row in fixture order through `productsRepository.create` with `shopName = SITE_SHOP_NAME[row.site]`, `name = row.name`, `price = row.priceCents`, `quantity = 10`, `discountPercentage = 0`. No other write path.
- A **row** of the eval is one (term, distinct name) pair in that term's shortlist, names grouped by `normalizeForEmbedding` (trim, lowercase, collapse spaces, accents kept). The eval groups names itself; it does not call `tierShortlist`, which drops unrelated.
- Labels are read from `CORPUS_LABELS[term][normalizeForEmbedding(name)]`. A pair with no label fails the eval **before any Jev call** and is listed; it is never defaulted.
- Example check: every criteria example has the shape `"<product>" for "<search>"`; the quoted product, normalised, must not **equal or be contained in** any corpus name or any scenario name, normalised. Failing this also fails the eval before any Jev call. The one colliding example today, `"Pão francês" for "pão"`, becomes `"Pão sírio" for "pão"` in this slice (round 0's only edit). No other prompt wording changes in this slice.
- Gate constants live in `grade-corpus.ts`, never as flags: `AGREEMENT_FLOOR = 0.8`, `STABILITY_FLOOR = 0.8`, `LATENCY_BUDGET_MS = 1500`, `RUNS = 3`. Verdict (spec § The gate): INVALID when any Jev call failed (exit 2); PASS when not INVALID and on the hold-out group `agreement[1..3] ≥ 0.8`, `stability ≥ 0.8` and worst latency ≤ 1500 ms (exit 0); FAIL otherwise (exit 1). A check failure (unlabelled pair, example collision, missing key) prints `CHECK FAILED` and exits 3.
- Slow-call rule (spec § A slow call): a result that is FAIL only because of latency (both 80% figures met on the hold-out) is re-run once, automatically, inside the CLI; the second result stands.
- Output (spec § The eval step 5): tuning terms get a row table each; the hold-out terms get row tables **only** with `--show-holdout`; both groups get the summary (pooled and per class); then the latency line and the verdict. A failed run's column shows `—`.
- Tuning terms `banana`, `pão`, `frango`, `carne`; hold-out `uva`, `papel higiênico` (`TUNING_TERMS`, `HOLDOUT_TERMS` in the fixture).
- Jev request unchanged: `createJevClassifier({ apiKey })`, model `jev-1.13.0`, 2000 ms timeout, no retries (slice 3 of the previous feature).
- The key is never logged. `tiers:eval` needs `TYPESAFE_API_KEY` in `apps/api/.env`; the worktree's copy comes from the main checkout.
- `tiers:eval` **replaces** the products in `DATABASE_URL` (the dev database), as before.
- Local gates before the PR: `pnpm test`, `pnpm test:stories`, `pnpm e2e` (root `AGENTS.md`). API tests need `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test` on this machine.
- Delete `filler-names.ts` and its test; delete `evaluate-tiers.ts` and its test (spec § Existing tests).
- Commit style: `feat(api): …`, `test(api): …`, `chore(api): …`; one logical TDD cycle per commit; end every commit message with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

- A corpus name that appears on two pages (one listing on the Mercado Livre carne page is there twice under slightly different titles, and some chicken titles sit on both the frango and the carne Amazon pages) must produce one row per distinct normalised name per term, never two rows with the same name. → Task 4 test (duplicate offers collapse to one row).
- A Jev call that fails on the third run of the last term must still print the first two runs' answers for every term and the `—` column, and exit 2, not crash mid-table. → Task 3 test (a `null` answer grades INVALID, agreement computed over the runs that answered) and Task 5 manual check.
- A hold-out run at exactly 80.0% (for example 40 of 50 rows) passes; 79.9% fails. Rounding must not turn 39.9/50 into a pass. → Task 3 test.
- `--show-holdout` passed in the loop would leak the hold-out rows into a committed output. The flag must be the only way to print them, and the default output must contain no hold-out product name. → Task 5 test on the printer (pure) and manual check.
- The example check must catch containment, not only equality: `"Pão francês"` is inside `"Pão Francês Modelado Congelado - 260 g"`. A check that compares whole strings passes while proving nothing. → Task 2 test.

---

### Task 1: Seed the corpus through the repository

**Files:**
- Modify: `apps/api/src/db/seed.ts`
- Test: `apps/api/src/modules/products/__tests__/marketplace-corpus.api.test.ts`

**Interfaces:**
- Consumes: `CORPUS`, `SITE_SHOP_NAME` from `@/modules/products/fixtures/marketplace-corpus`; `productsRepository.create`.
- Produces: `seedMarketplaceCorpus(): Promise<void>` in `@/db/seed` — wipes products, inserts every corpus row in fixture order.

- [ ] **Step 1: Write the failing HTTP test**

```ts
// apps/api/src/modules/products/__tests__/marketplace-corpus.api.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";
import { seedMarketplaceCorpus } from "@/db/seed";
import { CORPUS, SITE_SHOP_NAME } from "@/modules/products/fixtures/marketplace-corpus";

describe("the marketplace corpus, seeded", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer()); // no classifier: untiered
  });
  afterAll(async () => {
    await stopServer(server);
  });
  beforeEach(async () => {
    await seedMarketplaceCorpus();
  });

  it("reaches a search: uva answers untiered with 20 corpus rows from both sites", async () => {
    const res = await fetch(`${base}/products/search?q=uva`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tiered: boolean;
      results: { shopName: string; name: string }[];
    };
    expect(body.tiered).toBe(false);
    expect(body.results).toHaveLength(20);
    const shops = new Set(body.results.map((p) => p.shopName));
    expect(shops.has(SITE_SHOP_NAME["amazon-now"])).toBe(true);
    expect(shops.has(SITE_SHOP_NAME["mercado-livre"])).toBe(true);
    const corpusNames = new Set(CORPUS.map((r) => r.name));
    for (const p of body.results) expect(corpusNames.has(p.name)).toBe(true);
  });

  it("holds exactly the corpus: one product per corpus row, in fixture order", async () => {
    const res = await fetch(`${base}/products`);
    const all = (await res.json()) as { id: number; name: string }[];
    expect(all).toHaveLength(CORPUS.length);
    const byId = [...all].sort((a, b) => a.id - b.id);
    expect(byId.map((p) => p.name)).toEqual(CORPUS.map((r) => r.name));
  });
});
```

`GET /products` answers a plain array (`listProductsResolver` → `productsRepository.findAll()`), newest first; the test sorts by id itself.

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/modules/products/__tests__/marketplace-corpus.api.test.ts`
Expected: FAIL — `seedMarketplaceCorpus` is not exported from `@/db/seed`.

- [ ] **Step 3: Add the seed**

```ts
// apps/api/src/db/seed.ts — add below seedSearchScenario
import { CORPUS, SITE_SHOP_NAME } from "@/modules/products/fixtures/marketplace-corpus";

/**
 * Wipes products and inserts the marketplace corpus through the one write path, in fixture
 * order (spec § Seeding): ids follow the fixture, so the shortlist's id tie-break is reproducible.
 */
export const seedMarketplaceCorpus = async (): Promise<void> => {
  await pool.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
  for (const row of CORPUS) {
    await productsRepository.create({
      shopName: SITE_SHOP_NAME[row.site],
      name: row.name,
      price: row.priceCents,
      quantity: 10,
      discountPercentage: 0,
    });
  }
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/modules/products/__tests__/marketplace-corpus.api.test.ts`
Expected: PASS (2 tests). Seeding 222 rows embeds 222 names; expect 10–30 s.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/seed.ts apps/api/src/modules/products/__tests__/marketplace-corpus.api.test.ts
git commit -m "feat(api): seed the marketplace corpus through the repository

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: The checks — example collisions and unlabelled pairs

**Files:**
- Create: `apps/api/src/modules/relevance/corpus-check.ts`
- Modify: `apps/api/src/modules/relevance/criteria.ts` (one example), `apps/api/src/modules/relevance/index.ts` (export), `apps/api/src/modules/relevance/__tests__/jev-classifier.test.ts` (remove one test)
- Test: `apps/api/src/modules/relevance/__tests__/corpus-check.test.ts`

**Interfaces:**
- Consumes: `TIER_CRITERIA`, `normalizeForEmbedding`, `CORPUS`, `CORPUS_LABELS`, `SEARCH_SCENARIO`.
- Produces (all pure, in `@/modules/relevance/corpus-check`):
  - `exampleProduct(example: string): string` — the quoted product of `"X" for "y"`; throws on any other shape.
  - `findExampleCollisions(criteria: typeof TIER_CRITERIA, names: readonly string[]): { example: string; name: string }[]` — every (example, name) where the normalised product equals or is contained in the normalised name.
  - `findUnlabelled(term: CorpusTerm, names: readonly string[], labels: typeof CORPUS_LABELS): string[]` — the names (original spelling, one per normalised key) with no label for that term.
  - `PROTECTED_NAMES: readonly string[]` — every corpus name plus every scenario name.

- [ ] **Step 1: Write the failing unit tests**

```ts
// apps/api/src/modules/relevance/__tests__/corpus-check.test.ts
import { describe, expect, it } from "vitest";
import {
  exampleProduct,
  findExampleCollisions,
  findUnlabelled,
  PROTECTED_NAMES,
} from "@/modules/relevance/corpus-check";
import { TIER_CRITERIA } from "@/modules/relevance/criteria";
import { CORPUS, CORPUS_LABELS } from "@/modules/products/fixtures/marketplace-corpus";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";

const criteriaWith = (examples: string[]) => ({
  match: { what: "", examples },
  related: { what: "", examples: [] },
  unrelated: { what: "", examples: [] },
});

describe("exampleProduct", () => {
  it("reads the quoted product of an example", () => {
    expect(exampleProduct('"Laranja pera" for "laranja"')).toBe("Laranja pera");
  });
  it("rejects an example in another shape", () => {
    expect(() => exampleProduct("Laranja pera")).toThrow(/shape/);
  });
});

describe("findExampleCollisions", () => {
  it("catches containment after normalisation, not only equality", () => {
    const hits = findExampleCollisions(criteriaWith(['"Pão francês" for "pão"']), [
      "Pão Francês Modelado Congelado - 260 g",
      "Banana prata",
    ]);
    expect(hits).toEqual([
      { example: '"Pão francês" for "pão"', name: "Pão Francês Modelado Congelado - 260 g" },
    ]);
  });
  it("keeps accents: 'maca' does not collide with 'Maçã'", () => {
    expect(findExampleCollisions(criteriaWith(['"Maca" for "maca"']), ["Maçã argentina"])).toEqual([]);
  });
  it("the current criteria collide with nothing in the corpus or the scenario", () => {
    expect(findExampleCollisions(TIER_CRITERIA, PROTECTED_NAMES)).toEqual([]);
  });
  it("PROTECTED_NAMES holds every corpus and scenario name", () => {
    expect(PROTECTED_NAMES).toHaveLength(CORPUS.length + SEARCH_SCENARIO.length);
  });
});

describe("findUnlabelled", () => {
  it("lists shortlist names without a label for the term, once per normalised name", () => {
    const labels = { ...CORPUS_LABELS, uva: { "uva crimson": "match" as const } };
    expect(findUnlabelled("uva", ["Uva Crimson", "UVA  crimson", "Kapo Uva 200ml"], labels)).toEqual([
      "Kapo Uva 200ml",
    ]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance/__tests__/corpus-check.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```ts
// apps/api/src/modules/relevance/corpus-check.ts
import { normalizeForEmbedding } from "@/modules/embeddings";
import type { TIER_CRITERIA } from "@/modules/relevance/criteria";
import type { Tier } from "@/modules/relevance/types";
import { CORPUS, type CorpusTerm } from "@/modules/products/fixtures/marketplace-corpus";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";

/** Every name the prompt's examples must stay clear of (spec § The tuning loop). */
export const PROTECTED_NAMES: readonly string[] = [
  ...CORPUS.map((r) => r.name),
  ...SEARCH_SCENARIO.map((r) => r.name),
];

const EXAMPLE_SHAPE = /^"(.+)" for ".+"$/;

/** The quoted product of an example written as `"<product>" for "<search>"`. */
export const exampleProduct = (example: string): string => {
  const m = EXAMPLE_SHAPE.exec(example);
  if (!m) throw new Error(`criteria example is not in the shape "<product>" for "<search>": ${example}`);
  return m[1];
};

/**
 * Examples whose product, normalised, equals or sits inside a protected name, normalised.
 * Containment matters: listing titles are long ("Pão Francês Modelado Congelado - 260 g").
 */
export const findExampleCollisions = (
  criteria: typeof TIER_CRITERIA,
  names: readonly string[],
): { example: string; name: string }[] => {
  const hits: { example: string; name: string }[] = [];
  const normalised = names.map((n) => [n, normalizeForEmbedding(n)] as const);
  for (const { examples } of Object.values(criteria)) {
    for (const example of examples) {
      const product = normalizeForEmbedding(exampleProduct(example));
      for (const [name, key] of normalised) if (key.includes(product)) hits.push({ example, name });
    }
  }
  return hits;
};

/** Shortlist names with no label for the term; one per normalised name, original spelling. */
export const findUnlabelled = (
  term: CorpusTerm,
  names: readonly string[],
  labels: Record<CorpusTerm, Record<string, Tier>>,
): string[] => {
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const name of names) {
    const key = normalizeForEmbedding(name);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!(key in labels[term])) missing.push(name);
  }
  return missing;
};
```

Add to `apps/api/src/modules/relevance/index.ts`:

```ts
export * from "@/modules/relevance/corpus-check";
```

- [ ] **Step 4: Run the tests; expect one failure left**

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance/__tests__/corpus-check.test.ts`
Expected: 5 pass, 1 FAIL — "the current criteria collide with nothing": `"Pão francês" for "pão"` hits two corpus names. This failure is the point: it is round 0's only edit.

- [ ] **Step 5: Replace the colliding example**

In `apps/api/src/modules/relevance/criteria.ts`, under `match.examples`, change

```ts
      '"Pão francês" for "pão"',
```

to

```ts
      '"Pão sírio" for "pão"',
```

Nothing else in the file changes.

- [ ] **Step 6: Run the tests; all pass**

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance/__tests__/corpus-check.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 7: Retire the old scenario-only example test**

In `apps/api/src/modules/relevance/__tests__/jev-classifier.test.ts`, delete the whole `it("keeps the scenario's names out of the criteria examples", …)` block (the last test in the file). The new check covers the scenario and the corpus, normalised, by containment.

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance/__tests__/jev-classifier.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/relevance/corpus-check.ts apps/api/src/modules/relevance/index.ts apps/api/src/modules/relevance/criteria.ts apps/api/src/modules/relevance/__tests__/corpus-check.test.ts apps/api/src/modules/relevance/__tests__/jev-classifier.test.ts
git commit -m "feat(api): example-collision and unlabelled-pair checks; replace the one colliding example

\"Pão francês\" sits inside two corpus titles; round 0's wording says \"Pão sírio\".

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: The grader

**Files:**
- Create: `apps/api/src/modules/relevance/grade-corpus.ts`
- Delete: `apps/api/src/modules/relevance/evaluate-tiers.ts`, `apps/api/src/modules/relevance/__tests__/evaluate-tiers.test.ts`, `apps/api/src/modules/products/fixtures/filler-names.ts`
- Test: `apps/api/src/modules/relevance/__tests__/grade-corpus.test.ts`

**Interfaces:**
- Consumes: `Tier`, `CorpusTerm`, `TUNING_TERMS`, `HOLDOUT_TERMS`.
- Produces (pure, `@/modules/relevance/grade-corpus`):

```ts
export const RUNS = 3;
export const AGREEMENT_FLOOR = 0.8;
export const STABILITY_FLOOR = 0.8;
export const LATENCY_BUDGET_MS = 1500;

export type Answers = [Tier | null, Tier | null, Tier | null]; // null = that run's call failed
export interface CorpusEvalRow { term: CorpusTerm; name: string; label: Tier; got: Answers }
export interface ClassSummary { rows: number; agreement: [number, number, number] }
export interface GroupSummary {
  rows: number;
  agreement: [number, number, number]; // fraction of rows right in run 1, 2, 3
  stability: number;                   // fraction of rows with one tier across all runs
  byClass: Record<Tier, ClassSummary>;
}
export type Verdict = "PASS" | "FAIL" | "INVALID";
export interface CorpusGrade {
  verdict: Verdict;
  latencyOnly: boolean;  // FAIL only because worstMs > budget (both floors met)
  worstMs: number;
  tuning: GroupSummary;
  holdout: GroupSummary;
}
export const gradeCorpus = (rows: CorpusEvalRow[], latenciesMs: number[]): CorpusGrade;
```

- [ ] **Step 1: Delete the old grader, its test and the filler names**

```bash
git rm apps/api/src/modules/relevance/evaluate-tiers.ts apps/api/src/modules/relevance/__tests__/evaluate-tiers.test.ts apps/api/src/modules/products/fixtures/filler-names.ts
```

`tiers-eval-cli.ts` still imports them; it is rewritten in Task 5. Until then `pnpm typecheck` fails on that one file; that is expected and the reason Tasks 3–5 are committed in sequence, not pushed separately.

- [ ] **Step 2: Write the failing unit tests**

```ts
// apps/api/src/modules/relevance/__tests__/grade-corpus.test.ts
import { describe, expect, it } from "vitest";
import {
  AGREEMENT_FLOOR,
  gradeCorpus,
  LATENCY_BUDGET_MS,
  STABILITY_FLOOR,
  type Answers,
  type CorpusEvalRow,
} from "@/modules/relevance/grade-corpus";
import type { Tier } from "@/modules/relevance/types";
import type { CorpusTerm } from "@/modules/products/fixtures/marketplace-corpus";

const row = (term: CorpusTerm, label: Tier, got: Answers, i: number): CorpusEvalRow => ({
  term,
  name: `${term} ${label} ${i}`,
  label,
  got,
});
/** n hold-out rows that are right in every run, m that are wrong in every run. */
const holdout = (right: number, wrong: number): CorpusEvalRow[] => [
  ...Array.from({ length: right }, (_, i) => row("uva", "match", ["match", "match", "match"], i)),
  ...Array.from({ length: wrong }, (_, i) =>
    row("papel higiênico", "match", ["related", "related", "related"], i),
  ),
];
const tuning = (): CorpusEvalRow[] => [row("banana", "match", ["match", "match", "match"], 0)];

describe("gradeCorpus", () => {
  it("passes at exactly 80% agreement in every run and 80% stability", () => {
    const g = gradeCorpus([...tuning(), ...holdout(40, 10)], [400]);
    expect(g.holdout.agreement).toEqual([0.8, 0.8, 0.8]);
    expect(g.holdout.stability).toBe(1);
    expect(g.verdict).toBe("PASS");
  });

  it("fails at 39 of 50 (78%) in one run, even when the other two runs pass", () => {
    const rows = [...tuning(), ...holdout(40, 10)];
    rows[1] = { ...rows[1], got: ["related", "match", "match"] }; // run 1 drops to 39/50
    const g = gradeCorpus(rows, [400]);
    expect(g.holdout.agreement[0]).toBeCloseTo(0.78, 5);
    expect(g.verdict).toBe("FAIL");
    expect(g.latencyOnly).toBe(false);
  });

  it("fails on stability below 80% even when every run agrees at 80% or more", () => {
    // 50 rows, all labels match: each run has 45 right, but the wrong rows rotate, so
    // 15 rows flip somewhere → stability 35/50 = 70%.
    const rows: CorpusEvalRow[] = Array.from({ length: 50 }, (_, i) => {
      const got: Answers =
        i < 5 ? ["related", "match", "match"]
        : i < 10 ? ["match", "related", "match"]
        : i < 15 ? ["match", "match", "related"]
        : ["match", "match", "match"];
      return row("uva", "match", got, i);
    });
    const g = gradeCorpus(rows, [400]);
    expect(g.holdout.agreement).toEqual([0.9, 0.9, 0.9]);
    expect(g.holdout.stability).toBe(0.7);
    expect(g.verdict).toBe("FAIL");
  });

  it("a tuning group below 80% does not fail the gate", () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => row("banana", "match", ["related", "related", "related"], i)),
      ...holdout(50, 0),
    ];
    const g = gradeCorpus(rows, [400]);
    expect(g.tuning.agreement).toEqual([0, 0, 0]);
    expect(g.verdict).toBe("PASS");
  });

  it("a failed call makes the result INVALID, not FAIL, and grades the runs that answered", () => {
    const rows = holdout(50, 0);
    rows[0] = { ...rows[0], got: ["match", "match", null] };
    const g = gradeCorpus(rows, [400]);
    expect(g.verdict).toBe("INVALID");
    expect(g.holdout.agreement[0]).toBe(1);
    expect(g.holdout.agreement[2]).toBeCloseTo(49 / 50, 5);
  });

  it("a slow call alone fails, and says so", () => {
    const g = gradeCorpus(holdout(50, 0), [400, LATENCY_BUDGET_MS + 1]);
    expect(g.verdict).toBe("FAIL");
    expect(g.latencyOnly).toBe(true);
    expect(g.worstMs).toBe(LATENCY_BUDGET_MS + 1);
  });

  it("latency at exactly the budget passes", () => {
    expect(gradeCorpus(holdout(50, 0), [LATENCY_BUDGET_MS]).verdict).toBe("PASS");
  });

  it("reports per-class rows and agreement for the classes present", () => {
    const rows = [
      ...holdout(4, 0), // 4 match rows, all right
      row("uva", "related", ["related", "unrelated", "related"], 0),
      row("uva", "unrelated", ["unrelated", "unrelated", "unrelated"], 0),
    ];
    const g = gradeCorpus(rows, [100]);
    expect(g.holdout.byClass.match).toEqual({ rows: 4, agreement: [1, 1, 1] });
    expect(g.holdout.byClass.related).toEqual({ rows: 1, agreement: [1, 0, 1] });
    expect(g.holdout.byClass.unrelated).toEqual({ rows: 1, agreement: [1, 1, 1] });
    expect(g.tuning.byClass.match).toEqual({ rows: 0, agreement: [0, 0, 0] });
  });

  it("pins the gate constants", () => {
    expect(AGREEMENT_FLOOR).toBe(0.8);
    expect(STABILITY_FLOOR).toBe(0.8);
    expect(LATENCY_BUDGET_MS).toBe(1500);
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance/__tests__/grade-corpus.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the grader**

```ts
// apps/api/src/modules/relevance/grade-corpus.ts
import type { Tier } from "@/modules/relevance/types";
import { HOLDOUT_TERMS, type CorpusTerm } from "@/modules/products/fixtures/marketplace-corpus";

/** The gate (spec § The gate). Constants, not flags: changing the bar is a design change. */
export const RUNS = 3;
export const AGREEMENT_FLOOR = 0.8;
export const STABILITY_FLOOR = 0.8;
export const LATENCY_BUDGET_MS = 1500;

/** One tier per run; `null` when that run's Jev call failed for the row's term. */
export type Answers = [Tier | null, Tier | null, Tier | null];

export interface CorpusEvalRow {
  term: CorpusTerm;
  name: string;
  label: Tier;
  got: Answers;
}

export interface ClassSummary {
  rows: number;
  agreement: [number, number, number];
}

export interface GroupSummary {
  rows: number;
  /** Fraction of rows whose tier equals the label, per run. */
  agreement: [number, number, number];
  /** Fraction of rows with the same tier in all runs. */
  stability: number;
  byClass: Record<Tier, ClassSummary>;
}

export type Verdict = "PASS" | "FAIL" | "INVALID";

export interface CorpusGrade {
  verdict: Verdict;
  /** FAIL only because of latency: both floors met on the hold-out (spec § A slow call). */
  latencyOnly: boolean;
  worstMs: number;
  tuning: GroupSummary;
  holdout: GroupSummary;
}

const TIERS: readonly Tier[] = ["match", "related", "unrelated"];
const ratio = (n: number, d: number) => (d === 0 ? 0 : n / d);

const agreementOf = (rows: CorpusEvalRow[]): [number, number, number] =>
  [0, 1, 2].map((run) => ratio(rows.filter((r) => r.got[run] === r.label).length, rows.length)) as [
    number,
    number,
    number,
  ];

const summarise = (rows: CorpusEvalRow[]): GroupSummary => ({
  rows: rows.length,
  agreement: agreementOf(rows),
  stability: ratio(
    rows.filter((r) => r.got[0] !== null && r.got.every((t) => t === r.got[0])).length,
    rows.length,
  ),
  byClass: Object.fromEntries(
    TIERS.map((tier) => {
      const ofClass = rows.filter((r) => r.label === tier);
      return [tier, { rows: ofClass.length, agreement: agreementOf(ofClass) }];
    }),
  ) as Record<Tier, ClassSummary>,
});

/** Grades three runs over the corpus; the verdict is decided on the hold-out terms only. */
export const gradeCorpus = (rows: CorpusEvalRow[], latenciesMs: number[]): CorpusGrade => {
  const isHoldout = (r: CorpusEvalRow) => HOLDOUT_TERMS.includes(r.term);
  const holdout = summarise(rows.filter(isHoldout));
  const tuning = summarise(rows.filter((r) => !isHoldout(r)));
  const worstMs = Math.max(0, ...latenciesMs);
  const anyFailed = rows.some((r) => r.got.some((t) => t === null));
  const floorsMet =
    holdout.agreement.every((a) => a >= AGREEMENT_FLOOR) && holdout.stability >= STABILITY_FLOOR;
  const withinBudget = worstMs <= LATENCY_BUDGET_MS;
  const verdict: Verdict = anyFailed ? "INVALID" : floorsMet && withinBudget ? "PASS" : "FAIL";
  return {
    verdict,
    latencyOnly: verdict === "FAIL" && floorsMet && !withinBudget,
    worstMs,
    tuning,
    holdout,
  };
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance/__tests__/grade-corpus.test.ts`
Expected: PASS (9 tests). If the "exactly 80%" test fails on floating point, compare with `toBeCloseTo(0.8, 10)`; the gate itself compares fractions, and 40/50 is exactly 0.8 in binary.

- [ ] **Step 6: Commit**

```bash
git add -A apps/api/src/modules/relevance apps/api/src/modules/products/fixtures/filler-names.ts
git commit -m "feat(api): gradeCorpus — three runs, agreement and stability floors, per-class summary

Replaces the all-or-nothing gradeTiers; the filler names lose their last user.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: The drift check — every shortlist pair has a label

**Files:**
- Test: `apps/api/src/modules/products/__tests__/marketplace-corpus.repository.test.ts`

**Interfaces:**
- Consumes: `seedMarketplaceCorpus`, `productsRepository.shortlist`, `findUnlabelled`, `CORPUS_LABELS`, `CORPUS_PAGES`.
- Produces: nothing new. This task pins the fixture to the shortlist; a later model or shortlist change that moves a boundary fails here, without a Jev key.

- [ ] **Step 1: Write the test**

```ts
// apps/api/src/modules/products/__tests__/marketplace-corpus.repository.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { seedMarketplaceCorpus } from "@/db/seed";
import { normalizeForEmbedding } from "@/modules/embeddings";
import { findUnlabelled } from "@/modules/relevance/corpus-check";
import {
  CORPUS_LABELS,
  CORPUS_PAGES,
  type CorpusTerm,
} from "@/modules/products/fixtures/marketplace-corpus";
import { productsRepository } from "@/modules/products/repository";

const TERMS = [...new Set(CORPUS_PAGES.map((p) => p.term))] as CorpusTerm[];

describe("the marketplace corpus labels cover every shortlist pair", () => {
  // The global setup truncates products before every test, so seed before each one.
  beforeEach(async () => {
    await seedMarketplaceCorpus();
  });

  it.each(TERMS)("%s: every (term, name) in the 50-row shortlist has a label", async (term) => {
    const shortlist = await productsRepository.shortlist(term);
    expect(shortlist).toHaveLength(50);
    expect(findUnlabelled(term, shortlist.map((p) => p.name), CORPUS_LABELS)).toEqual([]);
  });

  it("carne: two offers with the same title are one labelled row", async () => {
    const shortlist = await productsRepository.shortlist("carne");
    const keys = shortlist.map((p) => normalizeForEmbedding(p.name));
    expect(keys.length).toBeGreaterThan(new Set(keys).size); // the Mercado Livre cestas repeat
    expect(findUnlabelled("carne", shortlist.map((p) => p.name), CORPUS_LABELS)).toEqual([]);
  });

  it("every label refers to a corpus name", async () => {
    const { CORPUS } = await import("@/modules/products/fixtures/marketplace-corpus");
    const keys = new Set(CORPUS.map((r) => normalizeForEmbedding(r.name)));
    for (const term of TERMS)
      for (const key of Object.keys(CORPUS_LABELS[term])) expect(keys.has(key)).toBe(true);
  });
});
```

Seeding 222 rows takes 10–30 s; eight seeds is acceptable for a suite that already loads a model. If it is too slow on CI, collapse the `it.each` into one `it` that loops over `TERMS`, keeping every assertion.

- [ ] **Step 2: Run it to verify it passes against the approved fixture**

Run: `cd apps/api && pnpm exec vitest run src/modules/products/__tests__/marketplace-corpus.repository.test.ts`
Expected: PASS (8 tests). If any term reports unlabelled names, the fixture and the shortlist have drifted since the labelling run of 2026-10-12: **stop and report the names to the human**; do not add labels.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/products/__tests__/marketplace-corpus.repository.test.ts
git commit -m "test(api): every corpus shortlist pair has an approved label

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `tiers:eval` over the corpus

**Files:**
- Create: `apps/api/src/modules/relevance/print-corpus-grade.ts`
- Modify: `apps/api/src/db/tiers-eval-cli.ts` (rewrite)
- Test: `apps/api/src/modules/relevance/__tests__/print-corpus-grade.test.ts`

**Interfaces:**
- Consumes: everything above plus `createJevClassifier`, `ClassifierError`, `env.TYPESAFE_API_KEY`.
- Produces: `renderCorpusReport(rows: CorpusEvalRow[], grade: CorpusGrade, opts: { showHoldout: boolean }): string` and `HOLDOUT_MARKER = "<!-- hold-out rows -->"` (pure) in `@/modules/relevance/print-corpus-grade`; the CLI `pnpm --filter api tiers:eval [--show-holdout]` with exit codes 0 PASS, 1 FAIL, 2 INVALID, 3 CHECK FAILED; the committed `apps/api/test/marketplace/rounds/round-0.md` (the report above the marker), which slice 2 reads as its baseline.

- [ ] **Step 1: Write the failing printer test**

```ts
// apps/api/src/modules/relevance/__tests__/print-corpus-grade.test.ts
import { describe, expect, it } from "vitest";
import { gradeCorpus, type CorpusEvalRow } from "@/modules/relevance/grade-corpus";
import { HOLDOUT_MARKER, renderCorpusReport } from "@/modules/relevance/print-corpus-grade";

const rows: CorpusEvalRow[] = [
  { term: "banana", name: "Banana Prata - 1 Und", label: "match", got: ["match", "match", "match"] },
  { term: "uva", name: "Uva Crimson", label: "match", got: ["match", "related", null] },
  { term: "papel higiênico", name: "Neve Supreme 16 rolos", label: "match", got: ["match", "match", "match"] },
];

describe("renderCorpusReport", () => {
  it("prints tuning rows and hides hold-out rows by default", () => {
    const out = renderCorpusReport(rows, gradeCorpus(rows, [300]), { showHoldout: false });
    expect(out).toContain("Banana Prata - 1 Und");
    expect(out).not.toContain("Uva Crimson");
    expect(out).not.toContain("Neve Supreme");
    expect(out).toContain("hold-out rows hidden (--show-holdout)");
  });

  it("prints hold-out rows with --show-holdout, after the marker, a failed run as —", () => {
    const out = renderCorpusReport(rows, gradeCorpus(rows, [300]), { showHoldout: true });
    const [above, below] = out.split(HOLDOUT_MARKER);
    expect(above).not.toContain("Uva Crimson");
    expect(above).toContain("INVALID"); // the verdict is above the marker
    expect(below).toContain("| Uva Crimson | match | match | related | — | no |");
    expect(below).toContain("Neve Supreme 16 rolos");
  });

  it("prints both group summaries with per-class lines, the latency line and the verdict", () => {
    const out = renderCorpusReport(rows, gradeCorpus(rows, [300]), { showHoldout: false });
    expect(out).toContain("## tuning (1 rows)");
    expect(out).toContain("## hold-out (2 rows)");
    expect(out).toMatch(/\| match \| 2 \| 100% \| 50% \| 50% \|/); // hold-out, class match
    expect(out).toContain("worst latency 300 ms (budget 1500)");
    expect(out).toContain("INVALID");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance/__tests__/print-corpus-grade.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the printer**

```ts
// apps/api/src/modules/relevance/print-corpus-grade.ts
import {
  HOLDOUT_TERMS,
  TUNING_TERMS,
  type CorpusTerm,
} from "@/modules/products/fixtures/marketplace-corpus";
import {
  LATENCY_BUDGET_MS,
  type CorpusEvalRow,
  type CorpusGrade,
  type GroupSummary,
} from "@/modules/relevance/grade-corpus";
import type { Tier } from "@/modules/relevance/types";

const pct = (f: number) => `${Math.round(f * 100)}%`;
const cell = (t: Tier | null) => t ?? "—";

const rowTable = (term: CorpusTerm, rows: CorpusEvalRow[]): string =>
  [
    `### ${term} (${rows.length} rows)`,
    "| product | label | run 1 | run 2 | run 3 | stable |",
    "|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.name} | ${r.label} | ${cell(r.got[0])} | ${cell(r.got[1])} | ${cell(r.got[2])} | ${
          r.got[0] !== null && r.got.every((t) => t === r.got[0]) ? "yes" : "no"
        } |`,
    ),
    "",
  ].join("\n");

const summaryTable = (title: string, g: GroupSummary): string =>
  [
    `## ${title} (${g.rows} rows)`,
    "| class | rows | run 1 | run 2 | run 3 |",
    "|---|---|---|---|---|",
    `| pooled | ${g.rows} | ${g.agreement.map(pct).join(" | ")} |`,
    ...(["match", "related", "unrelated"] as const).map(
      (tier) => `| ${tier} | ${g.byClass[tier].rows} | ${g.byClass[tier].agreement.map(pct).join(" | ")} |`,
    ),
    `stability ${pct(g.stability)}`,
    "",
  ].join("\n");

/** Everything below this line is hold-out row tables; a committed round file stops above it. */
export const HOLDOUT_MARKER = "<!-- hold-out rows -->";

/**
 * The eval's output (spec § The eval step 5): tuning row tables, both summaries, latency,
 * verdict. Hold-out row tables only on request, and then only AFTER the marker, so the part
 * above the marker is always safe to commit.
 */
export const renderCorpusReport = (
  rows: CorpusEvalRow[],
  grade: CorpusGrade,
  { showHoldout }: { showHoldout: boolean },
): string => {
  const byTerm = (term: CorpusTerm) => rows.filter((r) => r.term === term);
  const parts: string[] = [];
  for (const term of TUNING_TERMS) parts.push(rowTable(term, byTerm(term)));
  parts.push(summaryTable("tuning", grade.tuning));
  parts.push(summaryTable("hold-out", grade.holdout));
  parts.push(`worst latency ${grade.worstMs} ms (budget ${LATENCY_BUDGET_MS}) · model jev-1.13.0`);
  parts.push(grade.verdict + (grade.latencyOnly ? " (latency only)" : ""));
  if (showHoldout) {
    parts.push("", HOLDOUT_MARKER, "");
    for (const term of HOLDOUT_TERMS) parts.push(rowTable(term, byTerm(term)));
  } else parts.push("", "hold-out rows hidden (--show-holdout)");
  return parts.join("\n");
};
```

- [ ] **Step 4: Run the printer test to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance/__tests__/print-corpus-grade.test.ts`
Expected: PASS (3 tests). If the per-class regex misses because of column spacing, align the test to the exact line the printer emits for `| match | 2 | 100% | 50% | 50% |`; the content, not the spacing, is the contract.

- [ ] **Step 5: Rewrite the CLI**

```ts
// apps/api/src/db/tiers-eval-cli.ts
import "dotenv/config";
import { pool } from "@/db/client";
import { seedMarketplaceCorpus } from "@/db/seed";
import { env } from "@/config/env";
import { loadEmbeddingModel, normalizeForEmbedding } from "@/modules/embeddings";
import {
  ClassifierError,
  createJevClassifier,
  findExampleCollisions,
  findUnlabelled,
  PROTECTED_NAMES,
  TIER_CRITERIA,
  type Candidate,
  type Tier,
} from "@/modules/relevance";
import { gradeCorpus, RUNS, type Answers, type CorpusEvalRow } from "@/modules/relevance/grade-corpus";
import { renderCorpusReport } from "@/modules/relevance/print-corpus-grade";
import {
  CORPUS_LABELS,
  CORPUS_PAGES,
  type CorpusTerm,
} from "@/modules/products/fixtures/marketplace-corpus";
import { productsRepository } from "@/modules/products/repository";

// Grades real Jev on the marketplace corpus (spec § The eval). REPLACES the products in
// DATABASE_URL with the corpus. Exit: 0 PASS · 1 FAIL · 2 INVALID · 3 CHECK FAILED.
// --show-holdout prints the hold-out row tables; the tuning loop never passes it.
const showHoldout = process.argv.includes("--show-holdout");
const checkFailed = (why: string): never => {
  console.log(`CHECK FAILED — ${why}`);
  process.exit(3);
};

if (!env.TYPESAFE_API_KEY) checkFailed("tiers:eval needs TYPESAFE_API_KEY in apps/api/.env");
const jev = createJevClassifier({ apiKey: env.TYPESAFE_API_KEY! });

const collisions = findExampleCollisions(TIER_CRITERIA, PROTECTED_NAMES);
if (collisions.length)
  checkFailed(
    `criteria examples reuse protected names:\n${collisions.map((c) => `  ${c.example} ⊂ ${c.name}`).join("\n")}`,
  );

await loadEmbeddingModel();
await seedMarketplaceCorpus();

// One question per distinct name (CONTEXT.md § Tiered answer); grouped here, not by tierShortlist.
const terms = [...new Set(CORPUS_PAGES.map((p) => p.term))] as CorpusTerm[];
const perTerm = new Map<CorpusTerm, { candidates: Candidate[]; labels: Tier[] }>();
const missing: string[] = [];
for (const term of terms) {
  const shortlist = await productsRepository.shortlist(term);
  const names = shortlist.map((p) => p.name);
  missing.push(...findUnlabelled(term, names, CORPUS_LABELS).map((n) => `  ${term} | ${n}`));
  const seen = new Map<string, Candidate>();
  for (const p of shortlist) {
    const key = normalizeForEmbedding(p.name);
    if (!seen.has(key)) seen.set(key, { id: p.id, name: p.name });
  }
  const candidates = [...seen.values()];
  perTerm.set(term, {
    candidates,
    labels: candidates.map((c) => CORPUS_LABELS[term][normalizeForEmbedding(c.name)]),
  });
}
if (missing.length) checkFailed(`unlabelled shortlist pairs (never defaulted):\n${missing.join("\n")}`);

const timed = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
  const t = performance.now();
  const out = await fn();
  return [out, Math.round(performance.now() - t)];
};

const runEval = async () => {
  const answers = new Map<CorpusTerm, Map<number, Tier | null>[]>();
  const latencies: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    for (const term of terms) {
      const { candidates } = perTerm.get(term)!;
      const runs = answers.get(term) ?? [];
      try {
        const [tiers, ms] = await timed(() => jev.classify(term, candidates));
        latencies.push(ms);
        runs.push(tiers);
        console.error(`run ${run + 1} · ${term}: ${candidates.length} questions in ${ms} ms`);
      } catch (err) {
        const kind = err instanceof ClassifierError ? err.kind : "unexpected";
        console.error(`run ${run + 1} · ${term}: FAILED (${kind})`);
        runs.push(new Map(candidates.map((c) => [c.id, null])));
      }
      answers.set(term, runs);
    }
  }
  const rows: CorpusEvalRow[] = [];
  for (const term of terms) {
    const { candidates, labels } = perTerm.get(term)!;
    const runs = answers.get(term)!;
    candidates.forEach((c, i) => {
      rows.push({
        term,
        name: c.name,
        label: labels[i],
        got: runs.map((r) => r.get(c.id) ?? null) as Answers,
      });
    });
  }
  return { rows, grade: gradeCorpus(rows, latencies) };
};

let result = await runEval();
if (result.grade.latencyOnly) {
  console.error("slow call only (both floors met) — re-running once, per spec § A slow call");
  result = await runEval();
}
console.log(renderCorpusReport(result.rows, result.grade, { showHoldout }));
await pool.end();
process.exit({ PASS: 0, FAIL: 1, INVALID: 2 }[result.grade.verdict]);
```

Progress lines go to stderr so the stdout report can be pasted into a PR body on its own. `env.TYPESAFE_API_KEY!` is safe after the `checkFailed` call, which never returns; if the linter objects to the non-null assertion, bind `const apiKey = env.TYPESAFE_API_KEY; if (!apiKey) checkFailed(…)` and use `apiKey`.

- [ ] **Step 6: Typecheck and lint the whole API**

Run: `cd apps/api && pnpm typecheck && pnpm lint`
Expected: clean. The old imports (`gradeTiers`, `FILLER_NAMES`, `EXPECTED_TIERS`, `seedSearchScenario`) are gone from the CLI; `seedSearchScenario` is still used by `seed-cli.ts` and the tests.

- [ ] **Step 7: Run the full API suite**

Run: `cd apps/api && pnpm test`
Expected: PASS. The suite does not call Jev.

- [ ] **Step 8: Commit the CLI**

```bash
git add apps/api/src/db/tiers-eval-cli.ts apps/api/src/modules/relevance/print-corpus-grade.ts apps/api/src/modules/relevance/__tests__/print-corpus-grade.test.ts
git commit -m "feat(api): tiers:eval grades Jev on the marketplace corpus, three runs, hold-out gate

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 9: Run the eval for real — round 0, once**

Run:

```bash
mkdir -p apps/api/test/marketplace/rounds
pnpm --filter api tiers:eval --show-holdout > /tmp/round-0-full.md; echo "exit $?"
sed '/<!-- hold-out rows -->/,$d' /tmp/round-0-full.md > apps/api/test/marketplace/rounds/round-0.md
grep -c "Uva Crimson" apps/api/test/marketplace/rounds/round-0.md
```

Expected: the checks pass (no collisions, no unlabelled pairs), 18 progress lines on stderr, and `/tmp/round-0-full.md` holds four tuning row tables, two summaries, the latency line, the verdict, the marker, then the two hold-out row tables. The `grep -c` prints `0`: the committed copy stops above the marker. Any exit code 0, 1 or 2 is a valid round 0. Exit 3 means a check failed: report to the human, do not edit the fixture. INVALID (exit 2): re-run the whole command once; if INVALID again, report the failure kinds to the human.

Run this once. Round 0 is one noisy sample by design (spec § The tuning loop); slice 2 reuses this file as its baseline and never re-runs round 0.

- [ ] **Step 10: Commit round 0**

```bash
git add apps/api/test/marketplace/rounds/round-0.md
git commit -m "chore(api): round 0 of the corpus eval (today's wording, Pão sírio example)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Keep `/tmp/round-0-full.md`: Task 6 pastes it into the PR body.

---

### Task 6: Local gates and the PR body

**Files:**
- None new. The PR body carries round 0.

- [ ] **Step 1: Run the mandated gates from the repository root**

Run: `pnpm test && pnpm test:stories && pnpm e2e`
Expected: all green. The web and e2e suites are untouched by this slice; they run because `AGENTS.md` says every PR runs them.

- [ ] **Step 2: Draft the PR body** (the orchestrator opens the PR; this is its content)

```
Plan: docs/superpowers/plans/2026-10-12-marketplace-calibration-slice-1-measurement.md

**What** — The real-Jev check now grades the classifier against what two marketplaces answer for six grocery searches, instead of against fourteen invented names. It runs three times and reports how often Jev agrees with the approved labels and how often it gives the same answer every time, with a pass mark of 80% on two searches it is never tuned on.

**Why** — The previous check required all 28 rows right in one run, and Jev's wrong rows changed from run to run, so nobody could tell a better prompt from noise.

**How** — The marketplace listings and their approved labels are a fixture already on the feature branch; this slice seeds them, checks that every shortlisted product has a label and that no prompt example copies a listing, asks Jev three times per search, and prints the tables. The hold-out searches' rows are printed only on request so the tuning loop (next slice) cannot see them. One prompt example ("Pão francês") was replaced because it appears inside two listing titles.

## Round 0 (today's wording, "Pão sírio" example)

<paste /tmp/round-0-full.md here, in full, including the hold-out row tables below the marker; the committed apps/api/test/marketplace/rounds/round-0.md is the same report without them>

## Review decisions
<filled by /implement-stack from the slice review>
```
