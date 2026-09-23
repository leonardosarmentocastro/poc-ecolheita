"use client";

import { useQuery } from "@tanstack/react-query";
import { productsAPI } from "@/modules/products/api";

export const productsKey = ["products"] as const;

export function useProducts() {
  return useQuery({ queryKey: productsKey, queryFn: productsAPI.list });
}
