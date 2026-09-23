"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productsAPI } from "@/modules/products/api";
import { productsKey } from "@/modules/products/hooks/use-products";
import type { CreateProductInput } from "@/modules/products/types";

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsAPI.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}
