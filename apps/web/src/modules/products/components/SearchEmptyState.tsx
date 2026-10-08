import { Title } from "@mantine/core";

export interface SearchEmptyStateProps {
  query: string;
}

/** The seller's plain "no" (spec § The page). A heading, so it is found by role. */
export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return (
    <Title order={2} size="h4">
      Não encontramos “{query}”
    </Title>
  );
}
