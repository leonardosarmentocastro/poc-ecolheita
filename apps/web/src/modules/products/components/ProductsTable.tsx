"use client";

import { ActionIcon, Badge, Table, Text } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import type { Product } from "@/modules/products/types";
import { formatBRL } from "@/modules/products/utils/format-brl";

export interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

/** Presentational: the container fetches and passes everything down. */
export function ProductsTable({ products, loading, error, onEdit, onDelete }: ProductsTableProps) {
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
          <Table.Th>Ações</Table.Th>
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
              <Table.Td>
                <div className="flex gap-1">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    w={44}
                    h={44}
                    aria-label={`Editar ${p.name}`}
                    onClick={() => onEdit(p)}
                  >
                    <IconPencil size={20} aria-hidden="true" />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    w={44}
                    h={44}
                    aria-label={`Excluir ${p.name}`}
                    onClick={() => onDelete(p)}
                  >
                    <IconTrash size={20} aria-hidden="true" />
                  </ActionIcon>
                </div>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
