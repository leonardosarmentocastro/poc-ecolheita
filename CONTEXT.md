# Ecolheita — domain context

Business definitions and rules that agents and contributors treat as **ground truth**. Code
that contradicts them is a bug. Workflow conventions live in the `AGENTS.md` files.

## Ubiquitous language

- **Product (`produto`)** — one shop's offer of one item: `shopName` (free text typed at
  registration), `name` (free text; what a shopper searches), `price` in **integer cents**,
  `quantity` (stock available, in units), `discountPercentage` (integer 0..100).
- **Final price (`preço final`)** — derived, never stored:
  `round(price * (100 - discountPercentage) / 100)` in cents, rounding half up. The API
  computes it; the web never computes a final price.
- **Best price** — the lowest final price, never the biggest discount percentage.
- **Duplicates are two offers.** Two rows with the same shop and name are two offers and
  both are listed; there is no uniqueness rule. A shop may sell the same item in several
  lots (issue #3), and this matches it.
- **Same product across shops** — "banana", "banana prata" and "banana nanica" count as the
  same product for a shopper; cultivars are included (recall over precision, for the
  food-waste use case). A product made of banana, such as "Bananada", also counts as a
  match for "banana"; "bolo de banana" is the known hard case, a different product the
  search may still return.

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

## Not in the model yet

- Units and pack sizes (issue #2): every price is for the same implicit unit.
- Shops as an entity, batches, expiry dates, distance, basket (issue #3).
