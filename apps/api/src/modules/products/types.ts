import type { InferSelectModel } from "drizzle-orm";
import type { products } from "@/modules/products/model";

/** The public row: every column except `embedding`. */
export type ProductRow = Omit<InferSelectModel<typeof products>, "embedding">;

/** The API's product: the row plus the derived final price. */
export type Product = ProductRow & { finalPrice: number };

/** A search hit: the product plus its cosine similarity to the query, rounded to 4 places. */
export type SearchResult = Product & { similarity: number };
