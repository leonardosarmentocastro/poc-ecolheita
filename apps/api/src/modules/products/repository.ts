import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { embed, normalizeForEmbedding } from "@/modules/embeddings";
import { products } from "@/modules/products/model";
import { PRODUCT_PUBLIC_COLUMNS } from "@/modules/products/public-columns";
import { INT4_MAX, type CreateProductInput } from "@/modules/products/schema";
import type { Product } from "@/modules/products/types";
import { toProduct } from "@/modules/products/utils/to-product";

/**
 * Every products write goes through here, and every write embeds: a product without a
 * vector never exists (apps/api/AGENTS.md, the one deviation from "queries only").
 */
export const productsRepository = {
  async create(input: CreateProductInput): Promise<Product> {
    const embedding = await embed(normalizeForEmbedding(input.name));
    const [row] = await db
      .insert(products)
      .values({ ...input, embedding })
      .returning(PRODUCT_PUBLIC_COLUMNS);
    return toProduct(row);
  },

  async findAll(): Promise<Product[]> {
    const rows = await db
      .select(PRODUCT_PUBLIC_COLUMNS)
      .from(products)
      .orderBy(desc(products.createdAt), desc(products.id));
    return rows.map(toProduct);
  },

  async findById(id: number): Promise<Product | undefined> {
    if (!Number.isInteger(id) || id < 1 || id > INT4_MAX) return undefined;
    const [row] = await db.select(PRODUCT_PUBLIC_COLUMNS).from(products).where(eq(products.id, id));
    return row ? toProduct(row) : undefined;
  },

  /** The stored vector, for tests and for slice 3's "re-embed only on rename" proof. */
  async findEmbedding(id: number): Promise<number[] | undefined> {
    const [row] = await db
      .select({ embedding: products.embedding })
      .from(products)
      .where(eq(products.id, id));
    return row?.embedding ?? undefined;
  },
};
