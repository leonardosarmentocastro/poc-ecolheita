"use client";

import { useState } from "react";
import { Button } from "@mantine/core";
import { notify } from "@/lib/notify";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { ProductsTable } from "@/modules/products/components/ProductsTable";
import { useCreateProduct } from "@/modules/products/hooks/use-product-mutations";
import { useProducts } from "@/modules/products/hooks/use-products";
import type { CreateProductInput } from "@/modules/products/types";

/** Container: fetches and mutates; renders the presentational pieces. No story. */
export function ProductsPageContainer() {
  const { data, isLoading, error } = useProducts();
  const create = useCreateProduct();
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const open = () => {
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (input: CreateProductInput) => {
    setFormError(null);
    try {
      await create.mutateAsync(input);
      notify.success("Produto cadastrado");
      setFormOpen(false);
    } catch {
      setFormError("Não foi possível salvar o produto.");
    }
  };

  return (
    <main className="container mx-auto max-w-4xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Button size="md" h={44} onClick={open}>
          Novo produto
        </Button>
      </div>
      <ProductsTable
        products={data ?? []}
        loading={isLoading}
        error={error ? "Não foi possível carregar os produtos." : null}
        onEdit={() => {}}
        onDelete={() => {}}
      />
      <ProductForm
        opened={formOpen}
        title="Novo produto"
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        pending={create.isPending}
        error={formError}
      />
    </main>
  );
}
