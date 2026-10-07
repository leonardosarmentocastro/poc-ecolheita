"use client";

import { Badge, Card, Text } from "@mantine/core";
import type { SearchResult } from "@/modules/products/types";
import { formatBRL } from "@/modules/products/utils/format-brl";

export interface SearchResultCardProps {
  result: SearchResult;
}

/** One offer. The similarity is shown so a person can judge a miss or a false hit. */
export function SearchResultCard({ result }: SearchResultCardProps) {
  const discounted = result.discountPercentage > 0;
  return (
    <Card
      component="article"
      aria-label={result.name}
      withBorder
      radius="md"
      className="grid gap-1 tabular-nums"
    >
      <Text size="sm" c="dimmed">
        {result.shopName}
      </Text>
      <Text fw={600}>{result.name}</Text>
      <div className="flex items-baseline gap-2">
        {discounted && (
          <Text component="span" size="sm" c="dimmed" td="line-through">
            {formatBRL(result.price)}
          </Text>
        )}
        <Text component="span" size="lg" fw={700}>
          {formatBRL(result.finalPrice)}
        </Text>
        {discounted && <Badge color="green">{result.discountPercentage}% off</Badge>}
      </div>
      <div className="flex justify-between">
        <Text size="sm">{result.quantity} un.</Text>
        <Text size="xs" c="dimmed">
          similaridade {result.similarity.toFixed(4).replace(".", ",")}
        </Text>
      </div>
    </Card>
  );
}
