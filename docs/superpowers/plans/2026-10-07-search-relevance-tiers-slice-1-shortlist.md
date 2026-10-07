# Search relevance tiers — slice 1: search finds by word and by meaning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Reviewed:** round 1 (2026-10-07) · round 2 (2026-10-07).
**Owns:** the no-cutoff shortlist — fuzzy (pg_trgm on `search_name`) and meaning (pgvector) lists interleaved into 50 — served untiered as `{ tiered: false, results }` (top 20), with the page's untiered state.

**Goal:** Replace the 0.57 similarity cutoff with a two-list shortlist, so "bolo" finds every cake product and "acucar" finds "Açúcar refinado", served as one untiered list under a notice.

**Architecture:** A new `search_name` column (accent-stripped normalised name, written by the repository beside the vector) feeds a trigram list; the existing vector feeds a meaning list. Each list takes its 50 closest in-stock rows with no cutoff; the repository interleaves them (fuzzy 1, meaning 1, fuzzy 2, …), skipping duplicates. The search route answers the first 20 as `{ tiered: false, results }`; the page shows them under "Não conseguimos organizar os resultados por relevância".

**Tech Stack:** Node 24, Express 5, drizzle-orm 0.45 / drizzle-kit 0.31, Postgres 16 + pgvector 0.8 + pg_trgm, Vitest 4; Next.js 16, Mantine, Storybook (`play()`), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-search-relevance-tiers-design.md` — read § The flow, § Merge (interleave), § Normalisation, § Data, § API contract, § The scenario, § Testing, § Existing tests.

## Global Constraints

- No cutoff anywhere: the fuzzy list orders by `<<->` distance and never filters with `%`/`<%`; the meaning list has no similarity floor.
- Each list orders by its distance ascending, then `id` ascending. List size 50, shortlist size 50, untiered cap 20 — one constants module.
- Zero-stock products (`quantity = 0`) never enter either list.
- `normalizeForSearch(text)` = `normalizeForEmbedding(text)` then NFD + remove combining marks (`/\p{M}/gu`). The query and `search_name` both go through it. The vector keeps the accented name (`normalizeForEmbedding`).
- The repository stays the only write path: `create` and a rename (normalised name changed) write `embedding` and `search_name` together; a price/quantity/discount-only update writes neither.
- `search_name` is never in the API response and never accepted from a client.
- `SEARCH_SIMILARITY_THRESHOLD` is removed everywhere (env schema, its tests, `vitest.config.ts`, both `.env.example` files, `e2e/playwright.config.ts`, `CONTEXT.md`); `similarity-table-cli.ts` and the `similarity` script are deleted. `similarity` disappears from search results.
- Copy (pt-BR, exact): notice "Não conseguimos organizar os resultados por relevância"; empty state heading "Não encontramos “<q>”" (curly quotes).
- Local gates before the PR (root `AGENTS.md`): `pnpm test`, `pnpm test:stories`, `pnpm e2e`, plus `pnpm lint` and `pnpm typecheck`.
- **This machine:** Postgres for this repo listens on **5433** (5432 is another project). Run API tests with `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test` and e2e with `E2E_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_e2e`. CI uses 5432 and needs no change.
- **File-count tripwire crossed (~35 files):** the API contract change (`SearchResult[]` → `{ tiered, results }`) forces the web types, components, stories and both search e2e files into the same slice, and the fixture rename touches every importer. Splitting would leave the web or e2e red between merges — a horizontal split.

## Review Focus

- A query that is only accents or punctuation ("ç", "!!!") must still answer 200 with an untiered list, never a 500 from an empty `search_name` operand. → Task 5 test.
- Two offers with the same name both appear in the untiered list (duplicates are two offers). → Task 4 test.
- A product renamed from "Maca" to "Maçã" (same `search_name`, different accented name) must re-embed, and its `search_name` stays `maca`. → Task 3 test.
- A name with leading/trailing tabs or newlines backfills to the same `search_name` the repository would write. → Task 3 test (backfill function vs `normalizeForSearch`).
- A catalogue with more in-stock rows than the 50-row list size still answers in interleave order and never more than 20. → Task 5 test (cap test uses 25 rows; the 50 limit is exercised by Task 4's size parameter).

---

### Task 1: `normalizeForSearch`

**Files:**
- Create: `apps/api/src/modules/products/utils/normalize-for-search.ts`
- Test: `apps/api/src/modules/products/__tests__/normalize-for-search.test.ts`

**Interfaces:**
- Consumes: `normalizeForEmbedding(text: string): string` from `@/modules/embeddings`.
- Produces: `normalizeForSearch(text: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { normalizeForSearch } from "@/modules/products/utils/normalize-for-search";

describe("normalizeForSearch", () => {
  it("trims, lowercases and collapses whitespace like the embedding normalisation", () => {
    expect(normalizeForSearch("  Banana   Prata ")).toBe("banana prata");
    expect(normalizeForSearch("BANANA\tnanica\n")).toBe("banana nanica");
  });
  it("strips accents, so a shopper who skips them still matches", () => {
    expect(normalizeForSearch("Maçã Argentina")).toBe("maca argentina");
    expect(normalizeForSearch("Açúcar refinado")).toBe("acucar refinado");
    expect(normalizeForSearch("FEIJÃO")).toBe("feijao");
  });
  it("leaves an all-accent query non-empty-safe", () => {
    expect(normalizeForSearch("ç")).toBe("c");
    expect(normalizeForSearch("!!!")).toBe("!!!");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/products/__tests__/normalize-for-search.test.ts`
Expected: FAIL — cannot resolve `@/modules/products/utils/normalize-for-search`.

- [ ] **Step 3: Implement**

```ts
import { normalizeForEmbedding } from "@/modules/embeddings";

/**
 * The fuzzy list's normalisation (CONTEXT.md § Search): the embedding normalisation plus
 * accent stripping. It decides who is considered, never what something is — the vector
 * and the classifier keep the accents.
 */
export const normalizeForSearch = (text: string): string =>
  normalizeForEmbedding(text).normalize("NFD").replace(/\p{M}/gu, "");
```

- [ ] **Step 4: Run it to see it pass** — same command, expected PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/products/utils/normalize-for-search.ts apps/api/src/modules/products/__tests__/normalize-for-search.test.ts
git commit -m "feat(api): normalizeForSearch strips accents for the fuzzy list"
```

---

### Task 2: The 14-row search scenario

Renames the banana fixture to the search scenario, adds the six rows and the expected tiers (spec § The scenario). The old exports stay until Task 5 rewrites the tests that read them.

**Files:**
- Rename: `apps/api/src/modules/products/fixtures/banana-scenario.ts` → `apps/api/src/modules/products/fixtures/search-scenario.ts`
- Modify: `apps/api/src/db/seed.ts`, `apps/api/src/db/seed-cli.ts`, `apps/api/src/db/__tests__/seed.test.ts`, `apps/api/src/modules/products/__tests__/search-scenario.api.test.ts` (import path and names only), `e2e/modules/products/search-banana.test.ts` and `e2e/modules/products/edit-and-delete-product.test.ts` (import path and names only)
- Delete: `apps/api/src/db/similarity-table-cli.ts`; the `"similarity"` script in `apps/api/package.json`

**Interfaces:**
- Produces (`@/modules/products/fixtures/search-scenario`):
  - `interface ScenarioRow { key: string; shopName: string; name: string; price: number; quantity: number; discountPercentage: number }`
  - `SEARCH_SCENARIO: readonly ScenarioRow[]` — 14 rows, in the spec table's order (seeded ids 1–14).
  - `type ScenarioQuery = "banana" | "bolo"`
  - `EXPECTED_TIERS: Record<ScenarioQuery, { matches: string[]; related: string[] }>` — keys, each list in final-price-then-id order.
  - `scenarioRow(key: string): ScenarioRow`
  - Kept until Task 5: `BANANA_QUERY`, `EXPECTED_MATCH_KEYS_IN_ORDER`, `HARD_DECOY_KEYS`, `SOFT_DECOY_KEY` (unchanged values).
  - `seedSearchScenario(): Promise<void>` from `@/db/seed` (replaces `seedBananaScenario`).

- [ ] **Step 1: Write the failing test** — replace `apps/api/src/db/__tests__/seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { seedSearchScenario } from "@/db/seed";
import { SEARCH_SCENARIO, EXPECTED_TIERS } from "@/modules/products/fixtures/search-scenario";
import { productsRepository } from "@/modules/products/repository";

describe("seedSearchScenario", () => {
  it("leaves exactly the fixture's 14 rows in the table, each with a vector", async () => {
    await productsRepository.create({
      shopName: "x",
      name: "leftover",
      price: 1,
      quantity: 1,
      discountPercentage: 0,
    });
    await seedSearchScenario();
    const all = await productsRepository.findAll();
    expect(all).toHaveLength(14);
    expect(new Set(all.map((p) => p.name))).toEqual(new Set(SEARCH_SCENARIO.map((r) => r.name)));
    expect(await productsRepository.findEmbedding(all[0].id)).toHaveLength(384);
  });

  it("names only fixture keys in the expected tiers", () => {
    const keys = new Set(SEARCH_SCENARIO.map((r) => r.key));
    for (const { matches, related } of Object.values(EXPECTED_TIERS))
      for (const key of [...matches, ...related]) expect(keys).toContain(key);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/db/__tests__/seed.test.ts`
Expected: FAIL — cannot resolve `@/modules/products/fixtures/search-scenario`.

- [ ] **Step 3: Implement**

`git mv apps/api/src/modules/products/fixtures/banana-scenario.ts apps/api/src/modules/products/fixtures/search-scenario.ts`, rename `BANANA_SCENARIO` to `SEARCH_SCENARIO`, update the header comment to "The search scenario (spec § The scenario)", and append these rows after `ceasa-carne-moida`:

```ts
  {
    key: "pao-quente-bolo-de-laranja",
    shopName: "Padaria Pão Quente",
    name: "Bolo de laranja",
    price: 1500,
    quantity: 10,
    discountPercentage: 40,
  },
  {
    key: "pao-quente-fatia-de-bolo",
    shopName: "Padaria Pão Quente",
    name: "Fatia de bolo red velvet",
    price: 800,
    quantity: 10,
    discountPercentage: 0,
  },
  {
    key: "candelaria-mistura-para-bolo",
    shopName: "Mercadinho Candelária",
    name: "Mistura para bolo de chocolate",
    price: 900,
    quantity: 10,
    discountPercentage: 0,
  },
  {
    key: "casa-cozinha-forma-de-bolo",
    shopName: "Casa & Cozinha",
    name: "Forma de bolo redonda",
    price: 3000,
    quantity: 10,
    discountPercentage: 50,
  },
  {
    key: "casa-cozinha-pilha-aa",
    shopName: "Casa & Cozinha",
    name: "Pilha AA",
    price: 1000,
    quantity: 10,
    discountPercentage: 50,
  },
  {
    key: "vec-acucar-refinado",
    shopName: "VEC Hortifruti",
    name: "Açúcar refinado",
    price: 600,
    quantity: 10,
    discountPercentage: 25,
  },
```

Then add, below the array:

```ts
export type ScenarioQuery = "banana" | "bolo";

/**
 * Expected tiers per query (spec § The scenario), each list in final-price-then-id order.
 * A row not named here is unrelated to that query.
 */
export const EXPECTED_TIERS: Record<ScenarioQuery, { matches: string[]; related: string[] }> = {
  banana: {
    matches: [
      "ceasa-banana-prata-organica",
      "candelaria-banana",
      "vec-banana-prata",
      "sao-jose-banana-nanica",
    ],
    related: ["candelaria-bananada", "sao-jose-bolo-de-banana"],
  },
  bolo: {
    matches: ["pao-quente-fatia-de-bolo", "sao-jose-bolo-de-banana", "pao-quente-bolo-de-laranja"],
    related: ["candelaria-mistura-para-bolo", "casa-cozinha-forma-de-bolo"],
  },
};
```

Mark the four old exports with `/** Removed in slice 1 Task 5 with the threshold tests. */`. In `apps/api/src/db/seed.ts` rename the function to `seedSearchScenario` and iterate `SEARCH_SCENARIO` (docstring: "Wipes products and inserts the search scenario through the one write path."). Update `seed-cli.ts` (`seedSearchScenario`, log line "seeded the search scenario"), the import path/names in `search-scenario.api.test.ts` and both e2e files (`SEARCH_SCENARIO` from `.../fixtures/search-scenario`). Delete `similarity-table-cli.ts` and remove `"similarity": "tsx src/db/similarity-table-cli.ts"` from `apps/api/package.json`.

- [ ] **Step 4: Run the API suite to see it pass**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api test`
Expected: PASS (the old threshold scenario test still passes: no new row is cheaper than 3,60 and above the threshold for "banana"). If it fails only because a new row entered the "banana" results, mark that one test `it.skip` with the comment `// replaced in slice 1 Task 5` — never commit a red suite.

- [ ] **Step 5: Commit**

```bash
git add -A apps/api/src/modules/products/fixtures apps/api/src/db apps/api/package.json apps/api/src/modules/products/__tests__/search-scenario.api.test.ts e2e/modules/products
git commit -m "test(api): the search scenario grows to 14 rows with expected tiers"
```

---

### Task 3: `search_name` column, migration and the one write path

**Files:**
- Modify: `apps/api/src/modules/products/model.ts`, `apps/api/src/modules/products/schema.ts`, `apps/api/src/modules/products/repository.ts`
- Create: `apps/api/drizzle/0002_<generated>.sql` (generated, then hand-edited), `apps/api/drizzle/meta/0002_snapshot.json`, `apps/api/drizzle/meta/_journal.json` (generated)
- Test: `apps/api/src/modules/products/__tests__/repository.test.ts`

**Interfaces:**
- Consumes: `normalizeForSearch` (Task 1).
- Produces: `products.searchName` (Drizzle column `search_name`, `text not null`); `productsRepository.findSearchName(id: number): Promise<string | undefined>` (test accessor, like `findEmbedding`); SQL function `ecolheita_search_name(text) returns text` (backfill only).

- [ ] **Step 1: Write the failing tests** — append to `repository.test.ts`:

```ts
import { pool } from "@/db/client";
import { normalizeForSearch } from "@/modules/products/utils/normalize-for-search";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";

describe("productsRepository search_name", () => {
  it("writes the accent-stripped normalised name on create", async () => {
    const created = await productsRepository.create({ ...bananaPrata, name: "  Maçã   Argentina " });
    expect(await productsRepository.findSearchName(created.id)).toBe("maca argentina");
  });

  it("rewrites it on rename, and re-embeds a rename that only adds accents", async () => {
    const created = await productsRepository.create({ ...bananaPrata, name: "Maca" });
    const before = await productsRepository.findEmbedding(created.id);
    await productsRepository.update(created.id, { name: "Maçã" });
    expect(await productsRepository.findSearchName(created.id)).toBe("maca");
    expect(await productsRepository.findEmbedding(created.id)).not.toEqual(before);
  });

  it("leaves it alone on a price-only update", async () => {
    const created = await productsRepository.create({ ...bananaPrata, name: "Banana prata" });
    await pool.query("UPDATE products SET search_name = 'sentinel' WHERE id = $1", [created.id]);
    await productsRepository.update(created.id, { price: 999 });
    expect(await productsRepository.findSearchName(created.id)).toBe("sentinel");
  });

  it("is never returned by the API shape", async () => {
    const created = await productsRepository.create(bananaPrata);
    expect(created).not.toHaveProperty("searchName");
  });
});

describe("ecolheita_search_name (the migration's backfill)", () => {
  const names = [
    ...SEARCH_SCENARIO.map((r) => r.name),
    "  \tFEIJÃO  Carioca\n",
    "\u00a0Banana\u00a0",
    "Mac\u0327a\u0303", // "Maçã" typed decomposed (NFD), as some keyboards produce
    "Ōmega ăș",
    "ÁÀÂÃÄ éèêë íìîï óòôõö úùûü Çç Ññ",
  ];
  it.each(names)("matches normalizeForSearch for %j", async (name) => {
    const { rows } = await pool.query("SELECT ecolheita_search_name($1) AS v", [name]);
    expect(rows[0].v).toBe(normalizeForSearch(name));
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/products/__tests__/repository.test.ts`
Expected: FAIL — `findSearchName` is not a function / function `ecolheita_search_name` does not exist.

- [ ] **Step 3: Model and schema**

In `model.ts` add the column and the trigram index:

```ts
import { index, integer, pgTable, serial, text, timestamp, vector } from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    // …existing columns unchanged…
    // The accent-stripped normalised name for the fuzzy list (CONTEXT.md § Search). Written
    // only by the repository's create/update, beside the embedding.
    searchName: text("search_name").notNull(),
    // …createdAt, updatedAt…
  },
  (t) => [index("products_search_name_trgm_idx").using("gist", t.searchName.op("gist_trgm_ops"))],
);
```

In `schema.ts` omit it from client input next to `embedding`:

```ts
  // Computed by the repository from the name, never accepted from a client.
  embedding: true,
  searchName: true,
```

- [ ] **Step 4: Generate and hand-edit the migration**

Run: `pnpm --filter api db:generate`. Replace the body of the generated `apps/api/drizzle/0002_*.sql` (keep its file name and the generated snapshot/journal) with:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
-- Backfill only. Mirrors normalizeForSearch (trim, lowercase, collapse whitespace, NFD, drop
-- combining marks); a test proves the two agree. The application never calls it.
CREATE OR REPLACE FUNCTION ecolheita_search_name(name text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT regexp_replace(
    normalize(
      regexp_replace(lower(regexp_replace(replace(name, chr(160), ' '), '^\s+|\s+$', '', 'g')), '\s+', ' ', 'g'),
      NFD
    ),
    '[\u0300-\u036f]', '', 'g'
  )
$$;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "search_name" text;--> statement-breakpoint
UPDATE "products" SET "search_name" = ecolheita_search_name("name");--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "search_name" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "products_search_name_trgm_idx" ON "products" USING gist ("search_name" gist_trgm_ops);
```

If the generated index line differs only in quoting, keep the generated form.

If the parity test cannot be made green with SQL, replace the `UPDATE` with the Node step the spec names (a one-off script run by the migration's author that writes `normalizeForSearch(name)` for every row, before `SET NOT NULL`), and drop the function.

- [ ] **Step 5: Repository writes**

In `repository.ts`:

```ts
import { normalizeForSearch } from "@/modules/products/utils/normalize-for-search";

  async create(input: CreateProductInput): Promise<Product> {
    const embedding = await embed(normalizeForEmbedding(input.name));
    const [row] = await db
      .insert(products)
      .values({ ...input, embedding, searchName: normalizeForSearch(input.name) })
      .returning(PRODUCT_PUBLIC_COLUMNS);
    return toProduct(row);
  },
```

and in `update`, beside the embedding:

```ts
    const embedding = renamed ? await embed(normalizeForEmbedding(input.name!)) : undefined;
    const searchName = renamed ? normalizeForSearch(input.name!) : undefined;

    const [row] = await db
      .update(products)
      .set({
        ...input,
        ...(embedding ? { embedding } : {}),
        ...(searchName !== undefined ? { searchName } : {}),
        updatedAt: new Date(),
      })
```

Add the accessor:

```ts
  /** The stored search_name, for tests: it is never part of the public product. */
  async findSearchName(id: number): Promise<string | undefined> {
    const [row] = await db
      .select({ searchName: products.searchName })
      .from(products)
      .where(eq(products.id, id));
    return row?.searchName;
  },
```

Update the repository's top docstring: "every write embeds and writes search_name".

- [ ] **Step 6: Run the API suite to see it pass**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api test`
Expected: PASS (global setup applies 0002 to the test database).

- [ ] **Step 7: Apply to the dev database and check the backfill by hand**

Run: `pnpm --filter api db:migrate` (reads `apps/api/.env`, port 5433), then
`psql postgres://ecolheita:ecolheita@localhost:5433/ecolheita -c "select name, search_name from products limit 5"` — every row has a `search_name`.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/products apps/api/drizzle
git commit -m "feat(api): search_name column, trigram index and backfill, written beside the vector"
```

---

### Task 4: The interleaved shortlist

**Files:**
- Create: `apps/api/src/modules/products/search-constants.ts`, `apps/api/src/modules/products/utils/interleave.ts`
- Modify: `apps/api/src/modules/products/repository.ts`
- Test: `apps/api/src/modules/products/__tests__/interleave.test.ts`, `apps/api/src/modules/products/__tests__/shortlist.test.ts`

**Interfaces:**
- Consumes: `normalizeForSearch`, `embed`, `normalizeForEmbedding`, `seedSearchScenario`, `SEARCH_SCENARIO`, `scenarioRow`.
- Produces:
  - `LIST_SIZE = 50`, `SHORTLIST_SIZE = 50`, `UNTIERED_CAP = 20` (`search-constants.ts`).
  - `interleave(a: number[], b: number[], size: number): number[]` — a[0], b[0], a[1], b[1], …, skipping ids already taken, stopping at `size` or when both run out.
  - `productsRepository.shortlist(query: string, opts?: { size?: number }): Promise<Product[]>` — `query` raw (trimmed by the schema); in interleave order; at most `size` (default `SHORTLIST_SIZE`).

- [ ] **Step 1: Write the failing unit test** (`interleave.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { interleave } from "@/modules/products/utils/interleave";

describe("interleave", () => {
  it("alternates the two lists, first list first", () => {
    expect(interleave([1, 2, 3], [4, 5, 6], 10)).toEqual([1, 4, 2, 5, 3, 6]);
  });
  it("skips an id the other list already gave", () => {
    expect(interleave([1, 2, 3], [2, 1, 4], 10)).toEqual([1, 2, 3, 4]);
  });
  it("stops at size", () => {
    expect(interleave([1, 2, 3], [4, 5, 6], 3)).toEqual([1, 4, 2]);
  });
  it("keeps going on the longer list when one runs out", () => {
    expect(interleave([1], [4, 5, 6], 10)).toEqual([1, 4, 5, 6]);
    expect(interleave([], [], 10)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/products/__tests__/interleave.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `interleave` and the constants**

```ts
// utils/interleave.ts
/**
 * The shortlist merge (spec § Merge): each list's best hits are guaranteed a top spot, because
 * the two lists are built to disagree. Reciprocal Rank Fusion was measured and rejected.
 */
export const interleave = (a: number[], b: number[], size: number): number[] => {
  const out: number[] = [];
  const taken = new Set<number>();
  for (let i = 0; out.length < size && (i < a.length || i < b.length); i++) {
    for (const id of [a[i], b[i]]) {
      if (id === undefined || taken.has(id) || out.length >= size) continue;
      taken.add(id);
      out.push(id);
    }
  }
  return out;
};
```

```ts
// search-constants.ts
/** Search sizes (CONTEXT.md § Search). One place, so tests and the eval read the same values. */
export const LIST_SIZE = 50;
export const SHORTLIST_SIZE = 50;
export const UNTIERED_CAP = 20;
```

Run the unit test: PASS.

- [ ] **Step 4: Write the failing recall test** (`shortlist.test.ts`)

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { seedSearchScenario } from "@/db/seed";
import { scenarioRow, SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";
import { productsRepository } from "@/modules/products/repository";

// Seeded in fixture order, so row N of the spec table has id N.
const idOfKey = (key: string) => SEARCH_SCENARIO.indexOf(scenarioRow(key)) + 1;

// Spec § Testing, Shortlist row: with the size set to twice the expected count, every
// expected row is in. Measured worst positions with interleave: 7, 6, 6, 1, 1.
const RECALL: [query: string, expectedIds: number[]][] = [
  ["bolo", [7, 9, 10, 11, 12]],
  ["banana", [1, 2, 3, 4, 5, 7]],
  ["bnana", [1, 2, 3, 4]],
  ["acucar", [14]],
  ["maca", [6]],
];

describe("productsRepository.shortlist", () => {
  beforeEach(async () => {
    await seedSearchScenario();
  });

  it.each(RECALL)("%s: every expected row within twice its count", async (query, expected) => {
    const got = await productsRepository.shortlist(query, { size: expected.length * 2 });
    const ids = got.map((p) => p.id);
    for (const id of expected) expect(ids).toContain(id);
  });

  it("returns every in-stock row once, at most the default size, with no cutoff", async () => {
    const got = await productsRepository.shortlist("bolo");
    expect(got).toHaveLength(SEARCH_SCENARIO.length);
    expect(new Set(got.map((p) => p.id)).size).toBe(got.length);
    expect(got[0]).toHaveProperty("finalPrice");
    expect(got[0]).not.toHaveProperty("searchName");
    expect(got[0]).not.toHaveProperty("embedding");
  });

  it("never includes zero stock", async () => {
    const id = idOfKey("pao-quente-bolo-de-laranja");
    await productsRepository.update(id, { quantity: 0 });
    const got = await productsRepository.shortlist("bolo");
    expect(got.map((p) => p.id)).not.toContain(id);
  });

  it("keeps both offers of a duplicated name", async () => {
    const { key: _key, ...row } = scenarioRow("candelaria-banana");
    const dup = await productsRepository.create(row);
    const got = await productsRepository.shortlist("banana");
    expect(got.map((p) => p.id)).toEqual(expect.arrayContaining([idOfKey("candelaria-banana"), dup.id]));
  });

  it("breaks equal distances by id, so the order is stable", async () => {
    const original = idOfKey("pao-quente-bolo-de-laranja");
    const { key: _key, ...row } = scenarioRow("pao-quente-bolo-de-laranja");
    const twin = await productsRepository.create(row); // same name: same distance on both lists
    // Rewrite the original so it now sits after the twin on disk: only the id tie-break
    // can still put it first.
    await productsRepository.update(original, { price: row.price + 1 });
    const ids = (await productsRepository.shortlist("bolo")).map((p) => p.id);
    expect(ids.indexOf(original)).toBeLessThan(ids.indexOf(twin.id));
  });
});
```

- [ ] **Step 5: Run it to see it fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/products/__tests__/shortlist.test.ts`
Expected: FAIL — `productsRepository.shortlist is not a function`.

- [ ] **Step 6: Implement `shortlist`**

In `repository.ts` (imports: `inArray` from drizzle-orm; `LIST_SIZE`, `SHORTLIST_SIZE`; `interleave`):

```ts
  /**
   * The search shortlist (spec § The flow, § Merge): the fuzzy list (trigram word distance on
   * search_name) and the meaning list (cosine distance on the vector), each the LIST_SIZE
   * closest in-stock rows with no cutoff, ties by id, interleaved. Never a threshold.
   */
  async shortlist(query: string, { size = SHORTLIST_SIZE }: { size?: number } = {}): Promise<Product[]> {
    const searchText = normalizeForSearch(query);
    const vector = JSON.stringify(await embed(normalizeForEmbedding(query)));
    const { rows } = await db.execute<{ id: number; list: "f" | "m" }>(sql`
      (SELECT id, 'f' AS list FROM products WHERE quantity > 0
        ORDER BY ${searchText}::text <<-> search_name, id LIMIT ${LIST_SIZE})
      UNION ALL
      (SELECT id, 'm' AS list FROM products WHERE quantity > 0
        ORDER BY embedding <=> ${vector}::vector, id LIMIT ${LIST_SIZE})
    `);
    const ids = interleave(
      rows.filter((r) => r.list === "f").map((r) => r.id),
      rows.filter((r) => r.list === "m").map((r) => r.id),
      size,
    );
    if (ids.length === 0) return [];
    const found = await db
      .select(PRODUCT_PUBLIC_COLUMNS)
      .from(products)
      .where(inArray(products.id, ids));
    const byId = new Map(found.map((row) => [row.id, toProduct(row)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },
```

`UNION ALL` keeps each parenthesised subquery's own `ORDER BY … LIMIT`, and rows of the first come before the second, but the code above does not rely on that: it filters by `list` and keeps each subset's order. If the driver returns `id` as a string, wrap with `Number(r.id)`.

- [ ] **Step 7: Run it to see it pass** — same command, expected PASS. If a recall case fails, do not change the fixture or the expected ids: report it (spec § Testing: "the merge or normalisation is fixed, or the human decides").

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/products
git commit -m "feat(api): no-cutoff shortlist, fuzzy and meaning lists interleaved"
```

---

### Task 5: The route answers untiered; the threshold goes

**Files:**
- Modify: `apps/api/src/modules/products/resolvers/search-products-resolver.ts`, `apps/api/src/modules/products/types.ts`, `apps/api/src/config/env.ts`, `apps/api/src/config/__tests__/env.test.ts`, `apps/api/vitest.config.ts`, `apps/api/.env.example`, `.env.example`, `apps/api/src/modules/products/fixtures/search-scenario.ts` (drop the four old exports)
- Modify (delete `search` method): `apps/api/src/modules/products/repository.ts`
- Rewrite: `apps/api/src/modules/products/__tests__/search-products.api.test.ts`, `apps/api/src/modules/products/__tests__/search-scenario.api.test.ts`

**Interfaces:**
- Consumes: `productsRepository.shortlist`, `UNTIERED_CAP`, `seedSearchScenario`.
- Produces: `type SearchResponse = { tiered: false; results: Product[] }` in `types.ts` (slice 2 widens it to the union). `SearchResult` is removed.

- [ ] **Step 1: Write the failing HTTP tests** — replace `search-products.api.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { productsRepository } from "@/modules/products/repository";
import { bananaPrata } from "./fixtures";

const create = (base: string, patch: Partial<typeof bananaPrata>) =>
  json(base, "/products", {
    method: "POST",
    body: JSON.stringify({ ...bananaPrata, ...patch }),
  }).then((r) => r.json());

const search = async (base: string, q: string) =>
  (await fetch(`${base}/products/search?q=${encodeURIComponent(q)}`)).json();

describe("GET /products/search", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("is 400 when q is missing, blank, or longer than 200 characters", async () => {
    expect((await fetch(`${base}/products/search`)).status).toBe(400);
    expect((await fetch(`${base}/products/search?q=%20%20`)).status).toBe(400);
    expect((await fetch(`${base}/products/search?q=${"a".repeat(201)}`)).status).toBe(400);
  });

  it("accepts a 200-character query", async () => {
    expect((await fetch(`${base}/products/search?q=${"a".repeat(200)}`)).status).toBe(200);
  });

  it("answers untiered, with finalPrice and without similarity, embedding or searchName", async () => {
    await create(base, { name: "Banana prata" });
    const body = await search(base, "banana");
    expect(body.tiered).toBe(false);
    const [hit] = body.results;
    expect(hit.finalPrice).toBe(350);
    expect(hit).not.toHaveProperty("similarity");
    expect(hit).not.toHaveProperty("embedding");
    expect(hit).not.toHaveProperty("searchName");
  });

  it("has no cutoff: an unrelated product is still returned untiered", async () => {
    const detergent = await create(base, { name: "Detergente" });
    const body = await search(base, "banana");
    expect(body.results.map((p: { id: number }) => p.id)).toContain(detergent.id);
  });

  it("answers an accent-only or punctuation-only query", async () => {
    await create(base, { name: "Maçã" });
    for (const q of ["ç", "!!!"]) {
      const res = await fetch(`${base}/products/search?q=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
      expect((await res.json()).tiered).toBe(false);
    }
  });

  it("hides zero-stock products from search but not from the list", async () => {
    const soldOut = await create(base, { name: "Banana", price: 100, quantity: 0 });
    const inStock = await create(base, { name: "Banana prata" });
    const ids = (await search(base, "banana")).results.map((h: { id: number }) => h.id);
    expect(ids).toContain(inStock.id);
    expect(ids).not.toContain(soldOut.id);
    const list = await (await fetch(`${base}/products`)).json();
    expect(list.map((p: { id: number }) => p.id)).toContain(soldOut.id);
  });

  it("returns the repository's shortlist order, cut to 20", async () => {
    for (let i = 0; i < 25; i++) await create(base, { name: i % 2 ? "Banana" : "Bolo", price: 100 + i });
    const body = await search(base, "banana");
    const expected = (await productsRepository.shortlist("banana")).slice(0, 20).map((p) => p.id);
    expect(body.results.map((p: { id: number }) => p.id)).toEqual(expected);
    expect(body.results).toHaveLength(20);
  });

  it("answers an empty list when nothing is in stock", async () => {
    await create(base, { name: "Banana", quantity: 0 });
    expect(await search(base, "banana")).toEqual({ tiered: false, results: [] });
  });
});
```

Replace `search-scenario.api.test.ts`:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";
import { seedSearchScenario } from "@/db/seed";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";

// Slice 1: no classifier, so every answer is untiered. With 14 rows under the cap of 20,
// this proves the route serves the scenario; relevance is proven in shortlist.test.ts.
describe("the search scenario, untiered", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });
  beforeEach(async () => {
    await seedSearchScenario();
  });

  it.each(["banana", "bolo"])("%s returns every in-stock scenario row, untiered", async (q) => {
    const body = await (await fetch(`${base}/products/search?q=${q}`)).json();
    expect(body.tiered).toBe(false);
    expect(new Set(body.results.map((p: { name: string }) => p.name))).toEqual(
      new Set(SEARCH_SCENARIO.map((r) => r.name)),
    );
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api exec vitest run src/modules/products/__tests__/search-products.api.test.ts src/modules/products/__tests__/search-scenario.api.test.ts`
Expected: FAIL — the body is an array (`body.tiered` undefined).

- [ ] **Step 3: Implement the resolver and the type**

`types.ts`: remove `SearchResult`; add

```ts
/** A search answer (spec § API contract). Slice 2 adds the tiered branch. */
export type SearchResponse = { tiered: false; results: Product[] };
```

`search-products-resolver.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { productsRepository } from "@/modules/products/repository";
import { UNTIERED_CAP } from "@/modules/products/search-constants";
import { searchQuerySchema } from "@/modules/products/search-schema";
import type { SearchResponse } from "@/modules/products/types";

export const searchProductsResolver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { q } = searchQuerySchema.parse(req.query);
    const shortlist = await productsRepository.shortlist(q);
    const body: SearchResponse = { tiered: false, results: shortlist.slice(0, UNTIERED_CAP) };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
};
```

Delete `productsRepository.search` and the now-unused imports (`cosineDistance`, `gte`, `desc` if unused, `SearchResult`).

- [ ] **Step 4: Remove the threshold**

- `env.ts`: delete `SEARCH_SIMILARITY_THRESHOLD` and its comment.
- `env.test.ts`: replace the threshold tests with:

```ts
describe("envSchema", () => {
  it("defaults the port", () => {
    expect(envSchema.parse(base).PORT).toBe(3333);
  });
  it("ignores a leftover SEARCH_SIMILARITY_THRESHOLD", () => {
    expect(envSchema.parse({ ...base, SEARCH_SIMILARITY_THRESHOLD: "0.5" })).not.toHaveProperty(
      "SEARCH_SIMILARITY_THRESHOLD",
    );
  });
});
```

- `vitest.config.ts`: delete the comment and `delete process.env.SEARCH_SIMILARITY_THRESHOLD;`.
- `apps/api/.env.example` and `.env.example`: delete the two threshold lines (comment + commented variable).
- `search-scenario.ts`: delete `BANANA_QUERY`, `EXPECTED_MATCH_KEYS_IN_ORDER`, `HARD_DECOY_KEYS`, `SOFT_DECOY_KEY`.
- `grep -rn "SEARCH_SIMILARITY_THRESHOLD\|SearchResult\b\|EXPECTED_MATCH_KEYS\|SOFT_DECOY\|HARD_DECOY\|BANANA_QUERY" apps e2e .env.example` → only `e2e/` hits remain (Task 7).

- [ ] **Step 5: Run the API suite to see it pass**

Run: `DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm --filter api test && pnpm --filter api typecheck && pnpm --filter api lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A apps/api .env.example
git commit -m "feat(api): search answers the untiered shortlist (top 20); the threshold is removed"
```

---

### Task 6: The page's untiered state

**Files:**
- Modify: `apps/web/src/modules/products/types.ts`, `apps/web/src/modules/products/api.ts`, `apps/web/src/modules/products/api.test.ts`, `apps/web/src/modules/products/components/SearchResults.tsx`, `SearchResults.stories.tsx`, `SearchEmptyState.tsx`, `SearchEmptyState.stories.tsx`, `SearchResultCard.tsx`, `SearchResultCard.stories.tsx`, `SearchPageContainer.tsx`

**Interfaces:**
- Consumes: the API contract `{ tiered: false; results: Product[] }`.
- Produces (web `types.ts`): `export type SearchResponse = { tiered: false; results: Product[] };` (`SearchResult` removed). `SearchResults` props: `{ query: string; response: SearchResponse | undefined; loading: boolean; error: string | null }`. `SearchResultCard` props: `{ product: Product }`.

- [ ] **Step 1: Write the failing stories**

`SearchResultCard.stories.tsx`: type the fixture as `Product` (drop `similarity`), pass `args: { product: ceasa }`, and in `DiscountedOffer` replace the similarity assertion with:

```ts
    await expect(card.queryByText(/similaridade/)).toBeNull();
```

`SearchEmptyState.stories.tsx`:

```ts
/** The heading names the query verbatim. */
export const NothingFound: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("heading", { name: "Não encontramos “detergente”" }),
    ).toBeInTheDocument();
  },
};
```

`SearchResults.stories.tsx`: rename the helper to `product(id, shopName, name, finalPrice): Product` (no `similarity`; slice 2 reuses it), `args: { query: "banana", response: { tiered: false, results: bananas }, loading: false, error: null }`, and:

```ts
/** Before the first search: a prompt, no cards, no empty state. */
export const Idle: Story = {
  args: { query: "", response: undefined },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Digite o nome de um produto")).toBeInTheDocument();
    await expect(c.queryAllByRole("article")).toHaveLength(0);
    await expect(c.queryByRole("heading")).toBeNull();
  },
};

/** Untiered: the notice, then the cards in the order the API gave. */
export const Untiered: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByText("Não conseguimos organizar os resultados por relevância"),
    ).toBeInTheDocument();
    const names = c.getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    await expect(names).toEqual(["Banana prata orgânica", "Banana", "Banana prata"]);
  },
};

/** Untiered and empty: the "não encontramos" heading, no notice. */
export const UntieredNothing: Story = {
  args: { query: "detergente", response: { tiered: false, results: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { name: "Não encontramos “detergente”" })).toBeInTheDocument();
    await expect(c.queryByText(/Não conseguimos organizar/)).toBeNull();
  },
};
```

Keep `LoadingKeepsPreviousResults` and `FailedKeepsPreviousResults` (they use the default args). Delete `CheapestFirst` and `NothingMatched`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter web test:stories`
Expected: FAIL — type errors / missing notice / heading not found.

- [ ] **Step 3: Implement**

`types.ts`: delete `SearchResult`; add

```ts
/** A search answer (API contract). Slice 2 adds the tiered branch. */
export type SearchResponse = { tiered: false; results: Product[] };
```

`api.ts`: `search: (q: string) => request<SearchResponse>(\`/products/search?q=${encodeURIComponent(q)}\`),` (import `SearchResponse`, drop `SearchResult`). In `api.test.ts` the search mock body becomes `JSON.stringify({ tiered: false, results: [] })`.

`SearchResultCard.tsx`: prop `product: Product`; docstring "One offer."; delete the similarity `Text`, keeping `{product.quantity} un.` in the bottom row.

`SearchEmptyState.tsx`:

```tsx
import { Title } from "@mantine/core";

export interface SearchEmptyStateProps {
  query: string;
}

/** The seller's plain "no" (spec § The page). A heading, so it is found by role. */
export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return (
    <Title order={2} size="h4">
      Não encontramos “{query}”
    </Title>
  );
}
```

`SearchResults.tsx`:

```tsx
"use client";

import { Text } from "@mantine/core";
import { SearchEmptyState } from "@/modules/products/components/SearchEmptyState";
import { SearchResultCard } from "@/modules/products/components/SearchResultCard";
import type { SearchResponse } from "@/modules/products/types";

export interface SearchResultsProps {
  /** "" means no search has been submitted yet (idle). */
  query: string;
  /** The last answer; kept on screen while loading or after an error. */
  response: SearchResponse | undefined;
  loading: boolean;
  error: string | null;
}

/** Presentational: idle, loading and error keep whatever cards are already on screen. */
export function SearchResults({ query, response, loading, error }: SearchResultsProps) {
  if (query === "") {
    return <Text c="dimmed">Digite o nome de um produto</Text>;
  }
  const results = response?.results ?? [];
  const settled = !loading && !error && response !== undefined;
  return (
    <div className="grid gap-3">
      {loading && (
        <Text role="status" c="dimmed">
          Buscando…
        </Text>
      )}
      {error && (
        <Text role="alert" c="red.8">
          {error}
        </Text>
      )}
      {settled && results.length === 0 && <SearchEmptyState query={query} />}
      {results.length > 0 && (
        <Text c="dimmed">Não conseguimos organizar os resultados por relevância</Text>
      )}
      {results.map((p) => (
        <SearchResultCard key={p.id} product={p} />
      ))}
    </div>
  );
}
```

`SearchPageContainer.tsx`: keep the last good answer, typed `SearchResponse | undefined`:

```tsx
  const [lastResponse, setLastResponse] = useState<SearchResponse | undefined>(undefined);
  if (data !== undefined && data !== lastResponse) setLastResponse(data);
  // …
        <SearchResults
          query={query}
          response={data ?? lastResponse}
          loading={isFetching}
          error={error ? "Não foi possível buscar. Tente novamente." : null}
        />
```

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm --filter web test && pnpm --filter web test:stories && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/products
git commit -m "feat(web): search shows the untiered list under a notice; the similarity badge goes"
```

---

### Task 7: E2E, `CONTEXT.md`, gates

**Files:**
- Rewrite: `e2e/modules/products/search-banana.test.ts`
- Modify: `e2e/modules/products/edit-and-delete-product.test.ts`, `e2e/playwright.config.ts`, `CONTEXT.md`

- [ ] **Step 1: Rewrite the e2e for the untiered answer**

In `search-banana.test.ts`, keep the imports of `test`, `expect`, `seedProduct`, and import `SEARCH_SCENARIO` from `../../../apps/api/src/modules/products/fixtures/search-scenario`. Keep `seedScenario` (iterating `SEARCH_SCENARIO`) and the `beforeEach` (searching `"banana"`). Replace the two first tests with:

```ts
  test("the answer is untiered: the notice and the banana offers, without similarity", async ({
    page,
  }) => {
    await expect(
      page.getByText("Não conseguimos organizar os resultados por relevância"),
    ).toBeVisible();
    const names = await page
      .getByRole("article")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    for (const name of ["Banana", "Banana prata", "Banana nanica", "Banana prata orgânica"])
      expect(names).toContain(name);
    await expect(page.getByText(/similaridade/)).toHaveCount(0);
  });
```

Keep "a failed search shows an error and keeps the previous results" unchanged. In "retrying a failed search", replace the last assertion with:

```ts
    await expect(page.getByRole("article", { name: "Banana prata orgânica" })).toBeVisible();
```

- [ ] **Step 2: Adjust the rename e2e**

In `edit-and-delete-product.test.ts`, rename the first test to `"renaming Banana to Maçã shows the new name in search"` and replace everything after the `/buscar` search click with:

```ts
  const card = page
    .getByRole("article", { name: "Maçã", exact: true })
    .filter({ hasText: "Mercadinho Candelária" });
  await expect(card).toHaveCount(1);
  await expect(page.getByRole("article", { name: "Banana", exact: true })).toHaveCount(0);
```

(Slice 2 restores "absent from the banana results"; the scenario classifier decides it.)

- [ ] **Step 3: Drop the threshold from the e2e config**

In `e2e/playwright.config.ts`, the API `env` becomes `{ PORT: String(API_PORT), DATABASE_URL: DB_URL }`; delete the comment about the calibrated threshold.

- [ ] **Step 4: Run the e2e suite**

Run: `E2E_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_e2e pnpm e2e`
Expected: PASS.

- [ ] **Step 5: Rewrite `CONTEXT.md § Search` for slice 1**

Replace the **Threshold** and **Ranking** entries, and add the shortlist and normalisation entries, so the section reads (keep **Embedded text**, **Similarity**, **Zero stock**, **A product without a vector never exists** as they are, and extend the last one):

```markdown
- **Search name** — the normalised name with accents stripped (`maçã` → `maca`), stored as
  `search_name`. It feeds the fuzzy list only. **Normalisation decides who is considered,
  never what something is:** "maca" (a stretcher) and "maçã" (an apple) both reach the
  shortlist for either search; whatever judges relevance sees the real, accented names.
- **No cutoff** — no similarity or trigram threshold hides a product from the shortlist.
- **Shortlist** — the fuzzy list (trigram word distance between the search text and
  `search_name`) and the meaning list (cosine distance between the vectors), each the 50
  closest in-stock rows ordered by distance then id, interleaved — fuzzy 1, meaning 1,
  fuzzy 2, … — skipping duplicates, up to 50.
- **Ranking (untiered)** — an untiered answer is the first 20 of the shortlist, in
  shortlist order.
- **A product without a vector never exists** — the repository embeds and writes
  `search_name` on every create and every rename; it is the only write path.
```

Delete the old **Threshold** and **Ranking** entries.

- [ ] **Step 6: Run every gate**

Run: `pnpm lint && pnpm typecheck && DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_test pnpm test && pnpm test:stories && E2E_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5433/ecolheita_e2e pnpm e2e`
Expected: all PASS.

- [ ] **Step 7: Check by hand**

`pnpm --filter api seed` (dev DB, 5433), `pnpm dev`, open `http://localhost:3000/buscar`, search "bolo": every cake product is listed under the notice; search "acucar": "Açúcar refinado" first.

- [ ] **Step 8: Commit**

```bash
git add e2e CONTEXT.md
git commit -m "test(e2e): search is untiered; docs(context): shortlist, no cutoff, search name"
```

## Review decisions

- Plan review round 2: the backfill function uses NFD plus combining-mark removal, like `normalizeForSearch`; the parity test adds decomposed input and letters outside Portuguese; the tie-break test rewrites the original row first so disk order cannot pass it.
- Plan review round 1: a mid-slice red test is skipped with a pointer to Task 5, never committed red; the backfill parity test covers a non-breaking space (and the SQL maps it to a space); the determinism case now proves the id tie-break.
