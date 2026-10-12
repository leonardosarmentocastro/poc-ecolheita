import type { InferSelectModel } from "drizzle-orm";
import type { products } from "@/modules/products/model";

/** The public row: every column except `embedding` and `searchName`. */
export type ProductRow = Omit<InferSelectModel<typeof products>, "embedding" | "searchName">;

/** The API's product: the row plus the derived final price. */
export type Product = ProductRow & { finalPrice: number };

/** A search answer (spec § API contract). */
export type SearchResponse =
  { tiered: true; matches: Product[]; related: Product[] } | { tiered: false; results: Product[] };
