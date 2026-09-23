import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { products } from "@/modules/products/model";

export type ProductRow = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

/** The API's product: the row plus the derived final price. */
export type Product = ProductRow & { finalPrice: number };
