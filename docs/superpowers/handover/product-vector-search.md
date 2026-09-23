# Handover — product-vector-search

Launch: `claude --model opus` then `/implement-stack docs/superpowers/handover/product-vector-search.md`
Mode: start
Feature branch: feat/product-vector-search
Spec(s): docs/superpowers/specs/2026-09-22-product-vector-search-design.md

## Stack

| slice | plan | branch | parent | status | owns |
|---|---|---|---|---|---|
| 1 | docs/superpowers/plans/2026-09-22-product-vector-search-slice-1-register-and-list.md | feat/product-vector-search-slice-1-register-and-list | feat/product-vector-search | open #4 | Registering a product and seeing it listed: the monorepo scaffold copied from treasury-2, pgvector Postgres, the `products` table, `POST` and `GET /products` (list and by id), the products page with its table and create drawer, the API, story and e2e harnesses, CI, and the durable docs (`AGENTS.md` local gates, `CONTEXT.md`, the two app `AGENTS.md`). |
| 2 | docs/superpowers/plans/2026-09-22-product-vector-search-slice-2-search-by-meaning.md | feat/product-vector-search-slice-2-search-by-meaning | feat/product-vector-search-slice-1-register-and-list | open #5 | Finding the same product across shops by meaning and ranking it by best price: the embedding module and model loaded at boot, the pgvector extension and `embedding` column, embedding on create, `GET /products/search`, the similarity threshold, the banana fixture, the seed script, the similarity table, the search page, and the search rules appended to `CONTEXT.md`. |
| 3 | docs/superpowers/plans/2026-09-22-product-vector-search-slice-3-edit-and-delete.md | feat/product-vector-search-slice-3-edit-and-delete | feat/product-vector-search-slice-2-search-by-meaning | open #6 | Changing and removing a registered product: `PATCH` and `DELETE /products/:id`, re-embedding when the normalised name changes, the edit mode of the product drawer, the delete confirmation dialog, and the row actions on the products table. |

## Umbrella PR body

Plan: docs/superpowers/specs/2026-09-22-product-vector-search-design.md

**What** — A small proof-of-concept app where shops register products under whatever name they type, and a shopper can search by meaning: typing "banana" finds "Banana", "Banana prata", "Banana nanica", "Banana prata orgânica" and "Bananada" across four different shops, ranked cheapest first by final price after discount. It ships a products page to register, list, edit and delete products, and a search page that shows the matches as cards.

**Why** — The original Ecolheita app could not put shop-created products in its offers feed because it had no way to tell that "banana" and "banana prata" from two shops are the same thing. This POC proves that a Postgres vector search over product names solves that matching problem well enough to rank the same product across shops by best price, and that the whole thing runs on Postgres plus Node with no extra service.

**How** — The API turns each product name into a numeric vector with a small multilingual sentence model loaded once at boot and running in-process; the vector is stored beside the row in Postgres with the pgvector extension, so a search is one SQL query comparing the query's vector against every product's. Rows above a similarity threshold, with stock, are ordered by lowest final price, so the deepest discount does not automatically win. The threshold is chosen empirically from one written scenario (four bananas and a bananada as matches, three decoys, with "bolo de banana" as the known hard case), which is the single fixture behind the HTTP test, the browser test and the seed script. Embedding happens synchronously inside the one write path the API, the seed and the tests all share, so a product without a vector never exists. Names are embedded alone — never the shop name — so unrelated products from one shop do not look alike. Hybrid keyword search, units, shops as entities and batches are recorded follow-ups, not part of this feature.

## Slices

<!-- stack -->
| slice | title | PR |
|---|---|---|
| 1 | register and list | #4 |
| 2 | search by meaning | #5 |
| 3 | edit and delete | #6 |
<!-- /stack -->

## Notes

Spec, plans and this document are transient and are removed from `main` after merge. This
description is the durable record.
