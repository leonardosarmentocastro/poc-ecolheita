# Product vector search — slice 2: search by meaning

**Reviewed:** round 1 (2026-09-22) · round 2 (2026-09-22).
**Owns:** Finding the same product across shops by meaning and ranking it by best price: the embedding module and model loaded at boot, the pgvector extension and `embedding` column, embedding on create, `GET /products/search`, the similarity threshold, the banana fixture, the seed script, the similarity table, the search page, and the search rules appended to `CONTEXT.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this repository the orchestrator is `/implement-stack`, which runs the implementer agent on this plan.

**Goal:** Searching "banana" returns the four differently named bananas from four shops, cheapest first, and none of the decoys, over HTTP and in the browser.

**Architecture:** One in-process embedding module (Transformers.js, `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, 384 dimensions) behind `loadEmbeddingModel()` / `embed()` / `normalizeForEmbedding()`. The products repository's `create` embeds the normalised name into a `vector(384)` column. A search resolver embeds the query and runs one Drizzle query ordered by final price, filtered by cosine similarity against a threshold read from the environment. The web search page renders the results as cards.

**Tech Stack:** as slice 1, plus `@huggingface/transformers` ^4.3.0, `drizzle-orm/pg-core` `vector` column and `cosineDistance`.

**Spec:** `docs/superpowers/specs/2026-09-22-product-vector-search-design.md`

## Global Constraints

- Branch `feat/product-vector-search-slice-2` off `feat/product-vector-search-slice-1` (or off the feature branch once slice 1 merged; the handover's stack table decides).
- **This slice crosses the twenty-file tripwire.** The embedding module, the migration, the fixture, the seed, the search endpoint and the four search components are one capability, "find the same product by meaning"; a cut anywhere in it leaves a slice with nothing a shopper can see.
- Every migration this slice generates is also applied to the dev database with `pnpm --filter api db:migrate` right after it is generated, so `pnpm seed` and the by-hand demo work.
- A form or a page keeps what the person has on screen: search failure keeps the previous cards.
- Model `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, quantised (`dtype: "q8"`), mean pooling, normalised output, 384 numbers. Files cached under `apps/api/.models/` (gitignored). **The real model runs in tests**; never mock `embed`.
- Embedded text: the **normalised name only** (trim, lowercase, collapse whitespace). Never the shop name.
- The products repository is the one write path: `create` embeds. Resolvers, seed and tests never insert into `products` directly.
- `similarity = 1 - cosine_distance`; a row matches when `similarity >= SEARCH_SIMILARITY_THRESHOLD`; order by `round(price * (100 - discountPercentage) / 100)` ascending, then similarity descending, then id ascending; cap 20; zero stock excluded; `q` trimmed, non-empty, at most 200 characters, else 400.
- `SEARCH_SIMILARITY_THRESHOLD` is a float in `[-1, 1]`; an invalid value fails the boot (Zod on the env). The default is chosen from the similarity table in Task 7 and committed as the default in `env.ts`.
- The `embedding` column is never serialised: every read selects the public columns explicitly.
- "The loaded model throws at run time on a text → 500 and no row written" holds by construction (the repository embeds before it inserts; the resolver forwards with `next(err)`) and is **untested**, because the only way to test it is to mock `embed`, which this plan forbids. Recorded here so the slice reviewer does not read the gap as forgotten.
- The scenario's two tiers (spec § The proof scenario): hard assertions must pass for the slice to merge; the "bolo de banana" exclusion may be marked an expected failure (`it.fails` / `test.fail()`) with the similarity table in the PR body.
- Slice 2's migration truncates `products` before adding the `not null` column.
- Web rules as slice 1: presentational components with stories, containers without; Portuguese copy, English identifiers.
- Local gates before the PR: `pnpm test`, `pnpm test:stories`, `pnpm e2e`.

## Review Focus

1. A query of 201 characters is 400; a query of exactly 200 is accepted. (Task 5)
2. A query that is only whitespace is 400, not an empty 200 list. (Task 5)
3. A product with stock 0 that would otherwise be the cheapest banana is absent from search but still present in `GET /products`. (Task 5)
4. Two products with the same final price come back in a stable order: higher similarity first, then lower id. (Task 5)
5. Search while the API is down shows an inline error and keeps the previous results on screen. (Task 9, story `FailedKeepsPreviousResults` for the component; Task 10, e2e "a failed search keeps the previous results" for the wired page)

---

### Task 1: Embedding module: normalisation, model load, `embed`

**Files:**
- Create: `apps/api/src/modules/embeddings/normalize-for-embedding.ts`, `apps/api/src/modules/embeddings/embedding-model.ts`, `apps/api/src/modules/embeddings/index.ts`, `apps/api/src/modules/embeddings/__tests__/normalize-for-embedding.test.ts`, `apps/api/src/modules/embeddings/__tests__/embed.test.ts`
- Modify: `apps/api/package.json` (dependency), `apps/api/vitest.config.ts` (hook timeout), `apps/api/test/setup.ts` (load the model), `.gitignore` (`apps/api/.models/`)

**Interfaces:**
- Produces: `normalizeForEmbedding(text: string): string`; `loadEmbeddingModel(): Promise<void>`; `embed(text: string): Promise<number[]>` (throws if the model is not loaded); constants `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS = 384`; all re-exported from `@/modules/embeddings`.

- [ ] **Step 1: Write the failing normalisation test**

`__tests__/normalize-for-embedding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeForEmbedding } from "@/modules/embeddings/normalize-for-embedding";

describe("normalizeForEmbedding", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeForEmbedding("  Banana   Prata ")).toBe("banana prata");
    expect(normalizeForEmbedding("BANANA\tnanica\n")).toBe("banana nanica");
  });
  it("keeps accents", () => {
    expect(normalizeForEmbedding("Maçã Argentina")).toBe("maçã argentina");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd apps/api && pnpm vitest run src/modules/embeddings/__tests__/normalize-for-embedding.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement the normaliser**

`normalize-for-embedding.ts`:

```ts
/** The one normalisation every embedded text goes through (CONTEXT.md). */
export const normalizeForEmbedding = (text: string): string =>
  text.trim().toLowerCase().replace(/\s+/g, " ");
```

- [ ] **Step 4: Run it to verify it passes**

Same command. Expected: PASS.

- [ ] **Step 5: Install Transformers.js and write the failing `embed` test**

```bash
cd apps/api && pnpm add @huggingface/transformers@^4.3.0
```

Append to root `.gitignore`:

```
# Embedding model files downloaded by Transformers.js
apps/api/.models/
```

`__tests__/embed.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, embed, loadEmbeddingModel, normalizeForEmbedding } from "@/modules/embeddings";

const cosine = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);

describe("embed", () => {
  beforeAll(async () => {
    await loadEmbeddingModel();
  });

  it("returns 384 finite numbers, unit-normalised", async () => {
    const v = await embed("banana");
    expect(v).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(v.every(Number.isFinite)).toBe(true);
    expect(Math.sqrt(cosine(v, v))).toBeCloseTo(1, 3);
  });

  it("gives the same vector for the same normalised text", async () => {
    const a = await embed(normalizeForEmbedding("Banana"));
    const b = await embed(normalizeForEmbedding("banana "));
    expect(a).toEqual(b);
  });

  it("puts a banana closer to another banana than to a detergent", async () => {
    const banana = await embed("banana");
    const prata = await embed("banana prata");
    const detergent = await embed("detergente");
    expect(cosine(banana, prata)).toBeGreaterThan(cosine(banana, detergent));
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

```bash
cd apps/api && pnpm vitest run src/modules/embeddings/__tests__/embed.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 7: Implement the model wrapper**

`embedding-model.ts`:

```ts
import { fileURLToPath } from "node:url";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

export const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
export const EMBEDDING_DIMENSIONS = 384;

// apps/api/.models/ — visible, gitignored, cached by CI keyed on the model name.
env.cacheDir = fileURLToPath(new URL("../../../.models/", import.meta.url));

let extractor: FeatureExtractionPipeline | undefined;

/**
 * Loads the model once. Called by the server before it listens and by the test setup
 * before the first request. A model that cannot load (no cache and no network, corrupt
 * files) throws here, so the boot fails fast instead of serving 500s on the first call.
 */
export const loadEmbeddingModel = async (): Promise<void> => {
  if (extractor) return;
  extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
};

/** The vector of an already-normalised text. Callers normalise with `normalizeForEmbedding`. */
export const embed = async (text: string): Promise<number[]> => {
  if (!extractor) throw new Error("embedding model not loaded: call loadEmbeddingModel() at boot");
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
};
```

`index.ts`:

```ts
export * from "@/modules/embeddings/normalize-for-embedding";
export * from "@/modules/embeddings/embedding-model";
```

In `vitest.config.ts`, add to the `test` block: `hookTimeout: 120_000,` (the first run downloads the model). Above `defineConfig`, next to the `DATABASE_URL` line, add:

```ts
// The scenario test is a regression guard on the calibrated default; an exported shell
// variable must not silently move it.
delete process.env.SEARCH_SIMILARITY_THRESHOLD;
``` In `test/setup.ts`, add:

```ts
import { beforeAll } from "vitest";
import { loadEmbeddingModel } from "@/modules/embeddings";

beforeAll(async () => {
  await loadEmbeddingModel();
});
```

- [ ] **Step 8: Run the embed test; the first run downloads the model**

```bash
cd apps/api && pnpm vitest run src/modules/embeddings/__tests__/embed.test.ts
ls .models
```

Expected: PASS; `.models/` holds the model folder. If `pipeline` rejects `dtype: "q8"` in this version, read `node_modules/@huggingface/transformers/README.md` § quantization and use the documented value for the quantised ONNX file; the test is the contract.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/embeddings apps/api/package.json apps/api/vitest.config.ts apps/api/test/setup.ts pnpm-lock.yaml .gitignore
git commit -m "feat(api): embedding module with Transformers.js MiniLM"
```

---

### Task 2: Load the model at boot; threshold in the environment

**Files:**
- Create: `apps/api/src/config/__tests__/env.test.ts`
- Modify: `apps/api/src/config/env.ts`, `apps/api/src/server/start.ts`, `apps/api/.env.example`, `.env.example`

**Interfaces:**
- Produces: `envSchema` exported beside `env`; `env.SEARCH_SIMILARITY_THRESHOLD: number`.

- [ ] **Step 1: Write the failing env test**

`src/config/__tests__/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { envSchema } from "@/config/env";

const base = { DATABASE_URL: "postgres://ecolheita:ecolheita@localhost:5432/ecolheita_test" };

describe("envSchema", () => {
  it("defaults the threshold to a float inside [-1, 1]", () => {
    const parsed = envSchema.parse(base);
    expect(parsed.SEARCH_SIMILARITY_THRESHOLD).toBeGreaterThanOrEqual(-1);
    expect(parsed.SEARCH_SIMILARITY_THRESHOLD).toBeLessThanOrEqual(1);
  });
  it("coerces a float string", () => {
    expect(envSchema.parse({ ...base, SEARCH_SIMILARITY_THRESHOLD: "0.55" }).SEARCH_SIMILARITY_THRESHOLD).toBe(0.55);
  });
  it.each(["abc", "1.5", "-2"])("refuses %s so the boot fails", (value) => {
    expect(() => envSchema.parse({ ...base, SEARCH_SIMILARITY_THRESHOLD: value })).toThrow();
  });
  it("treats an empty value as unset (the default), never as 0", () => {
    const parsed = envSchema.parse({ ...base, SEARCH_SIMILARITY_THRESHOLD: "" });
    expect(parsed.SEARCH_SIMILARITY_THRESHOLD).toBe(envSchema.parse(base).SEARCH_SIMILARITY_THRESHOLD);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd apps/api && pnpm vitest run src/config/__tests__/env.test.ts
```

Expected: FAIL (`envSchema` not exported, threshold missing).

- [ ] **Step 3: Implement**

`src/config/env.ts`:

```ts
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3333),
  // Cosine similarity floor for a search match (CONTEXT.md). Default chosen from the
  // banana scenario's similarity table — see the slice 2 pull request. An empty value
  // (`SEARCH_SIMILARITY_THRESHOLD=` in a .env) is unset, never 0.
  SEARCH_SIMILARITY_THRESHOLD: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().min(-1).max(1).default(0.6),
  ),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

`src/server/start.ts`, before `ensurePortAvailable`:

```ts
import { loadEmbeddingModel } from "@/modules/embeddings";

console.log("loading embedding model…");
await loadEmbeddingModel();
console.log("embedding model ready");
```

Add to both `.env.example` files a commented line, so a local `.env` copied from it does not pin a value that drifts from the calibrated default the tests use:

```
# Cosine similarity floor for search; unset means the API's calibrated default.
# SEARCH_SIMILARITY_THRESHOLD=0.6
```

- [ ] **Step 4: Give the e2e API server time to load the model**

In `e2e/playwright.config.ts`, the API `webServer` entry (copied in slice 1) has no `timeout`, so Playwright's 60-second default applies. From this slice the boot loads the model, and on a cold cache first downloads roughly 120 MB. Add to that entry, with the comment:

```ts
      // The API loads the embedding model before it listens; a cold model cache also
      // downloads it. Three minutes covers both on a runner.
      timeout: 180_000,
```

- [ ] **Step 5: Run the test and boot the server once**

```bash
cd apps/api && pnpm vitest run src/config/__tests__/env.test.ts && pnpm typecheck
SEARCH_SIMILARITY_THRESHOLD=abc pnpm start; echo "exit=$?"
```

Expected: PASS; the second command prints a Zod error and a non-zero exit before "api listening".

- [ ] **Step 6: Commit**

```bash
git add apps/api .env.example e2e/playwright.config.ts
git commit -m "feat(api): load embedding model at boot; SEARCH_SIMILARITY_THRESHOLD"
```

---

### Task 3: `embedding` column, extension migration, embedding on create, public columns

**Files:**
- Create: `apps/api/drizzle/0001_*.sql` (generated then edited), `apps/api/src/modules/products/__tests__/repository.test.ts`, `apps/api/src/modules/products/public-columns.ts`
- Modify: `apps/api/src/modules/products/model.ts`, `apps/api/src/modules/products/repository.ts`, `apps/api/src/modules/products/types.ts`, `apps/api/src/modules/products/utils/to-product.ts`, `apps/api/src/modules/products/__tests__/create-product.api.test.ts`

**Interfaces:**
- Produces: `products.embedding` (`vector(384)`, not null); `PRODUCT_PUBLIC_COLUMNS` (every column except `embedding`); `ProductRow` is now the public row shape; `productsRepository.create` embeds; `productsRepository.findEmbedding(id): Promise<number[] | undefined>` (test aid, also used by slice 3).

- [ ] **Step 1: Write the failing tests**

Append to `create-product.api.test.ts`:

```ts
  it("never serialises the embedding", async () => {
    const res = await json(base, "/products", { method: "POST", body: JSON.stringify(bananaPrata) });
    const body = await res.json();
    expect(body).not.toHaveProperty("embedding");
    const list = await (await fetch(`${base}/products`)).json();
    expect(list[0]).not.toHaveProperty("embedding");
    const one = await (await fetch(`${base}/products/${body.id}`)).json();
    expect(one).not.toHaveProperty("embedding");
  });
```

`__tests__/repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, embed, normalizeForEmbedding } from "@/modules/embeddings";
import { productsRepository } from "@/modules/products/repository";
import { bananaPrata } from "./fixtures";

describe("productsRepository.create", () => {
  it("stores the embedding of the normalised name", async () => {
    const created = await productsRepository.create({ ...bananaPrata, name: "  Banana   Prata " });
    const stored = await productsRepository.findEmbedding(created.id);
    expect(stored).toHaveLength(EMBEDDING_DIMENSIONS);
    const expected = await embed(normalizeForEmbedding("Banana Prata"));
    stored!.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 5));
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
cd apps/api && pnpm vitest run src/modules/products/__tests__/repository.test.ts src/modules/products/__tests__/create-product.api.test.ts
```

Expected: FAIL (`findEmbedding` missing; the serialisation test passes trivially until the column exists, which is fine).

- [ ] **Step 3: Add the column and generate the migration**

`model.ts`: add the import `vector` from `drizzle-orm/pg-core` and the column:

```ts
  // The normalised name's vector (CONTEXT.md). Written only by the repository's create/update.
  embedding: vector("embedding", { dimensions: 384 }).notNull(),
```

```bash
cd apps/api && pnpm db:generate && ls drizzle
```

Before touching the repository, see the serialisation test fail for real: with the column in the model and the repository still using a bare `.returning()` and `select()`, the inserted row now carries `embedding`, so run

```bash
cd apps/api && pnpm vitest run src/modules/products/__tests__/create-product.api.test.ts -t "never serialises"
```

Expected: FAIL (a typecheck error on the missing `embedding` value at insert, or a response that has the property). Only then continue.

Open the new `0001_*.sql`. Replace its content with (keep drizzle's generated `ALTER TABLE` line as the last statement):

```sql
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
TRUNCATE TABLE "products";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "embedding" vector(384) NOT NULL;
```

The truncate is deliberate (spec § Delivery slices): no environment carries slice 1 data that must survive, and a `NOT NULL` column cannot be added to a non-empty table without a default.

Apply it to the dev database now, so `pnpm seed` (Task 4) and the by-hand demo have the column:

```bash
cd apps/api && pnpm db:migrate
psql postgres://ecolheita:ecolheita@localhost:5432/ecolheita -c "\d products"
```

Expected: `embedding | vector(384) | not null` in the listing.

- [ ] **Step 4: Public columns, repository write path, types**

`public-columns.ts`:

```ts
import { products } from "@/modules/products/model";

/** Every column the API may return. `embedding` is never serialised. */
export const PRODUCT_PUBLIC_COLUMNS = {
  id: products.id,
  shopName: products.shopName,
  name: products.name,
  price: products.price,
  quantity: products.quantity,
  discountPercentage: products.discountPercentage,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};
```

`types.ts`:

```ts
import type { InferSelectModel } from "drizzle-orm";
import type { products } from "@/modules/products/model";

/** The public row: every column except `embedding`. */
export type ProductRow = Omit<InferSelectModel<typeof products>, "embedding">;

/** The API's product: the row plus the derived final price. */
export type Product = ProductRow & { finalPrice: number };
```

`repository.ts` (whole file):

```ts
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { embed, normalizeForEmbedding } from "@/modules/embeddings";
import { products } from "@/modules/products/model";
import { PRODUCT_PUBLIC_COLUMNS } from "@/modules/products/public-columns";
import type { CreateProductInput } from "@/modules/products/schema";
import type { Product } from "@/modules/products/types";
import { toProduct } from "@/modules/products/utils/to-product";

/**
 * Every products write goes through here, and every write embeds: a product without a
 * vector never exists (apps/api/AGENTS.md, the one deviation from "queries only").
 */
export const productsRepository = {
  async create(input: CreateProductInput): Promise<Product> {
    const embedding = await embed(normalizeForEmbedding(input.name));
    const [row] = await db.insert(products).values({ ...input, embedding }).returning(PRODUCT_PUBLIC_COLUMNS);
    return toProduct(row);
  },

  async findAll(): Promise<Product[]> {
    const rows = await db
      .select(PRODUCT_PUBLIC_COLUMNS)
      .from(products)
      .orderBy(desc(products.createdAt), desc(products.id));
    return rows.map(toProduct);
  },

  async findById(id: number): Promise<Product | undefined> {
    if (!Number.isInteger(id)) return undefined;
    const [row] = await db.select(PRODUCT_PUBLIC_COLUMNS).from(products).where(eq(products.id, id));
    return row ? toProduct(row) : undefined;
  },

  /** The stored vector, for tests and for slice 3's "re-embed only on rename" proof. */
  async findEmbedding(id: number): Promise<number[] | undefined> {
    const [row] = await db.select({ embedding: products.embedding }).from(products).where(eq(products.id, id));
    return row?.embedding ?? undefined;
  },
};
```

(`asc` is imported now for Task 5.) `utils/to-product.ts` needs no change beyond the `ProductRow` type.

- [ ] **Step 5: Run the whole API suite**

```bash
cd apps/api && pnpm test && pnpm typecheck && pnpm lint
```

Expected: green, including slice 1's tests. The migration ran through `test/global-setup.ts`.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): pgvector embedding column; repository embeds on create"
```

---

### Task 4: The banana fixture and the seed script

**Files:**
- Create: `apps/api/src/modules/products/fixtures/banana-scenario.ts`, `apps/api/src/db/seed.ts`, `apps/api/src/db/seed-cli.ts`, `apps/api/src/db/__tests__/seed.test.ts`
- Modify: `apps/api/package.json` (scripts `seed`)

**Interfaces:**
- Produces: `BANANA_SCENARIO` (eight rows keyed by `key`), `BANANA_QUERY = "banana"`, `EXPECTED_MATCH_KEYS_IN_ORDER`, `HARD_DECOY_KEYS`, `SOFT_DECOY_KEY`; `seedBananaScenario(): Promise<void>` (truncate then create each row through the repository); `pnpm --filter api seed`.

The fixture file is **alias-free and dependency-free** (plain data) so the e2e package can import it by relative path (spec's forwarded item, resolved here).

- [ ] **Step 1: Write the fixture**

`src/modules/products/fixtures/banana-scenario.ts`:

```ts
/**
 * The proof scenario (spec § The proof scenario). One copy of the truth: the API test,
 * the e2e test and the seed script all import this file. Prices in integer cents.
 */
export interface ScenarioRow {
  key: string;
  shopName: string;
  name: string;
  price: number;
  quantity: number;
  discountPercentage: number;
}

export const BANANA_SCENARIO: readonly ScenarioRow[] = [
  { key: "candelaria-banana", shopName: "Mercadinho Candelária", name: "Banana", price: 600, quantity: 10, discountPercentage: 50 },
  { key: "vec-banana-prata", shopName: "VEC Hortifruti", name: "Banana prata", price: 500, quantity: 10, discountPercentage: 30 },
  { key: "sao-jose-banana-nanica", shopName: "Hortifruti São José", name: "Banana nanica", price: 400, quantity: 10, discountPercentage: 10 },
  { key: "ceasa-banana-prata-organica", shopName: "CEASA SJC", name: "Banana prata orgânica", price: 800, quantity: 10, discountPercentage: 80 },
  { key: "candelaria-bananada", shopName: "Mercadinho Candelária", name: "Bananada", price: 300, quantity: 10, discountPercentage: 20 },
  { key: "vec-maca-argentina", shopName: "VEC Hortifruti", name: "Maçã argentina", price: 700, quantity: 10, discountPercentage: 40 },
  { key: "sao-jose-bolo-de-banana", shopName: "Hortifruti São José", name: "Bolo de banana", price: 1200, quantity: 10, discountPercentage: 30 },
  { key: "ceasa-carne-moida", shopName: "CEASA SJC", name: "Carne moída patinho", price: 3000, quantity: 10, discountPercentage: 80 },
];

export const BANANA_QUERY = "banana";

/** Hard tier: these four, in this order (final price 1,60 · 3,00 · 3,50 · 3,60). */
export const EXPECTED_MATCH_KEYS_IN_ORDER = [
  "ceasa-banana-prata-organica",
  "candelaria-banana",
  "vec-banana-prata",
  "sao-jose-banana-nanica",
];

/** Hard tier: never in the results. */
export const HARD_DECOY_KEYS = ["candelaria-bananada", "vec-maca-argentina", "ceasa-carne-moida"];

/** Expected-failure candidate: absent if the threshold can separate it. */
export const SOFT_DECOY_KEY = "sao-jose-bolo-de-banana";

export const scenarioRow = (key: string): ScenarioRow => {
  const row = BANANA_SCENARIO.find((r) => r.key === key);
  if (!row) throw new Error(`unknown scenario key ${key}`);
  return row;
};
```

- [ ] **Step 2: Write the failing seed test**

`src/db/__tests__/seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { seedBananaScenario } from "@/db/seed";
import { BANANA_SCENARIO } from "@/modules/products/fixtures/banana-scenario";
import { productsRepository } from "@/modules/products/repository";

describe("seedBananaScenario", () => {
  it("leaves exactly the fixture's rows in the table, each with a vector", async () => {
    await productsRepository.create({ shopName: "x", name: "leftover", price: 1, quantity: 1, discountPercentage: 0 });
    await seedBananaScenario();
    const all = await productsRepository.findAll();
    expect(all).toHaveLength(BANANA_SCENARIO.length);
    expect(new Set(all.map((p) => p.name))).toEqual(new Set(BANANA_SCENARIO.map((r) => r.name)));
    expect(await productsRepository.findEmbedding(all[0].id)).toHaveLength(384);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
cd apps/api && pnpm vitest run src/db/__tests__/seed.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 4: Implement seed and CLI**

`src/db/seed.ts`:

```ts
import { pool } from "@/db/client";
import { BANANA_SCENARIO } from "@/modules/products/fixtures/banana-scenario";
import { productsRepository } from "@/modules/products/repository";

/** Wipes products and inserts the banana scenario through the one write path. */
export const seedBananaScenario = async (): Promise<void> => {
  await pool.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
  for (const row of BANANA_SCENARIO) {
    const { key: _key, ...input } = row;
    await productsRepository.create(input);
  }
};
```

`src/db/seed-cli.ts`:

```ts
import "dotenv/config";
import { pool } from "@/db/client";
import { seedBananaScenario } from "@/db/seed";
import { loadEmbeddingModel } from "@/modules/embeddings";

await loadEmbeddingModel();
await seedBananaScenario();
console.log("seeded the banana scenario");
await pool.end();
```

`package.json` scripts: `"seed": "tsx src/db/seed-cli.ts"`.

- [ ] **Step 5: Run the test, then the CLI against the dev database**

```bash
cd apps/api && pnpm vitest run src/db/__tests__/seed.test.ts && pnpm seed
psql postgres://ecolheita:ecolheita@localhost:5432/ecolheita -c "SELECT id, shop_name, name FROM products ORDER BY id"
```

Expected: PASS; eight rows.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): banana scenario fixture and seed script"
```

---

### Task 5: `GET /products/search`

**Files:**
- Create: `apps/api/src/modules/products/search-schema.ts`, `apps/api/src/modules/products/resolvers/search-products-resolver.ts`, `apps/api/src/modules/products/__tests__/search-products.api.test.ts`
- Modify: `apps/api/src/modules/products/repository.ts`, `apps/api/src/modules/products/types.ts`, `apps/api/src/modules/products/resolvers/index.ts`, `apps/api/src/modules/products/routes.ts`

**Interfaces:**
- Produces: `SearchResult = Product & { similarity: number }`; `productsRepository.search(queryVector, { threshold, limit }): Promise<SearchResult[]>`; `searchQuerySchema` (`q` trimmed, 1..200); route `GET /products/search?q=` mounted **before** `/:id`.

- [ ] **Step 1: Write the failing contract test**

`__tests__/search-products.api.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

const create = (base: string, patch: Partial<typeof bananaPrata>) =>
  json(base, "/products", { method: "POST", body: JSON.stringify({ ...bananaPrata, ...patch }) }).then((r) => r.json());

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

  it("returns an empty list when nothing clears the threshold", async () => {
    await create(base, { name: "Detergente" });
    const res = await fetch(`${base}/products/search?q=banana`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns matches with finalPrice and similarity rounded to four places, without embedding", async () => {
    await create(base, { name: "Banana prata" });
    const [hit] = await (await fetch(`${base}/products/search?q=banana`)).json();
    expect(hit.finalPrice).toBe(350);
    expect(hit.similarity).toBe(Number(hit.similarity.toFixed(4)));
    expect(hit).not.toHaveProperty("embedding");
  });

  it("hides zero-stock products from search but not from the list", async () => {
    const soldOut = await create(base, { name: "Banana", price: 100, quantity: 0 });
    const inStock = await create(base, { name: "Banana prata" });
    const hits = await (await fetch(`${base}/products/search?q=banana`)).json();
    const ids = hits.map((h: { id: number }) => h.id);
    expect(ids).toContain(inStock.id); // the filter hides stock 0, not everything
    expect(ids).not.toContain(soldOut.id);
    const list = await (await fetch(`${base}/products`)).json();
    expect(list.map((p: { id: number }) => p.id)).toContain(soldOut.id);
  });

  it("orders by final price, then similarity, then id", async () => {
    const expensive = await create(base, { name: "Banana", price: 1000, discountPercentage: 0 });
    const cheapLessSimilar = await create(base, { name: "Banana nanica", price: 500, discountPercentage: 0 });
    const cheapMoreSimilar = await create(base, { name: "Banana", price: 500, discountPercentage: 0 });
    const cheapMoreSimilarLater = await create(base, { name: "Banana", price: 500, discountPercentage: 0 });
    const hits = await (await fetch(`${base}/products/search?q=banana`)).json();
    expect(hits.map((h: { id: number }) => h.id)).toEqual([
      cheapMoreSimilar.id,
      cheapMoreSimilarLater.id,
      cheapLessSimilar.id,
      expensive.id,
    ]);
  });

  it("caps at 20", async () => {
    for (let i = 0; i < 25; i++) await create(base, { name: "Banana", price: 100 + i });
    const hits = await (await fetch(`${base}/products/search?q=banana`)).json();
    expect(hits).toHaveLength(20);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd apps/api && pnpm vitest run src/modules/products/__tests__/search-products.api.test.ts
```

Expected: FAIL with 404s (`/products/search` reaches `/:id` and is not a number).

- [ ] **Step 3: Implement search**

`search-schema.ts`:

```ts
import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "q is required").max(200, "q is too long"),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
```

`types.ts`, append:

```ts
/** A search hit: the product plus its cosine similarity to the query, rounded to 4 places. */
export type SearchResult = Product & { similarity: number };
```

`repository.ts`, add imports `and, cosineDistance, gt, gte, sql` from `drizzle-orm` and the method:

```ts
  /**
   * Products whose name is close enough to the query vector, cheapest first
   * (CONTEXT.md: best price is the lowest final price). Zero stock never shows.
   */
  async search(
    queryVector: number[],
    { threshold, limit = 20 }: { threshold: number; limit?: number },
  ): Promise<SearchResult[]> {
    const similarity = sql<number>`1 - (${cosineDistance(products.embedding, queryVector)})`;
    const finalPriceSql = sql`round((${products.price} * (100 - ${products.discountPercentage}))::numeric / 100)`;
    const rows = await db
      .select({ ...PRODUCT_PUBLIC_COLUMNS, similarity })
      .from(products)
      .where(and(gte(similarity, threshold), gt(products.quantity, 0)))
      .orderBy(asc(finalPriceSql), desc(similarity), asc(products.id))
      .limit(limit);
    return rows.map(({ similarity, ...row }) => ({
      ...toProduct(row),
      similarity: Number(Number(similarity).toFixed(4)),
    }));
  },
```

(Import `SearchResult` from `@/modules/products/types`.)

`resolvers/search-products-resolver.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";
import { embed, normalizeForEmbedding } from "@/modules/embeddings";
import { productsRepository } from "@/modules/products/repository";
import { searchQuerySchema } from "@/modules/products/search-schema";

export const searchProductsResolver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { q } = searchQuerySchema.parse(req.query);
    const queryVector = await embed(normalizeForEmbedding(q));
    res.status(200).json(
      await productsRepository.search(queryVector, { threshold: env.SEARCH_SIMILARITY_THRESHOLD }),
    );
  } catch (err) {
    next(err);
  }
};
```

`resolvers/index.ts` gains the export. `routes.ts`, with `/search` **above** `/:id`:

```ts
productsRouter.get("/", resolvers.listProductsResolver);
productsRouter.post("/", resolvers.createProductResolver);
productsRouter.get("/search", resolvers.searchProductsResolver);
productsRouter.get("/:id", resolvers.getProductResolver);
```

- [ ] **Step 4: Run the tests**

```bash
cd apps/api && pnpm test && pnpm typecheck && pnpm lint
```

Expected: green. The scenario test is written in Task 7, together with the threshold it asserts, so no commit carries a known-red test.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): GET /products/search ordered by final price with a similarity floor"
```

---

### Task 6: Similarity table CLI

**Files:**
- Create: `apps/api/src/db/similarity-table-cli.ts`
- Modify: `apps/api/package.json` (script `similarity`)

A diagnostic script whose output goes in the PR body; its behaviour (one line per seeded row with its similarity to the query) is exercised by hand in Task 7. No test: it composes `seedBananaScenario`, `embed` and `search`, each already proven.

- [ ] **Step 1: Write the CLI**

```ts
import "dotenv/config";
import { pool } from "@/db/client";
import { seedBananaScenario } from "@/db/seed";
import { embed, loadEmbeddingModel, normalizeForEmbedding } from "@/modules/embeddings";
import { BANANA_QUERY } from "@/modules/products/fixtures/banana-scenario";
import { productsRepository } from "@/modules/products/repository";

const query = process.argv[2] ?? BANANA_QUERY;

await loadEmbeddingModel();
await seedBananaScenario();
const vector = await embed(normalizeForEmbedding(query));
// threshold -1 lists every row; the table is sorted by similarity here, not by price.
const rows = await productsRepository.search(vector, { threshold: -1, limit: 100 });
rows.sort((a, b) => b.similarity - a.similarity);

console.log(`| similarity | shop | name | final price |`);
console.log(`|---|---|---|---|`);
for (const r of rows) {
  console.log(`| ${r.similarity.toFixed(4)} | ${r.shopName} | ${r.name} | ${(r.finalPrice / 100).toFixed(2)} |`);
}
await pool.end();
```

`package.json` scripts: `"similarity": "tsx src/db/similarity-table-cli.ts"`.

- [ ] **Step 2: Run it and commit**

```bash
cd apps/api && pnpm similarity
git add apps/api
git commit -m "chore(api): similarity table CLI for threshold calibration"
```

---

### Task 7: The scenario test, calibrated against the table

**Files:**
- Create: `apps/api/src/modules/products/__tests__/search-scenario.api.test.ts`
- Modify: `apps/api/src/config/env.ts` (default), `apps/api/.env.example`, `.env.example`

**Interfaces:**
- Consumes: `seedBananaScenario`, the fixture's keys, `productsRepository.findAll`, `pnpm similarity`.

The threshold and the test that guards it are written together, so no commit carries a known-red test.

- [ ] **Step 1: Print the tables**

```bash
cd apps/api && pnpm similarity
cd apps/api && pnpm similarity maçã
```

From the first table note the lowest similarity among the four bananas (`min_match`) and the highest among the three hard decoys (bananada, maçã argentina, carne moída), and separately the similarity of "Bolo de banana". From the second table note the similarity of the "Banana" row to the query "maçã": slice 3 renames "Banana" to "Maçã" and expects it to leave the banana results, so bare "maçã" is one more value the default must exceed. `max_decoy` is the highest of the three hard decoys and the "maçã"-vs-"Banana" value.

- [ ] **Step 2: Choose the default**

- If `max_decoy < min_match` and "Bolo de banana" is also below `min_match`: default = the midpoint between `max_decoy` and `min_match`, rounded to two decimals. All scenario assertions will pass.
- If only "Bolo de banana" sits above `min_match`: default = the midpoint between `max_decoy` and `min_match`; the third scenario test below is written as `it.fails` and keeps its body. The hard tier stays green.
- If a hard decoy, or "maçã" against "Banana", cannot be separated from the four bananas by any threshold: stop. This is a design change (spec § Terminal states); report it with both tables. If it is the "maçã" case, the spec's slice 3 proof wording is what needs the decision.

Write the value into `env.ts`'s `.default(...)` and into the commented line of both `.env.example` files.

- [ ] **Step 3: Write the scenario test**

`__tests__/search-scenario.api.test.ts`:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";
import { seedBananaScenario } from "@/db/seed";
import {
  BANANA_QUERY,
  EXPECTED_MATCH_KEYS_IN_ORDER,
  HARD_DECOY_KEYS,
  SOFT_DECOY_KEY,
  scenarioRow,
} from "@/modules/products/fixtures/banana-scenario";
import { productsRepository } from "@/modules/products/repository";

type Hit = { id: number; name: string; shopName: string; similarity: number };

describe("the banana scenario", () => {
  let server: Server;
  let base: string;
  let idOf: (key: string) => number;
  let hits: Hit[];

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  beforeEach(async () => {
    await seedBananaScenario();
    const all = await productsRepository.findAll();
    idOf = (key) => {
      const row = scenarioRow(key);
      const found = all.find((p) => p.name === row.name && p.shopName === row.shopName);
      if (!found) throw new Error(`scenario row ${key} not seeded`);
      return found.id;
    };
    hits = await (await fetch(`${base}/products/search?q=${encodeURIComponent(BANANA_QUERY)}`)).json();
  });

  it("hard: the first four results are the four bananas, cheapest first", () => {
    expect(hits.slice(0, 4).map((h) => h.id)).toEqual(EXPECTED_MATCH_KEYS_IN_ORDER.map(idOf));
  });

  it("hard: bananada, maçã and carne moída are absent", () => {
    const ids = hits.map((h) => h.id);
    for (const key of HARD_DECOY_KEYS) expect(ids).not.toContain(idOf(key));
  });

  // If Task 7's similarity table shows no threshold keeps all four bananas and excludes
  // "bolo de banana", change `it` to `it.fails` and paste the table in the PR body
  // (spec § The proof scenario, expected-failure candidate).
  it("bolo de banana is absent, so the list is exactly the four bananas", () => {
    expect(hits.map((h) => h.id)).toEqual(EXPECTED_MATCH_KEYS_IN_ORDER.map(idOf));
    expect(hits.map((h) => h.id)).not.toContain(idOf(SOFT_DECOY_KEY));
  });
});
```

- [ ] **Step 4: Run the suite**

```bash
cd apps/api && pnpm test
```

Expected: green (an `it.fails` counts as green when it fails). If a hard assertion is red, revisit Step 2 before touching the test.

- [ ] **Step 5: Commit, with both tables in the message body**

```bash
git add apps/api .env.example
git commit -m "feat(api): banana scenario test; SEARCH_SIMILARITY_THRESHOLD default from its similarity table" -m "<paste both similarity tables here>"
```

The same tables go in the PR body under a "Similarity table" heading.

---

### Task 8: `CONTEXT.md` search rules and CI model cache

**Files:**
- Modify: `CONTEXT.md`, `.github/workflows/ci.yml`

- [ ] **Step 1: Append to `CONTEXT.md`, before "## Not in the model yet"**

```markdown
## Search

- **Embedded text** — the product's **normalised name only** (trimmed, lowercased,
  whitespace collapsed). Never the shop name; description and category are not inputs.
- **Similarity** — `1 - cosine_distance` between the query's vector and the product's,
  in `[-1, 1]`, higher is closer. Model: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`,
  384 dimensions, run in-process.
- **Threshold** — `SEARCH_SIMILARITY_THRESHOLD`: a row matches when its similarity is
  greater than or equal to it. The default was chosen from the banana scenario's
  similarity table and is a regression guard on that fixture, not evidence the model
  generalises.
- **Ranking** — matches are ordered by final price ascending, then similarity descending,
  then id ascending. Cap 20.
- **Zero stock** — a product with `quantity = 0` is never a search result; it is still listed
  on the products page.
- **A product without a vector never exists** — the repository embeds on every create and on
  every rename; it is the only write path.
```

- [ ] **Step 2: Cache the model in CI**

In `.github/workflows/ci.yml`, in both the `api` and `e2e` jobs, after `pnpm install --frozen-lockfile`, add:

```yaml
      - uses: actions/cache@v4
        with:
          path: apps/api/.models
          key: ${{ runner.os }}-hf-Xenova-paraphrase-multilingual-MiniLM-L12-v2
```

Also change the service image comment if any still says plain Postgres (it was already `pgvector/pgvector:pg16` from slice 1).

- [ ] **Step 3: Commit**

```bash
git add CONTEXT.md .github/workflows/ci.yml
git commit -m "docs: search rules in CONTEXT.md; ci: cache the embedding model"
```

---

### Task 9: Web search module: types, API, hook, and the four presentational components with stories

**Files:**
- Create: `apps/web/src/modules/products/hooks/use-product-search.ts`, `apps/web/src/modules/products/components/SearchForm.tsx`, `apps/web/src/modules/products/components/SearchForm.stories.tsx`, `apps/web/src/modules/products/components/SearchResultCard.tsx`, `apps/web/src/modules/products/components/SearchResultCard.stories.tsx`, `apps/web/src/modules/products/components/SearchEmptyState.tsx`, `apps/web/src/modules/products/components/SearchEmptyState.stories.tsx`, `apps/web/src/modules/products/components/SearchResults.tsx`, `apps/web/src/modules/products/components/SearchResults.stories.tsx`
- Modify: `apps/web/src/modules/products/types.ts`, `apps/web/src/modules/products/api.ts`, `apps/web/src/modules/products/api.test.ts`

**Interfaces:**
- Produces: `SearchResult = Product & { similarity: number }`; `productsAPI.search(q)`; `useProductSearch(query)`; `<SearchForm onSearch={(q) => void} />`; `<SearchResultCard result />`; `<SearchEmptyState query />`; `<SearchResults query results loading error />` where `query === ""` is the idle state.

- [ ] **Step 1: Types, API and its failing unit test**

`types.ts`, append:

```ts
export interface SearchResult extends Product {
  /** Cosine similarity to the query, 4 decimal places, from the API. */
  similarity: number;
}
```

`api.test.ts`, append:

```ts
  it("encodes the query into /products/search", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", { status: 200 }));
    await productsAPI.search("banana prata");
    expect(String(spy.mock.calls[0][0])).toMatch(/\/products\/search\?q=banana%20prata$/);
  });
```

Run `cd apps/web && pnpm test` → FAIL. Then in `api.ts`:

```ts
  search: (q: string) => request<SearchResult[]>(`/products/search?q=${encodeURIComponent(q)}`),
```

Run again → PASS.

- [ ] **Step 2: The hook**

`hooks/use-product-search.ts`:

```ts
"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { productsAPI } from "@/modules/products/api";

export const productSearchKey = (query: string) => ["products", "search", query] as const;

/** Runs only for a non-empty query; keeps the previous results on screen while a new query loads. */
export function useProductSearch(query: string) {
  return useQuery({
    queryKey: productSearchKey(query),
    queryFn: () => productsAPI.search(query),
    enabled: query !== "",
    placeholderData: keepPreviousData,
    // A failed search is reported at once; the person retries by searching again. The
    // default three retries would show "Buscando…" for seven seconds before the error.
    retry: false,
  });
}
```

- [ ] **Step 3: Write the failing stories**

`SearchForm.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { SearchForm } from "@/modules/products/components/SearchForm";

const meta = {
  component: SearchForm,
  tags: ["autodocs"],
  args: { onSearch: fn() },
} satisfies Meta<typeof SearchForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Enter submits the trimmed query. */
export const EnterSubmits: Story = {
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByRole("searchbox", { name: "Nome do produto" });
    await userEvent.type(input, "  banana  {Enter}");
    await expect(args.onSearch).toHaveBeenCalledWith("banana");
  },
};

/** The button submits too, and is at least 44 px tall. */
export const ButtonSubmits: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Nome do produto" }), "maçã");
    const button = c.getByRole("button", { name: "Buscar" });
    await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await userEvent.click(button);
    await expect(args.onSearch).toHaveBeenCalledWith("maçã");
  },
};

/** An empty or blank query is not submitted. */
export const BlankIsNotSubmitted: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Nome do produto" }), "   {Enter}");
    await userEvent.click(c.getByRole("button", { name: "Buscar" }));
    await expect(args.onSearch).not.toHaveBeenCalled();
  },
};
```

`SearchResultCard.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SearchResultCard } from "@/modules/products/components/SearchResultCard";
import type { SearchResult } from "@/modules/products/types";

const at = "2026-09-22T12:00:00.000Z";
const ceasa: SearchResult = {
  id: 4, shopName: "CEASA SJC", name: "Banana prata orgânica", price: 800, quantity: 10,
  discountPercentage: 80, finalPrice: 160, similarity: 0.8123, createdAt: at, updatedAt: at,
};

const meta = {
  component: SearchResultCard,
  tags: ["autodocs"],
  args: { result: ceasa },
} satisfies Meta<typeof SearchResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shop, name, struck original price, final price, badge, stock and the similarity as a muted number. */
export const DiscountedOffer: Story = {
  play: async ({ canvasElement }) => {
    const card = within(within(canvasElement).getByRole("article", { name: "Banana prata orgânica" }));
    await expect(card.getByText("CEASA SJC")).toBeInTheDocument();
    const struck = card.getByText("R$ 8,00");
    await expect(getComputedStyle(struck).textDecorationLine).toContain("line-through");
    await expect(card.getByText("R$ 1,60")).toBeInTheDocument();
    await expect(card.getByText("80% off")).toBeInTheDocument();
    await expect(card.getByText("10 un.")).toBeInTheDocument();
    await expect(card.getByText("similaridade 0,8123")).toBeInTheDocument();
  },
};
```

`SearchEmptyState.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SearchEmptyState } from "@/modules/products/components/SearchEmptyState";

const meta = {
  component: SearchEmptyState,
  tags: ["autodocs"],
  args: { query: "detergente" },
} satisfies Meta<typeof SearchEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The text names the query verbatim. */
export const NothingSimilar: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Nenhum produto parecido com “detergente”.")).toBeInTheDocument();
  },
};
```

`SearchResults.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SearchResults } from "@/modules/products/components/SearchResults";
import type { SearchResult } from "@/modules/products/types";

const at = "2026-09-22T12:00:00.000Z";
const result = (id: number, shopName: string, name: string, finalPrice: number): SearchResult => ({
  id, shopName, name, price: finalPrice * 2, quantity: 10, discountPercentage: 50, finalPrice,
  similarity: 0.7, createdAt: at, updatedAt: at,
});
const bananas = [
  result(4, "CEASA SJC", "Banana prata orgânica", 160),
  result(1, "Mercadinho Candelária", "Banana", 300),
  result(2, "VEC Hortifruti", "Banana prata", 350),
];

const meta = {
  component: SearchResults,
  tags: ["autodocs"],
  args: { query: "banana", results: bananas, loading: false, error: null },
} satisfies Meta<typeof SearchResults>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the first search: a prompt, no cards, no empty state. */
export const Idle: Story = {
  args: { query: "", results: [] },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Digite o nome de um produto")).toBeInTheDocument();
    await expect(c.queryAllByRole("article")).toHaveLength(0);
    await expect(c.queryByText(/Nenhum produto parecido/)).toBeNull();
  },
};

/** Cards in the order given, cheapest first. */
export const CheapestFirst: Story = {
  play: async ({ canvasElement }) => {
    const names = within(canvasElement).getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    await expect(names).toEqual(["Banana prata orgânica", "Banana", "Banana prata"]);
  },
};

/** Loading keeps the previous cards on screen and says it is loading. */
export const LoadingKeepsPreviousResults: Story = {
  args: { loading: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("status")).toHaveTextContent("Buscando…");
    await expect(c.getAllByRole("article")).toHaveLength(3);
  },
};

/** A failed request shows the error and keeps the previous cards. */
export const FailedKeepsPreviousResults: Story = {
  args: { error: "Não foi possível buscar. Tente novamente." },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent("Não foi possível buscar. Tente novamente.");
    await expect(c.getAllByRole("article")).toHaveLength(3);
  },
};

/** Nothing matched: the empty state with the query. */
export const NothingMatched: Story = {
  args: { query: "detergente", results: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Nenhum produto parecido com “detergente”.")).toBeInTheDocument();
  },
};
```

- [ ] **Step 4: Run the stories to verify they fail**

```bash
cd apps/web && pnpm test:stories
```

Expected: FAIL, components not found.

- [ ] **Step 5: Write the four components**

`SearchForm.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button, TextInput } from "@mantine/core";

export interface SearchFormProps {
  onSearch: (query: string) => void;
}

/** Presentational: one search box; blank queries never leave the form. */
export function SearchForm({ onSearch }: SearchFormProps) {
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const query = value.trim();
    if (query === "") return;
    onSearch(query);
  };

  return (
    <form role="search" onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <TextInput
        type="search"
        label="Nome do produto"
        placeholder="banana"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        className="flex-1"
        size="md"
      />
      <Button type="submit" size="md" h={44}>
        Buscar
      </Button>
    </form>
  );
}
```

`SearchResultCard.tsx`:

```tsx
"use client";

import { Badge, Card, Text } from "@mantine/core";
import type { SearchResult } from "@/modules/products/types";
import { formatBRL } from "@/modules/products/utils/format-brl";

export interface SearchResultCardProps {
  result: SearchResult;
}

/** One offer. The similarity is shown so a person can judge a miss or a false hit. */
export function SearchResultCard({ result }: SearchResultCardProps) {
  const discounted = result.discountPercentage > 0;
  return (
    <Card component="article" aria-label={result.name} withBorder radius="md" className="grid gap-1 tabular-nums">
      <Text size="sm" c="dimmed">
        {result.shopName}
      </Text>
      <Text fw={600}>{result.name}</Text>
      <div className="flex items-baseline gap-2">
        {discounted && (
          <Text component="span" size="sm" c="dimmed" td="line-through">
            {formatBRL(result.price)}
          </Text>
        )}
        <Text component="span" size="lg" fw={700}>
          {formatBRL(result.finalPrice)}
        </Text>
        {discounted && <Badge color="green">{result.discountPercentage}% off</Badge>}
      </div>
      <div className="flex justify-between">
        <Text size="sm">{result.quantity} un.</Text>
        <Text size="xs" c="dimmed">
          similaridade {result.similarity.toFixed(4).replace(".", ",")}
        </Text>
      </div>
    </Card>
  );
}
```

`SearchEmptyState.tsx`:

```tsx
import { Text } from "@mantine/core";

export interface SearchEmptyStateProps {
  query: string;
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return <Text c="dimmed">Nenhum produto parecido com “{query}”.</Text>;
}
```

`SearchResults.tsx`:

```tsx
"use client";

import { Text } from "@mantine/core";
import { SearchEmptyState } from "@/modules/products/components/SearchEmptyState";
import { SearchResultCard } from "@/modules/products/components/SearchResultCard";
import type { SearchResult } from "@/modules/products/types";

export interface SearchResultsProps {
  /** "" means no search has been submitted yet (idle). */
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
}

/** Presentational: idle, loading and error keep whatever cards are already on screen. */
export function SearchResults({ query, results, loading, error }: SearchResultsProps) {
  if (query === "") {
    return <Text c="dimmed">Digite o nome de um produto</Text>;
  }
  const showEmpty = !loading && !error && results.length === 0;
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
      {showEmpty && <SearchEmptyState query={query} />}
      {results.map((r) => (
        <SearchResultCard key={r.id} result={r} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run the stories, typecheck, lint**

```bash
cd apps/web && pnpm test:stories && pnpm typecheck && pnpm lint
```

Expected: PASS. If Mantine's `TextInput type="search"` does not expose the `searchbox` role, keep `type="search"` on the underlying input via Mantine's `inputProps` or query by `getByLabelText("Nome do produto")` in the stories; the accessible name is the contract.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/modules/products
git commit -m "feat(web): search components with stories, search API and hook"
```

---

### Task 10: Search page container and the scenario e2e

**Files:**
- Create: `apps/web/src/modules/products/components/SearchPageContainer.tsx`, `e2e/modules/products/search-banana.test.ts`
- Modify: `apps/web/src/app/buscar/page.tsx`

**Interfaces:**
- Consumes: `useProductSearch`, `SearchForm`, `SearchResults`; the fixture by relative path `../../../apps/api/src/modules/products/fixtures/banana-scenario`; `seedProduct` from the e2e fixtures.

- [ ] **Step 1: Write the failing e2e**

`e2e/modules/products/search-banana.test.ts`:

```ts
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { seedProduct } from "../../fixtures/seed";
import {
  BANANA_QUERY,
  BANANA_SCENARIO,
  EXPECTED_MATCH_KEYS_IN_ORDER,
  HARD_DECOY_KEYS,
  SOFT_DECOY_KEY,
  scenarioRow,
} from "../../../apps/api/src/modules/products/fixtures/banana-scenario";

async function seedScenario(request: APIRequestContext) {
  for (const row of BANANA_SCENARIO) {
    const { key: _key, ...input } = row;
    await seedProduct(request, input);
  }
}

test.describe("searching for banana", () => {
  test.beforeEach(async ({ request, page }) => {
    await seedScenario(request);
    await page.goto("/buscar");
    await expect(page.getByText("Digite o nome de um produto")).toBeVisible();
    await page.getByRole("searchbox", { name: "Nome do produto" }).fill(BANANA_QUERY);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("hard: the four bananas come first, cheapest first, and the hard decoys are absent", async ({ page }) => {
    const names = await page.getByRole("article").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    expect(names.slice(0, 4)).toEqual(EXPECTED_MATCH_KEYS_IN_ORDER.map((k) => scenarioRow(k).name));
    for (const key of HARD_DECOY_KEYS) expect(names).not.toContain(scenarioRow(key).name);
    await expect(page.getByRole("article").first()).toContainText("R$ 1,60");
  });

  // If the similarity table shows "bolo de banana" cannot be separated, add
  // `test.fail();` as the first line of this test and keep its body (spec § The proof scenario).
  test("bolo de banana is absent, so the list is exactly the four bananas", async ({ page }) => {
    const names = await page.getByRole("article").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    expect(names).toEqual(EXPECTED_MATCH_KEYS_IN_ORDER.map((k) => scenarioRow(k).name));
    expect(names).not.toContain(scenarioRow(SOFT_DECOY_KEY).name);
  });

  // Relies on `retry: false` in useProductSearch: the alert must appear inside Playwright's
  // five-second expect window, not after react-query's default retries.
  test("a failed search shows an error and keeps the previous results", async ({ page }) => {
    const before = await page.getByRole("article").count();
    expect(before).toBeGreaterThanOrEqual(4);
    await page.route("**/products/search**", (route) => route.abort());
    await page.getByRole("searchbox", { name: "Nome do produto" }).fill("maçã");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("alert")).toHaveText("Não foi possível buscar. Tente novamente.");
    await expect(page.getByRole("article")).toHaveCount(before);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm e2e
```

Expected: FAIL (the placeholder page has no search box).

- [ ] **Step 3: Write the container and wire the page**

`SearchPageContainer.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { SearchForm } from "@/modules/products/components/SearchForm";
import { SearchResults } from "@/modules/products/components/SearchResults";
import { useProductSearch } from "@/modules/products/hooks/use-product-search";
import type { SearchResult } from "@/modules/products/types";

/** Container: owns the submitted query and the fetch; renders the presentational pieces. No story. */
export function SearchPageContainer() {
  const [query, setQuery] = useState("");
  const { data, isFetching, error } = useProductSearch(query);
  // `keepPreviousData` only bridges the pending state; once a query settles as an error,
  // `data` is undefined. The last good list is kept here so a failure keeps the cards on
  // screen (spec § Web, search page states).
  const [lastResults, setLastResults] = useState<SearchResult[]>([]);
  useEffect(() => {
    if (data !== undefined) setLastResults(data);
  }, [data]);

  return (
    <main className="container mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Buscar</h1>
      <div className="grid gap-6">
        <SearchForm onSearch={setQuery} />
        <SearchResults
          query={query}
          results={data ?? lastResults}
          loading={isFetching}
          error={error ? "Não foi possível buscar. Tente novamente." : null}
        />
      </div>
    </main>
  );
}
```

`src/app/buscar/page.tsx`:

```tsx
import { SearchPageContainer } from "@/modules/products/components/SearchPageContainer";

export default function BuscarPage() {
  return <SearchPageContainer />;
}
```

- [ ] **Step 4: Run every gate**

```bash
pnpm e2e && pnpm test && pnpm test:stories && pnpm typecheck && pnpm lint && pnpm prettier --check . && pnpm build
```

Expected: green. Apply the same `test.fail()` decision to the e2e soft test as Task 7 applied to the API scenario test, and no other.

- [ ] **Step 5: Commit and push**

```bash
git add apps/web e2e
git commit -m "feat(web): search page proves the banana scenario end to end"
git push -u origin feat/product-vector-search-slice-2
```

The PR body (opened by `/implement-stack`) carries `Plan: docs/superpowers/plans/2026-09-22-product-vector-search-slice-2-search-by-meaning.md`, the similarity table from Task 6, the chosen default, and, if used, which assertion is an expected failure and why.
