import type { Product, ProductRow } from "@/modules/products/types";
import { finalPrice } from "@/modules/products/utils/final-price";

/** Shapes a row for the API: adds `finalPrice`. */
export const toProduct = (row: ProductRow): Product => ({
  ...row,
  finalPrice: finalPrice(row.price, row.discountPercentage),
});
