"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Drawer, Text, TextInput } from "@mantine/core";
import { productFormSchema, type ProductFormValues } from "@/modules/products/schema";
import type { CreateProductInput } from "@/modules/products/types";
import { toCreateProductInput } from "@/modules/products/utils/to-create-product-input";

export interface ProductFormProps {
  opened: boolean;
  title: string;
  initialValues?: ProductFormValues;
  onClose: () => void;
  onSubmit: (input: CreateProductInput) => Promise<void>;
  pending: boolean;
  error: string | null;
}

const EMPTY: ProductFormValues = {
  shopName: "",
  name: "",
  priceReais: "",
  quantity: "0",
  discountPercentage: "0",
};

/** Presentational: validates the form and hands the API's integers to `onSubmit`. */
export function ProductForm({
  opened,
  title,
  initialValues,
  onClose,
  onSubmit,
  pending,
  error,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (opened) reset(initialValues ?? EMPTY);
    // A form is reset when it opens, never while it is open; `initialValues` is read at
    // that moment only. The container remounts the form per product with a `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(toCreateProductInput(values));
  });

  return (
    <Drawer opened={opened} onClose={onClose} title={title} position="right" size="md">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextInput label="Loja" error={errors.shopName?.message} {...register("shopName")} />
        <TextInput label="Nome do produto" error={errors.name?.message} {...register("name")} />
        <TextInput
          label="Preço (R$)"
          inputMode="decimal"
          placeholder="4,99"
          error={errors.priceReais?.message}
          {...register("priceReais")}
        />
        <TextInput
          label="Quantidade em estoque"
          inputMode="numeric"
          error={errors.quantity?.message}
          {...register("quantity")}
        />
        <TextInput
          label="Desconto (%)"
          inputMode="numeric"
          error={errors.discountPercentage?.message}
          {...register("discountPercentage")}
        />
        {error && (
          <Text role="alert" c="red.8" size="sm">
            {error}
          </Text>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="default" size="md" h={44} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="md" h={44} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
