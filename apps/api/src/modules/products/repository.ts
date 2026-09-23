import { and, asc, cosineDistance, desc, eq, gt, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { embed, normalizeForEmbedding } from "@/modules/embeddings";
import { products } from "@/modules/products/model";
import { PRODUCT_PUBLIC_COLUMNS } from "@/modules/products/public-columns";
import { INT4_MAX, type CreateProductInput } from "@/modules/products/schema";
import type { Product, SearchResult } from "@/modules/products/types";
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

  /**
   * Products whose name is close enough to the query vector, cheapest first
   * (CONTEXT.md: best price is the lowest final price). Zero stock never shows.
   */
  async search(
    queryVector: number[],
    { threshold, limit = 20 }: { threshold: number; limit?: number },
  ): Promise<SearchResult[]> {
    const similarity = sql<number>`1 - (${cosineDistance(products.embedding, queryVector)})`;
    const finalPriceSql = sql`round((${products.price} * (100 - ${products.discountPercentage}))::numeric / 100)`;
    const rows = await db
      .select({ ...PRODUCT_PUBLIC_COLUMNS, similarity })
      .from(products)
      .where(and(gte(similarity, threshold), gt(products.quantity, 0)))
      .orderBy(asc(finalPriceSql), desc(similarity), asc(products.id))
      .limit(limit);
    return rows.map(({ similarity, ...row }) => ({
      ...toProduct(row),
      similarity: Number(Number(similarity).toFixed(4)),
    }));
  },
};
