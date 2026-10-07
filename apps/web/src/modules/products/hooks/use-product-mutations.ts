"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productsAPI } from "@/modules/products/api";
import { productsKey } from "@/modules/products/hooks/use-products";
import type { CreateProductInput, UpdateProductInput } from "@/modules/products/types";

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsAPI.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateProductInput }) =>
      productsAPI.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productsAPI.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}
