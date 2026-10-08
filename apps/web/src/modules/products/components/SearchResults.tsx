"use client";

import { Text } from "@mantine/core";
import { SearchEmptyState } from "@/modules/products/components/SearchEmptyState";
import { SearchResultCard } from "@/modules/products/components/SearchResultCard";
import type { SearchResponse } from "@/modules/products/types";

export interface SearchResultsProps {
  /** "" means no search has been submitted yet (idle). */
  query: string;
  /** The last answer; kept on screen while loading or after an error. */
  response: SearchResponse | undefined;
  loading: boolean;
  error: string | null;
}

/** Presentational: idle, loading and error keep whatever cards are already on screen. */
export function SearchResults({ query, response, loading, error }: SearchResultsProps) {
  if (query === "") {
    return <Text c="dimmed">Digite o nome de um produto</Text>;
  }
  const results = response?.results ?? [];
  const settled = !loading && !error && response !== undefined;
  return (
    <div className="grid gap-3">
      {loading && (
        <Text role="status" c="dimmed">
          Buscando…
        </Text>
      )}
      {error && (
        <Text role="alert" c="red.8">
          {error}
        </Text>
      )}
      {settled && results.length === 0 && <SearchEmptyState query={query} />}
      {results.length > 0 && (
        <Text c="dimmed">Não conseguimos organizar os resultados por relevância</Text>
      )}
      {results.map((p) => (
        <SearchResultCard key={p.id} product={p} />
      ))}
    </div>
  );
}
