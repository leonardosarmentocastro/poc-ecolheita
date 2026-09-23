"use client";

import { Badge, Table, Text } from "@mantine/core";
import type { Product } from "@/modules/products/types";
import { formatBRL } from "@/modules/products/utils/format-brl";

export interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  error: string | null;
}

/** Presentational: the container fetches and passes everything down. */
export function ProductsTable({ products, loading, error }: ProductsTableProps) {
  if (loading) {
    return (
      <Text role="status" c="dimmed">
        Carregando…
      </Text>
    );
  }
  if (error) {
    return (
      <Text role="alert" c="red.8">
        {error}
      </Text>
    );
  }
  if (products.length === 0) {
    return <Text c="dimmed">Nenhum produto cadastrado.</Text>;
  }
  return (
    <Table aria-label="Produtos" striped highlightOnHover className="tabular-nums">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Loja</Table.Th>
          <Table.Th>Produto</Table.Th>
          <Table.Th>Preço</Table.Th>
          <Table.Th>Desconto</Table.Th>
          <Table.Th>Estoque</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {products.map((p) => {
          const discounted = p.discountPercentage > 0;
          return (
            <Table.Tr key={p.id}>
              <Table.Td>{p.shopName}</Table.Td>
              <Table.Td>{p.name}</Table.Td>
              <Table.Td>
                <span className="flex flex-col">
                  {discounted && (
                    <Text component="span" size="sm" c="dimmed" td="line-through">
                      {formatBRL(p.price)}
                    </Text>
                  )}
                  <Text component="span" fw={600}>
                    {formatBRL(p.finalPrice)}
                  </Text>
                </span>
              </Table.Td>
              <Table.Td>
                {discounted ? (
                  <Badge color="green">{p.discountPercentage}% off</Badge>
                ) : (
                  <Text c="dimmed">—</Text>
                )}
              </Table.Td>
              <Table.Td>{p.quantity} un.</Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
