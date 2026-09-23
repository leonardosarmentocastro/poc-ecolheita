"use client";

import { useState } from "react";
import { SearchForm } from "@/modules/products/components/SearchForm";
import { SearchResults } from "@/modules/products/components/SearchResults";
import { useProductSearch } from "@/modules/products/hooks/use-product-search";
import type { SearchResult } from "@/modules/products/types";

/** Container: owns the submitted query and the fetch; renders the presentational pieces. No story. */
export function SearchPageContainer() {
  const [query, setQuery] = useState("");
  const { data, isFetching, error } = useProductSearch(query);
  // `keepPreviousData` only bridges the pending state; once a query settles as an error,
  // `data` is undefined. The last good list is kept here so a failure keeps the cards on
  // screen (spec § Web, search page states).
  // Adjusted during render rather than in an effect (react.dev, "You might not need an effect").
  const [lastResults, setLastResults] = useState<SearchResult[]>([]);
  if (data !== undefined && data !== lastResults) setLastResults(data);

  return (
    <main className="container mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Buscar</h1>
      <div className="grid gap-6">
        <SearchForm onSearch={setQuery} />
        <SearchResults
          query={query}
          results={data ?? lastResults}
          loading={isFetching}
          error={error ? "Não foi possível buscar. Tente novamente." : null}
        />
      </div>
    </main>
  );
}
