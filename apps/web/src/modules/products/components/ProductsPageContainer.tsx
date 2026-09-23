"use client";

import { useMemo, useState } from "react";
import { Button } from "@mantine/core";
import { notify } from "@/lib/notify";
import { DeleteProductDialog } from "@/modules/products/components/DeleteProductDialog";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { ProductsTable } from "@/modules/products/components/ProductsTable";
import {
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from "@/modules/products/hooks/use-product-mutations";
import { useProducts } from "@/modules/products/hooks/use-products";
import type { CreateProductInput, Product } from "@/modules/products/types";
import { toProductFormValues } from "@/modules/products/utils/to-product-form-values";

/** Container: fetches and mutates; renders the presentational pieces. No story. */
export function ProductsPageContainer() {
  const { data, isLoading, error } = useProducts();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const remove = useDeleteProduct();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Stable per product: the form reads it once, when it opens (Global Constraints).
  const initialValues = useMemo(
    () => (editing ? toProductFormValues(editing) : undefined),
    [editing],
  );

  const openNew = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (input: CreateProductInput) => {
    setFormError(null);
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input });
      else await create.mutateAsync(input);
      notify.success(editing ? "Produto atualizado" : "Produto cadastrado");
      setFormOpen(false);
    } catch {
      setFormError("Não foi possível salvar o produto.");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      notify.success("Produto excluído");
      setDeleting(null);
    } catch {
      notify.error("Não foi possível excluir o produto.");
    }
  };

  return (
    <main className="container mx-auto max-w-4xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Button size="md" h={44} onClick={openNew}>
          Novo produto
        </Button>
      </div>
      <ProductsTable
        products={data ?? []}
        loading={isLoading}
        error={error ? "Não foi possível carregar os produtos." : null}
        onEdit={openEdit}
        onDelete={setDeleting}
      />
      <ProductForm
        // A new product or a different product remounts the form, so its values are
        // read once, on open, and never wiped by a re-render of this page.
        key={editing?.id ?? "new"}
        opened={formOpen}
        title={editing ? "Editar produto" : "Novo produto"}
        initialValues={initialValues}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        pending={create.isPending || update.isPending}
        error={formError}
      />
      <DeleteProductDialog
        product={deleting}
        deleting={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </main>
  );
}
