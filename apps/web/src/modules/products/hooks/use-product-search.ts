"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { productsAPI } from "@/modules/products/api";

export const productSearchKey = (query: string) => ["products", "search", query] as const;

/** Runs only for a non-empty query; keeps the previous results on screen while a new query loads. */
export function useProductSearch(query: string) {
  return useQuery({
    queryKey: productSearchKey(query),
    queryFn: () => productsAPI.search(query),
    enabled: query !== "",
    placeholderData: keepPreviousData,
    // A failed search is reported at once; the person retries by searching again. The
    // default three retries would show "Buscando…" for seven seconds before the error.
    retry: false,
  });
}
