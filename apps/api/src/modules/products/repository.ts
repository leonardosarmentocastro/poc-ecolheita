import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { embed, normalizeForEmbedding } from "@/modules/embeddings";
import { products } from "@/modules/products/model";
import { PRODUCT_PUBLIC_COLUMNS } from "@/modules/products/public-columns";
import { LIST_SIZE, SHORTLIST_SIZE } from "@/modules/products/search-constants";
import {
  INT4_MAX,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/modules/products/schema";
import type { Product } from "@/modules/products/types";
import { interleave } from "@/modules/products/utils/interleave";
import { normalizeForSearch } from "@/modules/products/utils/normalize-for-search";
import { toProduct } from "@/modules/products/utils/to-product";

/** An id Postgres can hold in an `integer` column; anything else is simply not found. */
const isProductId = (id: number): boolean => Number.isInteger(id) && id >= 1 && id <= INT4_MAX;

/**
 * Every products write goes through here, and every write embeds and writes search_name: a
 * product without a vector never exists (apps/api/AGENTS.md, the one deviation from "queries only").
 */
export const productsRepository = {
  async create(input: CreateProductInput): Promise<Product> {
    const embedding = await embed(normalizeForEmbedding(input.name));
    const [row] = await db
      .insert(products)
      .values({ ...input, embedding, searchName: normalizeForSearch(input.name) })
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
    if (!isProductId(id)) return undefined;
    const [row] = await db.select(PRODUCT_PUBLIC_COLUMNS).from(products).where(eq(products.id, id));
    return row ? toProduct(row) : undefined;
  },

  /**
   * Partial update. The vector is recomputed only when the normalised name changed, so a
   * change of case or spacing does not re-embed (CONTEXT.md § Search).
   */
  async update(id: number, input: UpdateProductInput): Promise<Product | undefined> {
    if (!isProductId(id)) return undefined;
    // An empty body changes nothing, so it writes nothing: no updatedAt bump, no re-embed.
    if (Object.keys(input).length === 0) return this.findById(id);
    const [current] = await db
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, id));
    if (!current) return undefined;

    const renamed =
      input.name !== undefined &&
      normalizeForEmbedding(input.name) !== normalizeForEmbedding(current.name);
    const embedding = renamed ? await embed(normalizeForEmbedding(input.name!)) : undefined;
    const searchName = renamed ? normalizeForSearch(input.name!) : undefined;

    const [row] = await db
      .update(products)
      .set({
        ...input,
        ...(embedding ? { embedding } : {}),
        ...(searchName !== undefined ? { searchName } : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning(PRODUCT_PUBLIC_COLUMNS);
    return row ? toProduct(row) : undefined;
  },

  async remove(id: number): Promise<boolean> {
    if (!isProductId(id)) return false;
    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    return deleted.length > 0;
  },

  /** The stored vector, for tests and for slice 3's "re-embed only on rename" proof. */
  async findEmbedding(id: number): Promise<number[] | undefined> {
    const [row] = await db
      .select({ embedding: products.embedding })
      .from(products)
      .where(eq(products.id, id));
    return row?.embedding ?? undefined;
  },

  /** The stored search_name, for tests: it is never part of the public product. */
  async findSearchName(id: number): Promise<string | undefined> {
    const [row] = await db
      .select({ searchName: products.searchName })
      .from(products)
      .where(eq(products.id, id));
    return row?.searchName;
  },

  /**
   * The search shortlist (spec § The flow, § Merge): the fuzzy list (trigram word distance on
   * search_name) and the meaning list (cosine distance on the vector), each the LIST_SIZE
   * closest in-stock rows with no cutoff, ties by id, interleaved. Never a threshold.
   */
  async shortlist(
    query: string,
    { size = SHORTLIST_SIZE }: { size?: number } = {},
  ): Promise<Product[]> {
    const searchText = normalizeForSearch(query);
    const vector = JSON.stringify(await embed(normalizeForEmbedding(query)));
    const { rows } = await db.execute<{ id: number; list: "f" | "m" }>(sql`
      (SELECT id, 'f' AS list FROM products WHERE quantity > 0
        ORDER BY ${searchText}::text <<-> search_name, id LIMIT ${LIST_SIZE})
      UNION ALL
      (SELECT id, 'm' AS list FROM products WHERE quantity > 0
        ORDER BY embedding <=> ${vector}::vector, id LIMIT ${LIST_SIZE})
    `);
    const ids = interleave(
      rows.filter((r) => r.list === "f").map((r) => r.id),
      rows.filter((r) => r.list === "m").map((r) => r.id),
      size,
    );
    if (ids.length === 0) return [];
    const found = await db
      .select(PRODUCT_PUBLIC_COLUMNS)
      .from(products)
      .where(inArray(products.id, ids));
    const byId = new Map(found.map((row) => [row.id, toProduct(row)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },
};
