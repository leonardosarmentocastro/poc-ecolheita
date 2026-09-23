import { db } from "@/db/client";
import { products } from "@/modules/products/model";
import type { CreateProductInput } from "@/modules/products/schema";
import type { Product } from "@/modules/products/types";
import { toProduct } from "@/modules/products/utils/to-product";

/**
 * Every products write goes through here. Slice 2 adds the embedding step to `create`,
 * which is why this repository is the one write path (spec § Embedding module).
 */
export const productsRepository = {
  async create(input: CreateProductInput): Promise<Product> {
    const [row] = await db.insert(products).values(input).returning();
    return toProduct(row);
  },
};
