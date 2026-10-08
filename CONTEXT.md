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
- **Zero stock** — a product with `quantity = 0` is never a search result; it is still listed
  on the products page.
- **A product without a vector never exists** — the repository embeds and writes
  `search_name` on every create and every rename; it is the only write path.

## Not in the model yet

- Units and pack sizes (issue #2): every price is for the same implicit unit.
- Shops as an entity, batches, expiry dates, distance, basket (issue #3).
