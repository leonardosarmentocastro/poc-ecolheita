import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { products } from "@/modules/products/model";

/** Largest value a Postgres `integer` column holds; anything above it is a 400, not a 500. */
export const INT4_MAX = 2_147_483_647;

const insertSchema = createInsertSchema(products, {
  shopName: (s) => s.trim().min(1, "shopName is required"),
  name: (s) => s.trim().min(1, "name is required"),
  price: () => z.number().int().min(0).max(INT4_MAX),
  quantity: () => z.number().int().min(0).max(INT4_MAX),
  discountPercentage: () => z.number().int().min(0).max(100),
});

export const createProductSchema = insertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
