# Product vector search — design

**Feature key:** `product-vector-search` · **Branch:** `feat/product-vector-search`
**Reviewed:** round 1 (2026-09-22) · round 2 (2026-09-22).
**Deferred follow-ups:** [#2 units and pack sizes](https://github.com/leonardosarmentocastro/poc-ecolheita/issues/2) · [#3 shop and batch grouping](https://github.com/leonardosarmentocastro/poc-ecolheita/issues/3)

## Goal

Prove that products registered under different names by different shops ("banana",
"banana prata", "banana nanica") can be found as the same product and ranked by best final
price, using Postgres vector search. The original Ecolheita app could not do this: its
products model excluded shop-created products from the offers feed because, in its own
words, "we can't match same products created by different shops".

This is retrieval only. There is no language-model generation step, so it is vector (semantic)
search, not RAG.

### Success criterion

One seeded scenario, written down here before any code exists, passes as an HTTP test and as
an end-to-end test, and a person can reproduce it by hand in the browser: search "banana" and
see the four bananas, cheapest first, with none of the decoys.

## Non-goals

- Units and pack sizes: every price is assumed to be for the same implicit unit (#2).
- Shops as an entity, batches, expiry dates, distance, pickup, basket, orders, auth (#3).
- The original app's discount conditions by expiry date or category. A plain percentage only.
- Hybrid keyword search, category taxonomy, images, descriptions, pagination.
- Any production deployment concern beyond "runs with `docker compose up` and `pnpm dev`".

## The proof scenario

All names in Portuguese, typed as a shop would type them. Prices in BRL; the table shows reais
for readability, the fixture stores cents.

| # | Shop | Name | Price | Discount | Final price | Role |
|---|---|---|---|---|---|---|
| 1 | Mercadinho Candelária | Banana | 6,00 | 50% | 3,00 | match |
| 2 | VEC Hortifruti | Banana prata | 5,00 | 30% | 3,50 | match |
| 3 | Hortifruti São José | Banana nanica | 4,00 | 10% | 3,60 | match |
| 4 | CEASA SJC | Banana prata orgânica | 8,00 | 80% | 1,60 | match |
| 5 | Mercadinho Candelária | Bananada | 3,00 | 20% | 2,40 | decoy |
| 6 | VEC Hortifruti | Maçã argentina | 7,00 | 40% | 4,20 | decoy |
| 7 | Hortifruti São José | Bolo de banana | 12,00 | 30% | 8,40 | decoy |
| 8 | CEASA SJC | Carne moída patinho | 30,00 | 80% | 6,00 | decoy |

Every row has stock quantity 10 unless a test says otherwise.

**Expected result for the query "banana":** rows 4, 1, 2, 3 in that order, and nothing else.

What the ordering proves: the deepest discount (row 4) wins, but row 1 at 50% beats row 2 at
30% only because of its base price, so "best price" is lowest final price, never highest
discount percentage. Row 5 has the lowest final price of all and must still not appear: it
is a different product.

**Known risk, and what happens if it lands.** Row 7 contains the word "banana" and a
sentence model may place it close to the query. The assertions are therefore in two tiers:

- **Hard:** the first four results are rows 4, 1, 2, 3 in that order, and rows 5, 6 and 8
  are absent. Slice 2 does not merge while any of these fails.
- **Expected-failure candidate:** the result list is exactly `[4, 1, 2, 3]`, which is to say
  row 7 is absent. If no threshold keeps all four
  bananas and excludes row 7, the implementer marks that one assertion as an explicit
  expected failure (Vitest `test.fails`, Playwright `test.fail()`), puts the similarity table
  in the slice 2 pull request body, and the slice merges. Hybrid search stays a follow-up
  issue, not a slice of this feature.

The threshold test is a regression guard on a default chosen from this fixture. It is not
evidence that the model generalises to other products.

The scenario is **one fixture file** in the API, imported by the API test, the e2e test and the
seed script. There is exactly one copy of the truth.

## Architecture

A pnpm and turbo monorepo copied from `treasury-2`, two apps and one e2e folder:

```
apps/api    Express 5 · Drizzle · pg · Zod · Vitest over HTTP · Transformers.js
apps/web    Next 16 · Mantine + Tailwind v4 · react-query · react-hook-form · Storybook
e2e/        Playwright, own database, production web build
```

Postgres 16 runs from docker compose on the `pgvector/pgvector:pg16` image. Slice 1's
migration creates the `products` table; slice 2's migration runs
`CREATE EXTENSION IF NOT EXISTS vector` and adds the column. Nothing else in the copied
setup changes.

### How a search works, end to end

1. The web search page sends `GET /products/search?q=banana`.
2. The resolver normalises the query text and asks the embedding module for its vector.
3. The repository runs one SQL query: cosine distance between the query vector and every
   product's stored vector, keep rows whose similarity clears the threshold and whose stock is
   above zero, order by final price ascending, cap at 20.
4. The response carries each row with its `finalPrice` and `similarity`.

If the loaded model throws at run time on a text, the request fails with `500` through the
central handler and, on create or update, no row is written. A model that cannot load at
all is a boot failure, handled below, never a `500`.

Producing the vector is the only machine-learning step. Everything else is ordinary database
work: one column, one operator.

### Embedding module (`apps/api/src/modules/embeddings/`)

Three public functions: `loadEmbeddingModel(): Promise<void>`, called once by the server
boot before listening and by the API test setup before the first request;
`embed(text: string): Promise<number[]>`; and one normaliser, `normalizeForEmbedding(text)`:
trim, lowercase, collapse whitespace. Every caller normalises through the same function, so
"Banana" and "banana " give identical vectors.

**One write path.** The products repository's `create` and `update` take the raw validated
input, normalise and embed the name, and insert or update in one place. The create and
update resolvers, the seed script and the API test all write through those two functions,
so "a product without a vector never exists" has exactly one owner. This is a deliberate
deviation from treasury-2's "repository holds queries only" rule for this one module, and
`apps/api/AGENTS.md` says so.

- Runtime: `@huggingface/transformers` (Transformers.js) in-process, CPU, `feature-extraction`
  pipeline with mean pooling and normalisation.
- Model: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, 384 dimensions, multilingual
  including Portuguese, quantised weights of roughly 120 MB.
- The pipeline is loaded once, at API boot, before the server starts listening, and reused.
  A boot that cannot load the model (no cache and no network, corrupt files) fails fast with
  a clear message instead of serving `500`s on the first call. The first boot with a cold
  cache downloads roughly 120 MB; later boots load from disk in a few seconds.
- Model files are cached under `apps/api/.models/` (gitignored). CI caches that folder keyed
  by model name so the download happens once.
- The module is the seam: swapping to Ollama or a hosted embedding API later is a change to
  this module only. The dimension is a constant exported from it and used by the model
  definition.

**What is embedded:** the normalised product name only. The shop name never enters the vector,
so two unrelated products from the same shop do not look alike. Description and category are
follow-ups, not inputs.

**When:** synchronously inside the repository's `create` and `update`, before the row is
written. Search never handles a missing embedding. On update the vector is recomputed only
when the **normalised** name changes, so "Banana" to "banana " does not re-embed.

### Similarity threshold

Similarity is `1 - cosine_distance`, in `[-1, 1]`; higher is closer. A row matches when its
similarity is **greater than or equal to** the threshold. Matches are ordered by final price
ascending, then similarity descending, then id ascending, so the order is total.

- Read once at boot from `SEARCH_SIMILARITY_THRESHOLD`, a float, with a default in the API
  config module.
- The default is chosen empirically in slice 2: the implementer runs the seed scenario,
  prints the similarity of every row against "banana", and picks the value from the gap
  between the last match (row 3 or whichever is lowest) and the first decoy. That table goes
  in the pull request body.
- The scenario test asserts the expected ranking under the default. Changing the default
  without re-checking the scenario turns the test red.
- The web never knows the threshold exists; it shows each result's similarity so a person can
  eyeball misses and false hits.

## Data model

One flat table, `products`:

| Column | Type | Notes |
|---|---|---|
| `id` | serial / integer PK | as treasury-2 |
| `shop_name` | text, not null | free text typed at registration |
| `name` | text, not null | the text that is embedded |
| `price` | integer, not null | cents, `>= 0` |
| `quantity` | integer, not null | stock available, `>= 0` |
| `discount_percentage` | integer, not null | `0..100` |
| `embedding` | `vector(384)`, not null | never serialised |
| `created_at`, `updated_at` | timestamps | as treasury-2 |

Derived, never stored: `finalPrice = round(price * (100 - discountPercentage) / 100)` in
cents, rounding half up. The API computes it; the web never computes a final price.

**Duplicates are allowed.** Two rows with the same shop and name are two offers and both
appear in search. There is no uniqueness constraint; the real flow (#3) has several batches
of one product at one shop, and this matches it.

**Durable rules.** Specs are wiped after merge, so the rules above that must outlive this
feature get a permanent home: slice 1 creates `CONTEXT.md` with the product row, the final
price formula and rounding, "best price means lowest final price" and "duplicates are two
offers"; slice 2 appends the similarity definition, the threshold's meaning, "the embedded
text is the normalised name only" and the zero-stock exclusion. Slice 1 also writes
`apps/api/AGENTS.md` and `apps/web/AGENTS.md` adapted from treasury-2.

No index on `embedding` for the POC: a sequential scan over a handful of rows is instant. An
HNSW index is the follow-up when the table grows.

## API contract

Treasury-2 resolver pattern: one file per operation, Zod on the body, repository owns every
query, central error handler maps `ZodError → 400`, `NotFoundError → 404`, else `500`.

| Method and path | Behaviour |
|---|---|
| `GET /products` | Every product, newest first, each with `finalPrice`. No pagination. |
| `POST /products` | Body `{ shopName, name, price, quantity, discountPercentage }`. Embeds the name, inserts, returns `201` with the row. |
| `GET /products/:id` | One product with `finalPrice`, or `404`. |
| `PATCH /products/:id` | Partial body of the same fields. Re-embeds when the normalised name changes. Returns the row, or `404`. |
| `DELETE /products/:id` | `204`, or `404`. |
| `GET /products/search?q=` | Matches cheapest first, each with `finalPrice` and `similarity`. Empty `q` (missing or whitespace) or longer than 200 characters is `400`. Nothing above threshold is `200 []`. Zero-stock rows are excluded. Cap 20. |

`/products/search` is mounted before `/products/:id` so "search" is never read as an id.
`POST /products` never rejects a duplicate (see Data model).

The response shape of a product is the row minus `embedding`, plus `finalPrice`; search rows
add `similarity` as a JSON number rounded to four decimal places. Prices in and out are
integer cents. Validation: strings trimmed and non-empty, integers as stated above.

## Web

Two pages in Portuguese, code and routes in English, a header with two links, no auth.

**Products page (`/produtos`).** A table of every product: shop, name, price struck through
when discounted, final price, discount badge, stock. A "Novo produto" button opens a Mantine
drawer with the form: shop name, name, price typed in reais and parsed to integer cents by the
form schema before it reaches the API client, quantity, discount percentage. Slice 3 adds edit
(same drawer, prefilled) and delete with a confirm dialog. react-hook-form plus Zod, as
treasury-2.

States: the table shows a loading indicator until the list arrives and an inline error
message if the request fails. The drawer validates with its Zod schema before submitting,
disables its submit while the request is in flight, shows a generic inline error on any
non-2xx response, and closes and refreshes the table on success.

**Search page (`/buscar`).** One text input, submit on Enter or button. Results as cards,
cheapest first: shop, name, original price struck through, final price, discount badge, stock,
and the similarity as a small muted number. An empty state ("Nenhum produto parecido com
'…'") when the list is empty. This page is the demo.

States: before the first search the page shows only the form and a one-line prompt
("Digite o nome de um produto"), no cards and no empty state. While a query runs the page
shows a loading indicator and keeps the previous results visible; on an API or network
failure it shows an inline error and keeps the previous results. Because the model is loaded
at API boot, no request pays the warm-up.

Money is displayed as "R$ 4,99" through a helper like treasury-2's. Accessibility and
styling rules from treasury-2's web `AGENTS.md` apply to every new component (they are all
new, so nothing is grandfathered).

## Testing

Tiers as treasury-2: `unit > story + play() > e2e`, TDD for every behaviour, gates run before
a PR opens. Slice 1 names them in `AGENTS.md` under "Local gates": `pnpm test`,
`pnpm test:stories`, `pnpm e2e`.

- **API (`apps/api`, Vitest over HTTP).** Every route in `modules/products/__tests__/`.
  The search test loads the fixture through the repository and asserts the exact id order for
  "banana" and the absence of every decoy. **The real model runs in tests**, not a mock: the
  scenario is meaningless with fake vectors. The embedding module has its own test proving
  normalisation and the 384-length output.
- **Web unit.** Money formatting, form schema, API client.
- **Stories.** Every presentational component under `modules/products/components/` has
  co-located stories whose `play()` asserts a visible criterion. Containers that fetch
  (`ProductsPageContainer`, `SearchPageContainer`) are excluded from stories and render the
  presentational components below with everything as props.

  | Slice | Component | What its stories assert in `play()` |
  |---|---|---|
  | 1 | `ProductsTable` | one row per product; original price struck through only when discount is above zero; discount badge text; final price formatted "R$ 3,00"; stock shown; loading and error states |
  | 1 | `ProductForm` (drawer) | required fields rejected with a visible message; reais input becomes cents in the submitted value; submit disabled while pending; generic error shown inline on failure |
  | 2 | `SearchForm` | empty query is not submitted; submit on Enter |
  | 2 | `SearchResults` | idle: prompt text, no cards, no empty state; cards in the order given, cheapest first; loading keeps previous cards; error message shown with previous cards |
  | 2 | `SearchResultCard` | shop, name, struck original price, final price, discount badge, stock, similarity rendered as a muted number |
  | 2 | `SearchEmptyState` | text contains the query verbatim |
  | 3 | `ProductForm` | prefilled values in edit mode |
  | 3 | `DeleteProductDialog` | labelled dialog, Escape cancels, confirm calls the handler |

  The slice plans name each story; the table above is the contract the plan review checks.
- **E2E.** Slice 1: create a product through the drawer and see it in the table. Slice 2:
  seed the scenario by `POST /products` per fixture row against the e2e API, search "banana",
  assert the four cards in order and no decoy (row 7 under the expected-failure rule above).
  Slice 3: rename a banana to "maçã" and see it leave the results.
- **Seed.** `pnpm --filter api seed` truncates `products` and inserts the fixture through the
  repository's `create`, the one write path, so seeded rows carry the same vectors as rows
  created through the API. Its proof is one small test: after running, the table holds
  exactly the fixture's rows.

## Repository standards adopted from treasury-2

Copied: pnpm workspace and turbo, `apps/api` and `apps/web` layouts and their `AGENTS.md`
conventions (adapted to this domain), eslint and prettier configs, lefthook, `.env.example`,
docker compose (image swapped), Vitest harness with per-test truncation, Storybook story
regime, Playwright e2e with dedicated ports and database, the CI workflow with its `gate`
job and the docs-wipe workflow.

Not copied: the `main` branch ruleset, the owl docs generator, the vendored shadcn
primitives, the calendar package, and every payroll domain module.

Databases: `ecolheita`, `ecolheita_test`, `ecolheita_e2e`. Ports: API 3333, web 3000, e2e
4333 and 4300. The pgvector image is the only infrastructure difference.

## Delivery slices

Feature branch `feat/product-vector-search` off `main`. Three slices, each a stacked branch
and PR against its parent, proof before completeness.

| Slice | Owns | Proof |
|---|---|---|
| 1 `register-and-list` | The monorepo scaffold, pgvector Postgres, the `products` table and migration, `POST` and `GET /products`, the products page with table and create drawer, the API, story and e2e harnesses, `AGENTS.md` local gates, `CONTEXT.md` and the two app `AGENTS.md`. | Create a product through the UI and see it listed. |
| 2 `search-by-meaning` | The embedding module and model loaded at boot, `CREATE EXTENSION vector`, the `embedding` column, embedding on create, `GET /products/search`, the threshold, the fixture, the seed script, the search page, the search rules appended to `CONTEXT.md`. | The banana scenario ranks as expected, at HTTP and in the browser. |
| 3 `edit-and-delete` | `PATCH` and `DELETE /products/:id`, re-embedding on rename, the edit drawer and delete confirm. | Rename "Banana" to "Maçã" and watch it leave the banana results. |

Slice 1 crosses the twenty-file tripwire because the scaffold is unavoidable; its plan says
so in one line. Slice 1 ships the table **without** the `embedding` column; slice 2 adds the
extension and the column in its own migration. That migration truncates `products` before
adding the `not null` column, because no environment carries slice 1 data that must survive
and a `not null` column cannot be added to a non-empty table without a default. Slice 2 also
adds the embedding step to the create resolver, so from slice 2 on a product without a
vector never exists.

## Known follow-ups (not in this feature)

- **Units and pack sizes** — #2.
- **Shop entity, batches, expiry, distance, basket** — #3.
- **Hybrid search.** If the threshold cannot separate "bolo de banana" from the bananas, add a
  `pg_trgm` or full-text score and combine it with the vector score.
- **Richer embedded text.** Add a short category word or description to the embedded text if
  name-only proves too coarse. One-line change behind the module seam.
- **Index.** HNSW on `embedding` when the table grows.
- **Model swap.** `multilingual-e5-small` or a hosted API, behind the same `embed()` seam.

## Decisions and declined alternatives

Settled in the grill session of 2026-09-22 and the spec review round 1.

- **If "bolo de banana" cannot be separated, its exclusion is an explicit expected failure**
  and slice 2 still merges; hybrid search is not pulled into this feature (review round 1,
  finding 1; the alternative, blocking slice 2 on a hybrid slice, was declined for scope).
- **Duplicates of the same shop and name are allowed** as two offers (review round 1,
  finding 5; a unique constraint with `409` was declined because #3 wants several batches).
- **The products repository owns the embedding step** (review round 2, finding 1). The
  alternative, a separate service function that resolver, seed and test all import, was
  declined as one more layer for the same guarantee.
- **The hard assertion is prefix order, not exact list** (review round 2, finding 2), so the
  row 7 expected failure and the hard tier can both hold.
- **Declined, wrong gate, forwarded to the plan gate:** what the API does when
  `SEARCH_SIMILARITY_THRESHOLD` is not a float or outside `[-1, 1]` (recommend fail at boot);
  which fixture row the zero-stock search test sets to zero stock; how the e2e package
  imports the fixture from the API package (relative path or workspace dependency).

- **Proof is one written scenario with an expected ranking**, seeded and asserted at HTTP and
  e2e, reproducible by hand.
- **Cultivars count as the same product** (recall over precision for the food-waste use case);
  decoys are different products that share letters.
- **Embeddings in-process via Transformers.js**, not Ollama and not a hosted API: keeps the
  stack at Postgres plus Node, deterministic tests, no key, no extra service to deploy.
- **Vector-only search** with a threshold; hybrid is a recorded follow-up.
- **One flat products table with a free-text shop name**; units, shops and batches deferred to
  #2 and #3.
- **Order by final price ascending**, threshold-filtered, similarity exposed, zero stock hidden,
  empty list when nothing matches. Best price means lowest final price, not biggest discount.
- **Embed the normalised name only.**
- **Threshold is an environment variable with an empirically chosen default**, justified with
  the printed similarity table in the slice 2 PR.
- **Copy treasury-2's core and web test tiers plus Mantine**; skip the main ruleset and owl.
- **Two pages in Portuguese**: products with a create/edit drawer, search with result cards.
- **Model `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, 384 dimensions, real model in tests,**
  embedding synchronous on write.
- **Search lives under `/products/search`.**
- **Three slices, proof before completeness.**
- **`ecolheita-original-code/` is gitignored reference material**; the parts that matter are
  captured in #2 and #3.
