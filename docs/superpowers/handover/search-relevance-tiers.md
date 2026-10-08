# Handover — search-relevance-tiers

Launch: `claude --model opus` then `/implement-stack docs/superpowers/handover/search-relevance-tiers.md`
Mode: start
Feature branch: feat/search-relevance-tiers
Spec(s): docs/superpowers/specs/2026-10-07-search-relevance-tiers-design.md

## Stack

| slice | plan | branch | parent | status | owns |
|---|---|---|---|---|---|
| 1 | docs/superpowers/plans/2026-10-07-search-relevance-tiers-slice-1-shortlist.md | feat/search-relevance-tiers-slice-1-shortlist | feat/search-relevance-tiers | open #12 | the no-cutoff shortlist — fuzzy (pg_trgm on `search_name`) and meaning (pgvector) lists interleaved into 50 — served untiered as `{ tiered: false, results }` (top 20), with the page's untiered state. |
| 2 | docs/superpowers/plans/2026-10-07-search-relevance-tiers-slice-2-tiers.md | feat/search-relevance-tiers-slice-2-tiers | feat/search-relevance-tiers-slice-1-shortlist | todo | the tiered answer — the classifier seam, the scenario classifier, one question per distinct name, `{ tiered: true, matches, related }` ordered by final price then id, the untiered fallback on classifier failure with its log line, and the page's two sections and empty states. |
| 3 | docs/superpowers/plans/2026-10-07-search-relevance-tiers-slice-3-jev.md | feat/search-relevance-tiers-slice-3-jev | feat/search-relevance-tiers-slice-2-tiers | todo | the Jev classifier — the request, answer parsing, the failure kinds and the 2 s timeout, `TYPESAFE_API_KEY` selecting it, and `tiers:eval` with its agreement and latency gates. |

## Umbrella PR body

Plan: docs/superpowers/specs/2026-10-07-search-relevance-tiers-design.md

**What** — Search now answers like a seller at a street market: first the products that are what you asked for ("Encontramos…"), then products related to it ("Você também pode gostar"), and never products that have nothing to do with it. When the relevance service is unavailable, search still answers with one plain list and says honestly that it could not sort it by relevance.

**Why** — Search used to keep a product only if its name was "similar enough" in meaning to the query, and no single cutoff worked: "bolo" found no cakes at all, while unrelated items scored almost as high as the right ones. Shoppers also type without accents or with typos, so "acucar" missed "Açúcar refinado".

**How** — Search first gathers a generous shortlist from two sources that catch different things: a spelling-tolerant word match (on an accent-free copy of each name) and a meaning match, taken in turns so neither buries the other, with no cutoff anywhere. An external classifier (TypeSafe Jev) then decides, once per distinct product name, whether each candidate is a match, related or unrelated; within each group the cheapest offer comes first. Accents are dropped only to decide who is considered, never when judging what a product is, so "maca" and "maçã" stay distinct. Taking turns between the lists was chosen over a blended score after measuring both: blending buried exactly the products one list exists to catch. A stand-in classifier answering from a fixed scenario lets the whole tiered flow be tested end to end without the vendor.

## Slices

<!-- stack -->
| slice | title | PR |
|---|---|---|
| 1 | search finds by word and by meaning | — |
| 2 | search answers in tiers | — |
| 3 | Jev classifies | — |
<!-- /stack -->

## Notes

Spec, plans and this document are transient and are removed from `main` after merge. This
description is the durable record.
