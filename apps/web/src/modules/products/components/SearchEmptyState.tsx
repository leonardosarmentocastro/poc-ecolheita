import { Text } from "@mantine/core";

export interface SearchEmptyStateProps {
  query: string;
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return <Text c="dimmed">Nenhum produto parecido com “{query}”.</Text>;
}
