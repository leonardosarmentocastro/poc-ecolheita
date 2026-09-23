import { integer, pgTable, serial, text, timestamp, vector } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  shopName: text("shop_name").notNull(),
  name: text("name").notNull(),
  // Integer cents (CONTEXT.md). The discounted price is derived, never stored.
  price: integer("price").notNull(),
  // Stock available, in units.
  quantity: integer("quantity").notNull(),
  discountPercentage: integer("discount_percentage").notNull(),
  // The normalised name's vector (CONTEXT.md). Written only by the repository's create/update.
  embedding: vector("embedding", { dimensions: 384 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
