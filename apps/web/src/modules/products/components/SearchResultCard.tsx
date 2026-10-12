"use client";

import { Badge, Card, Text } from "@mantine/core";
import type { Product } from "@/modules/products/types";
import { formatBRL } from "@/modules/products/utils/format-brl";

export interface SearchResultCardProps {
  product: Product;
}

/** One offer. */
export function SearchResultCard({ product }: SearchResultCardProps) {
  const discounted = product.discountPercentage > 0;
  return (
    <Card
      component="article"
      aria-label={product.name}
      withBorder
      radius="md"
      className="grid gap-1 tabular-nums"
    >
      <Text size="sm" c="dimmed">
        {product.shopName}
      </Text>
      <Text fw={600}>{product.name}</Text>
      <div className="flex items-baseline gap-2">
        {discounted && (
          <Text component="span" size="sm" c="dimmed" td="line-through">
            {formatBRL(product.price)}
          </Text>
        )}
        <Text component="span" size="lg" fw={700}>
          {formatBRL(product.finalPrice)}
        </Text>
        {discounted && <Badge color="green">{product.discountPercentage}% off</Badge>}
      </div>
      <div className="flex justify-between">
        <Text size="sm">{product.quantity} un.</Text>
      </div>
    </Card>
  );
}
