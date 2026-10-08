"use client";

import { useState } from "react";
import { SearchForm } from "@/modules/products/components/SearchForm";
import { SearchResults } from "@/modules/products/components/SearchResults";
import { useProductSearch } from "@/modules/products/hooks/use-product-search";
import type { SearchResponse } from "@/modules/products/types";

/** Container: owns the submitted query and the fetch; renders the presentational pieces. No story. */
export function SearchPageContainer() {
  const [query, setQuery] = useState("");
  const { data, isPlaceholderData, isFetching, error, refetch } = useProductSearch(query);
  // Submitting the current text again is a state no-op, so react-query would not fetch;
  // "Tente novamente" must search again, so the same query refetches explicitly.
  const search = (next: string) => {
    if (next === query) void refetch();
    else setQuery(next);
  };
  // `keepPreviousData` only bridges the pending state; once a query settles as an error,
  // `data` is undefined. The last good answer is kept here so a failure keeps the cards on
  // screen (spec § Web, search page states).
  // Adjusted during render rather than in an effect (react.dev, "You might not need an effect").
  // The query travels with its answer, so headings name what the cards on screen answered;
  // placeholder data is the previous query's answer, so it is never recorded under this one.
  const [last, setLast] = useState<{ query: string; response: SearchResponse } | undefined>(
    undefined,
  );
  if (data !== undefined && !isPlaceholderData && data !== last?.response)
    setLast({ query, response: data });

  return (
    <main className="container mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Buscar</h1>
      <div className="grid gap-6">
        <SearchForm onSearch={search} />
        <SearchResults
          query={query}
          answeredQuery={last?.query ?? ""}
          response={last?.response}
          loading={isFetching}
          error={error ? "Não foi possível buscar. Tente novamente." : null}
        />
      </div>
    </main>
  );
}
