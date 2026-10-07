# Search relevance tiers — design

**Feature key:** `search-relevance-tiers` · **Branch:** `feat/search-relevance-tiers`
**Reviewed:** round 1 (2026-10-07).
**Related issues:** [#3 distance is the third sort key](https://github.com/leonardosarmentocastro/poc-ecolheita/issues/3#issuecomment-6047249179) · [#10 self-hosted backup for Jev (spike)](https://github.com/leonardosarmentocastro/poc-ecolheita/issues/10) · [#11 screen product names at registration](https://github.com/leonardosarmentocastro/poc-ecolheita/issues/11)

## Goal

Make search answer the way a seller in a street market does. Ask "do you have bananas?"
and you hear **yes or no**, then **something related** worth trying ("there's a bakery with
banana bread"). You are never sent to a stall that has nothing to do with bananas.

Today search keeps a product only when its name's vector is at least 0.57 similar to the
query, and orders the survivors by price. A search for "bolo" finds nothing, because "Bolo de
banana" scores 0.4665, about as much as "Carne moída patinho" (0.4431). No cutoff separates
the right answer from the wrong one. In a test catalogue of 87 grocery names, the vector
search ranked "Pilha AA" first for "bolo" and two cake products below 70th place.

This feature replaces the cutoff with a three-way decision per product:

- **match** — the product **is** the thing searched for, or a kind, variety or form of it
  you would accept as a yes: "Banana prata" for banana, "Bolo de laranja" for bolo.
- **related** — not the thing, but made from it, used with it, or plausibly wanted by
  someone looking for it: "Bananada" and "Bolo de banana" for banana; "Mistura para bolo"
  and "Forma de bolo" for bolo.
- **unrelated** — everything else. **Never shown in a tiered answer**, however far down the
  list. (Without a classifier verdict the page cannot tell related from unrelated; see
  *When Jev fails*.)

Results are ordered **match tier first, then related; within a tier, best final price
first**. Distance is the third key and belongs to #3. This feature adds no location data.

### Success criterion

The extended scenario below, written down before any code exists, passes as an HTTP test
(with the scenario classifier) and as an end-to-end test. A person can reproduce it by hand:
search "bolo" and see the three cakes under "Encontramos", the cake mix and cake pan under
"Você também pode gostar", and no battery. Before the search slice's PR opens, the real-Jev
check (`tiers:eval`) is run and its table goes in the PR body.

## Non-goals

- Distance, shop locations, the shopper's position (#3).
- A backup classifier when Jev is down (#10). The fallback is the untiered list.
- Screening product names for prompt injection (#11).
- Using Jev's `confidence` for anything, such as an "unsure" tier.
- Pagination, autocomplete, synonym dictionaries, BM25 extensions, a vector index.
- Units and pack sizes (#2).

## The flow

For `GET /products/search?q=<text>`:

```
1. normalise   q → searchText  (trim, lowercase, collapse spaces, strip accents)
               q → embedText   (trim, lowercase, collapse spaces; accents kept)
2. shortlist   one Postgres query, in-stock products only:
                 fuzzy list   : the 50 closest by trigram word distance on search_name
                 meaning list : the 50 closest by cosine distance on embedding
                 merge        : Reciprocal Rank Fusion, keep the top 50
3. classify    one Jev call: one question per shortlisted product → match / related / unrelated
4. order       inside each tier: final price ascending, then id ascending
5. answer      { tiered: true, matches, related }
```

If step 3 fails, step 4 is skipped and the answer is `{ tiered: false, results }`, with
`results` the first 20 of the shortlist, in shortlist order (section *When Jev fails*).
With no classifier configured, every answer is untiered, an empty one included
(`{ tiered: false, results: [] }`). With a classifier and an empty shortlist, step 3 is
skipped and the answer is `{ tiered: true, matches: [], related: [] }`.

### Why two lists

Each list catches what the other misses. Measured on the local database:

| Shopper types | Fuzzy (trigram) | Meaning (vector) |
|---|---|---|
| "bolo" | all 5 cake products at 1.0 / 0.8 | cakes at ranks 17–79 of 87; Pilha AA first |
| "banana" | Bananada at 0.83 | Bananada at 0.96 |
| "bnana" (typo) | Banana 0.50, Bananada 0.38 | — |
| "cake" | nothing | Bolo de banana first (0.28) |

The shortlist's job is to **miss nothing**. Its false positives (fuzzy brings "Bolacha" for
"bolo") cost nothing, because Jev drops them as unrelated.

### No cutoff anywhere

- The fuzzy list orders by the trigram word-distance operator and takes the 50 closest. It
  never filters with `%`/`<%`: at pg_trgm's default 0.6 threshold, "bnana" returns nothing.
- The meaning list takes the 50 closest by cosine distance. There is no similarity floor.
- `SEARCH_SIMILARITY_THRESHOLD` is removed: from the env schema, `.env.example` files, the
  e2e config, and `CONTEXT.md`.

### Merge (Reciprocal Rank Fusion)

Each product's score is the sum, over the lists it appears in, of `1 / (60 + rank)`, with
rank starting at 1. Higher is better. Ties break by id ascending. The top 50 are the
shortlist. The constants live in one place: list size 50, shortlist size 50, untiered cap
20, `k = 60`. The shortlist size is a parameter of the repository's shortlist function,
defaulting to that constant, so a test can ask for a smaller one.

### Normalisation: who is considered vs what something is

Accents are stripped **only** for the fuzzy list, because shoppers on phones skip them.
Measured with accents kept: "acucar" vs "Açúcar refinado" scores 0.29 fuzzy and 0.24 by
meaning, low enough to fall out of a large catalogue's top 50.

Accents are **never** stripped for Jev or for display. "maca" (a stretcher) and "maçã" (an
apple) both reach the shortlist for either search. Jev sees the real names and the
shopper's real text and decides which is the match. **Normalisation decides who is
considered, never what something is.** Do not "fix" this by stripping accents before Jev.

The vector keeps the accented name (the model understands "maçã" better than "maca").

## Data

### New column `products.search_name`

- `text not null`: the name through `normalizeForSearch` (the embedding normalisation plus
  accent stripping, done in Node via Unicode NFD and removal of combining marks).
- Written by the repository on create and on rename, beside the vector; a price-, quantity-
  or discount-only update does not touch it. The repository stays the only write path.
- The query's `searchText` goes through the same function. One function, both sides.

### Migration (one file)

1. `CREATE EXTENSION IF NOT EXISTS pg_trgm` (contrib, already on the `pgvector/pgvector:pg16`
   image).
2. Add `search_name` nullable, backfill existing rows, set `NOT NULL`. The backfill must
   produce what `normalizeForSearch` would. If SQL cannot reproduce it exactly (for example
   `unaccent` differs from NFD stripping on some character), the backfill is done by a
   one-off Node step the plan names. Either way, an API test proves a backfilled row and a
   freshly created row with the same name have the same `search_name`.
3. A GiST index `gist_trgm_ops` on `search_name`, which supports ordering by trigram distance.

The products table keeps no vector index. Every search compares against every row, which is
exact and fast at proof-of-concept size. Whoever adds an HNSW index later must raise
`hnsw.ef_search` to at least 100, or the index returns fewer than 50 rows (default 40).

## The classifier seam

```ts
type Tier = "match" | "related" | "unrelated";
interface Classifier {
  /** Resolves a tier for every candidate, or rejects. Never a partial answer. */
  classify(query: string, candidates: { id: number; name: string }[]): Promise<Map<number, Tier>>;
}
```

- `query` is the shopper's text trimmed, accents and case as typed. `name` is the product
  name as the shop typed it. The shop name is never sent.
- `createApp` takes the classifier as a dependency. `start.ts` builds it from the env:

| Env | Classifier |
|---|---|
| `SEARCH_CLASSIFIER=scenario` | The scenario classifier: returns the fixture's expected tier for (query, name), and `unrelated` for any pair the fixture does not list. Used by e2e only. |
| `TYPESAFE_API_KEY` set | Jev |
| neither | none: search always answers untiered |

  `SEARCH_CLASSIFIER=scenario` wins over `TYPESAFE_API_KEY` when both are set (a dev key in
  `apps/api/.env` must not reach e2e). `SEARCH_CLASSIFIER` accepts only `scenario`; any
  other value fails the boot. The scenario classifier compares query and name after
  `normalizeForSearch`, so "Bolo " and "bolo" find the same fixture entry.
  `TYPESAFE_API_KEY` is optional and lives only in `apps/api/.env`. `.env.example` names it
  with an empty value. The key is never logged.

### Jev implementation

One request per search, plain `fetch`, no SDK:

```json
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <TYPESAFE_API_KEY>
{
  "model": "jev-1.13.0",
  "state": "A shopper searched a street-market app for: \"bolo\"",
  "questions": {
    "p7": {
      "type": "choice",
      "instructions": "For this search, what is the product \"Bolo de banana\"?",
      "criteria": { "match": { … }, "related": { … }, "unrelated": { … } }
    }
  }
}
```

- One `choice` question per candidate, keyed `p<id>`. Jev answers all questions of one
  request in parallel ([choice docs](https://docs.typesafe.ai/primitives/choice)).
- `criteria` carries the rule from the Goal as `what` / `not_for` / `examples` objects. The
  wording lives in one module, shared by the adapter and `tiers:eval`.
- The model is **pinned** to `jev-1.13.0`. Upgrading is a deliberate change, re-checked
  with `tiers:eval`.
- The auth header format is taken from TypeSafe's API reference when implementing; this
  spec does not guess it. If it differs from `Bearer`, the plan follows the reference.
- **Failure** — any of these rejects the whole call: no answer within **2 seconds** (abort
  the request), a non-2xx status, a body that does not parse, a missing answer for any
  candidate, or a `choice` outside the three tiers. No retries.
- The adapter uses `choice` only. `confidence` is not used or returned.

## API contract

```ts
type SearchResponse =
  | { tiered: true;  matches: Product[]; related: Product[] }
  | { tiered: false; results: Product[] };
```

- `Product` is today's public product (the row plus `finalPrice`). The `similarity` field is
  removed from search results.
- `matches` and `related` are each ordered by final price ascending, then id ascending.
  Unrelated products appear nowhere.
- `results` (untiered) is the first 20 of the shortlist, in shortlist order.
- The request contract (`q`, 1–200 characters after trim) is unchanged.
- Zero-stock products never enter the shortlist, so they never appear.

## When Jev fails

- The answer is the first 20 of the shortlist, best combined fuzzy + meaning rank first.
  It **may include unrelated products**: without Jev's verdict nothing separates related
  from unrelated, and the page says so with its notice rather than pretending otherwise.
  20 is the cap search had before this feature; the cut drops the shortlist's weakest tail
  without inventing a new threshold.
- The API answers `200` with `{ tiered: false, results }` and logs one line naming the
  failure kind (timeout, status, invalid answer). The query text and key are not logged.
- With no classifier configured, every search answers this way. That is not logged.

## The page (`/buscar`)

| State | Shows |
|---|---|
| Matches found | "Encontramos N produtos para “q”" + match cards; then "Você também pode gostar" + related cards, if any |
| No match, some related | "Não encontramos “q”" + "Você também pode gostar" + related cards |
| Nothing | "Não encontramos “q”" |
| Untiered | "Não conseguimos organizar os resultados agora" + one list of cards |
| Untiered, no results | "Não encontramos “q”" (only an empty catalogue gets here) |

- N is the number of matches; "1 produto" in the singular.
- "Encontramos…", "Não encontramos…" and "Você também pode gostar" are headings, so tests
  and screen readers find each section by role and name.
- Idle, loading ("Buscando…" with previous cards kept) and API error behave as today.
- `SearchResultCard` loses the similarity badge.
- Components: `SearchResults` renders the states; `SearchEmptyState` carries the new
  wording; `SearchResultCard` drops the badge. Each keeps co-located stories with `play()`
  covering every state above.

## The scenario

One fixture file stays the single copy of the truth, imported by the API tests, the e2e
test, the seed script, the scenario classifier and `tiers:eval`. It grows from 8 to 14 rows
and gains the expected tier of every row for each scenario query. Prices in BRL; the fixture
stores cents. Stock is 10 unless a test says otherwise.

| # | Shop | Name | Price | Discount | Final | "banana" | "bolo" |
|---|---|---|---|---|---|---|---|
| 1 | Mercadinho Candelária | Banana | 6,00 | 50% | 3,00 | match | unrelated |
| 2 | VEC Hortifruti | Banana prata | 5,00 | 30% | 3,50 | match | unrelated |
| 3 | Hortifruti São José | Banana nanica | 4,00 | 10% | 3,60 | match | unrelated |
| 4 | CEASA SJC | Banana prata orgânica | 8,00 | 80% | 1,60 | match | unrelated |
| 5 | Mercadinho Candelária | Bananada | 3,00 | 20% | 2,40 | **related** | unrelated |
| 6 | VEC Hortifruti | Maçã argentina | 7,00 | 40% | 4,20 | unrelated | unrelated |
| 7 | Hortifruti São José | Bolo de banana | 12,00 | 30% | 8,40 | related | match |
| 8 | CEASA SJC | Carne moída patinho | 30,00 | 80% | 6,00 | unrelated | unrelated |
| 9 | Padaria Pão Quente | Bolo de laranja | 15,00 | 40% | 9,00 | unrelated | match |
| 10 | Padaria Pão Quente | Fatia de bolo red velvet | 8,00 | 0% | 8,00 | unrelated | match |
| 11 | Mercadinho Candelária | Mistura para bolo de chocolate | 9,00 | 0% | 9,00 | unrelated | related |
| 12 | Casa & Cozinha | Forma de bolo redonda | 30,00 | 50% | 15,00 | unrelated | related |
| 13 | Casa & Cozinha | Pilha AA | 10,00 | 50% | 5,00 | unrelated | unrelated |
| 14 | VEC Hortifruti | Açúcar refinado | 6,00 | 25% | 4,50 | unrelated | unrelated |

Row 5 changes from the previous design: Bananada was a match for "banana" and is now
**related**, because it is made from banana, not banana itself.

**Expected tiered answers:**

- "banana" → matches 4, 1, 2, 3 (1,60 · 3,00 · 3,50 · 3,60); related 5, 7 (2,40 · 8,40).
- "bolo" → matches 10, 7, 9 (8,00 · 8,40 · 9,00); related 11, 12 (9,00 · 15,00).

Row 13 is the decoy the old vector search put first for "bolo". Its low final price means it
would sit near the top of any list it leaked into. Row 14 exists for the accent recall test.

## Testing

Tiers come from Jev, which cannot run in CI (no key, cost, answers that can shift between
runs). The tests split what is our code from what is Jev's judgement.

| Layer | Proves | Classifier |
|---|---|---|
| **Shortlist** (repository, real Postgres, real embeddings) | With the shortlist size set to the number of expected rows, the shortlist is **exactly**: "bolo" → rows 7, 9, 10, 11, 12; "banana" → 1–5 and 7; "acucar" → 14; "maca" → 6. The typo "bnana" gets two rows of slack: its top 6 contains 1–4. So a test fails when an irrelevant row outranks a relevant one | none |
| **Search** (API over HTTP) | The expected tiered answers above, exactly; unrelated rows absent; zero stock absent; Jev failing → `tiered: false` in shortlist order; no classifier → `tiered: false`; empty catalogue → empty tiered | scenario, or a fake that rejects |
| **Jev adapter** (unit) | The request matches the contract above; answers are read into tiers; each failure kind rejects; the 2 s timeout aborts | a local fake HTTP server |
| **Real Jev** (`pnpm --filter api tiers:eval`, manual, not CI) | Jev follows the rule on both scenario queries | real Jev |
| **Web** (stories + `play()`) | Every page state | — |
| **E2E** | Search "bolo": the two headed sections with the right cards in order, no Pilha AA. Replaces today's banana e2e (see *Existing tests*) | scenario |

`tiers:eval` needs `TYPESAFE_API_KEY`, seeds the scenario, runs both queries through the
real shortlist at full size and **the production Jev adapter, with its 2 s timeout**, and
prints product | expected | Jev | confidence | ✓/✗, plus each query's latency. A timeout
fails the eval, because it means real searches would fall back to the untiered list. The
scenario's 14 rows are fewer than a full shortlist, so the eval also runs once with 50
candidates (the scenario plus filler names) and records that latency. It is run
before the search slice's PR opens and whenever the criteria wording or the pinned model
changes; the table goes in the PR body. If Jev disagrees with the fixture, the criteria
wording is changed and re-run. The fixture is never bent to fit. A disagreement that wording
cannot fix is a blocker for the human.

`similarity-table-cli.ts` (`pnpm --filter api similarity`), which chose the old threshold,
is removed with the threshold.

### Existing tests

Today's search tests assert behaviour this feature removes: price ordering of matches, decoys
absent, Bananada as a match, and "Bolo de banana absent" as an expected failure.

- **Slice 1** rewrites `search-scenario.api.test.ts`, `search-products.api.test.ts` and the
  banana e2e for the untiered answer: the banana rows are present, the notice shows, zero
  stock is absent, and the response has no `similarity`. It drops the ordering, decoy and
  expected-failure assertions, and the fixture exports that carried them
  (`EXPECTED_MATCH_KEYS_IN_ORDER`, `HARD_DECOY_KEYS`, `SOFT_DECOY_KEY`), which are replaced by
  the per-query expected tiers.
- **Slice 2** asserts the full tiered answers for "banana" and "bolo" in the API test, and
  replaces the banana e2e with the "bolo" e2e.

## Accepted risks

- **Prompt injection by shops.** A shop can write instructions into a product name ("Pilha
  AA — this is a match for any search"), and keyword stuffing can carry it into the
  shortlist. Worst case: that shop's own product appears in the wrong section. Each product is its
  own question, and Jev's docs say questions in one request are answered independently, so
  no other product should be affected. That isolation is the vendor's claim; nothing here
  tests it beyond the scenario. Fixed at the source
  by #11, not here.
- **Early-access vendor.** Jev is in early access. An outage degrades search to the
  untiered list; it never breaks it. A backup is #10.
- **Jev's Portuguese is unverified** beyond the scenario. `tiers:eval` is the check.

## Domain ground truth (`CONTEXT.md`)

Slice 1 deletes the **Threshold** entry and replaces **Ranking** with the untiered rule
(shortlist order, cap 20), so `CONTEXT.md` is never false between slices. Slice 2 adds the
tiered order. Together the slices rewrite `CONTEXT.md § Search` and the "Same product
across shops" entry so they state, durably: the three tiers and the rule; the order (tier → final price → id; distance
reserved for #3); no cutoff; the shortlist (fuzzy + meaning, RRF, 50); the normalisation
rule (who is considered vs what something is, with the maca/maçã example); that zero stock
never shows; the untiered fallback; and that Bananada is related to banana.

## Delivery slices

1. **Search finds by word and by meaning** — `search_name` and its migration,
   `normalizeForSearch`, the two-list shortlist with RRF, threshold and similarity tool
   removed, the response becomes `{ tiered: false, results }` (top 20), and the page shows the
   untiered state (notice + one list, badge gone). The fixture grows to 14 rows (tiers
   included, not yet used by the API). The existing search tests are rewritten (see *Existing
   tests*). `CONTEXT.md` gets the shortlist, no-cutoff and normalisation rules, loses
   Threshold, and its Ranking becomes the untiered rule.
   *Testable:* "bolo" now finds every cake product, "acucar" finds Açúcar.
   While only this slice is merged, every search shows the untiered notice. That is
   intentional: it is the honest state of a search with no classifier.
2. **Jev tiers the results** — the classifier seam, the Jev adapter, the scenario
   classifier, the tiered response, the page's two sections and empty states, `tiers:eval`,
   the "bolo" e2e replacing the banana one, and the `CONTEXT.md` tier rules. *Testable:* the expected tiered answers, end to end.

## Decisions and declined alternatives

- Untiered fallback shows the first 20 of the shortlist, not all 50 and not fuzzy-only
  results (human, spec review round 1): it keeps relevance order and today's cap, and
  "cake" still finds something without Jev.
- *Forwarded to the plan gate:* which test layer proves the `search_name` backfill equals
  `normalizeForSearch` (`search_name` is not public and the test database migrates empty, so
  HTTP cannot observe it; a repository or migration-level test is expected).
