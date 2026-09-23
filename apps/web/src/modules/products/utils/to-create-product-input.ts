import type { ProductFormValues } from "@/modules/products/schema";
import type { CreateProductInput } from "@/modules/products/types";
import { parseReaisToCents } from "@/modules/products/utils/parse-reais-to-cents";

/** Validated form strings → the API's integers. Call only after `productFormSchema` passed. */
export const toCreateProductInput = (values: ProductFormValues): CreateProductInput => ({
  shopName: values.shopName.trim(),
  name: values.name.trim(),
  price: parseReaisToCents(values.priceReais) ?? 0,
  quantity: Number(values.quantity),
  discountPercentage: Number(values.discountPercentage),
});
