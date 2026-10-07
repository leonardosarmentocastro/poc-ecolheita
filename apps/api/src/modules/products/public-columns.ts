import { products } from "@/modules/products/model";

/** Every column the API may return. `embedding` is never serialised. */
export const PRODUCT_PUBLIC_COLUMNS = {
  id: products.id,
  shopName: products.shopName,
  name: products.name,
  price: products.price,
  quantity: products.quantity,
  discountPercentage: products.discountPercentage,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};
