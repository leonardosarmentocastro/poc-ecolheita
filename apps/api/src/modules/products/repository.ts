import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/modules/products/model";
import { INT4_MAX, type CreateProductInput } from "@/modules/products/schema";
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

  async findAll(): Promise<Product[]> {
    const rows = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt), desc(products.id));
    return rows.map(toProduct);
  },

  async findById(id: number): Promise<Product | undefined> {
    if (!Number.isInteger(id) || id < 1 || id > INT4_MAX) return undefined;
    const [row] = await db.select().from(products).where(eq(products.id, id));
    return row ? toProduct(row) : undefined;
  },
};
