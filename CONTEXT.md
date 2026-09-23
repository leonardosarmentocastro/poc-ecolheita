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
  food-waste use case). "Bananada" and "bolo de banana" are different products.

## Not in the model yet

- Units and pack sizes (issue #2): every price is for the same implicit unit.
- Shops as an entity, batches, expiry dates, distance, basket (issue #3).
