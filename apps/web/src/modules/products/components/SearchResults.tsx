"use client";

import { Text } from "@mantine/core";
import { SearchEmptyState } from "@/modules/products/components/SearchEmptyState";
import { SearchResultCard } from "@/modules/products/components/SearchResultCard";
import type { SearchResult } from "@/modules/products/types";

export interface SearchResultsProps {
  /** "" means no search has been submitted yet (idle). */
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
}

/** Presentational: idle, loading and error keep whatever cards are already on screen. */
export function SearchResults({ query, results, loading, error }: SearchResultsProps) {
  if (query === "") {
    return <Text c="dimmed">Digite o nome de um produto</Text>;
  }
  const showEmpty = !loading && !error && results.length === 0;
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
      {showEmpty && <SearchEmptyState query={query} />}
      {results.map((r) => (
        <SearchResultCard key={r.id} result={r} />
      ))}
    </div>
  );
}
