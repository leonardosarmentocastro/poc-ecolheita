import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { products } from "@/modules/products/model";

const insertSchema = createInsertSchema(products, {
  shopName: (s) => s.trim().min(1, "shopName is required"),
  name: (s) => s.trim().min(1, "name is required"),
  price: () => z.number().int().min(0),
  quantity: () => z.number().int().min(0),
  discountPercentage: () => z.number().int().min(0).max(100),
});

export const createProductSchema = insertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
