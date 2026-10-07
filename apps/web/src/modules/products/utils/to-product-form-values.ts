import type { ProductFormValues } from "@/modules/products/schema";
import type { Product } from "@/modules/products/types";
import { centsToReaisInput } from "@/modules/products/utils/cents-to-reais-input";

export const toProductFormValues = (p: Product): ProductFormValues => ({
  shopName: p.shopName,
  name: p.name,
  priceReais: centsToReaisInput(p.price),
  quantity: String(p.quantity),
  discountPercentage: String(p.discountPercentage),
});
