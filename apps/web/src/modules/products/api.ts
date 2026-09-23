import { request } from "@/shared/api/request";
import type { CreateProductInput, Product } from "@/modules/products/types";

export const productsAPI = {
  list: () => request<Product[]>("/products"),
  get: (id: number) => request<Product>(`/products/${id}`),
  create: (input: CreateProductInput) =>
    request<Product>("/products", { method: "POST", body: JSON.stringify(input) }),
};
