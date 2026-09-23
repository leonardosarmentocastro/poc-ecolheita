# Product vector search — slice 3: edit and delete

**Owns:** Changing and removing a registered product: `PATCH` and `DELETE /products/:id`, re-embedding when the normalised name changes, the edit mode of the product drawer, the delete confirmation dialog, and the row actions on the products table.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this repository the orchestrator is `/implement-stack`, which runs the implementer agent on this plan.

**Goal:** A person renames "Banana" to "Maçã" from the products page and it leaves the banana search results; a person deletes a product and it is gone.

**Architecture:** The products repository gains `update` (which re-embeds only when the normalised name changed) and `remove`, both behind the same one-write-path rule as `create`. Two resolvers and two routes. On the web, the existing drawer gets an edit mode fed by `initialValues`, a new confirmation dialog, and the table gets per-row actions; the container wires them to two new mutations.

**Tech Stack:** as slices 1 and 2.

**Spec:** `docs/superpowers/specs/2026-09-22-product-vector-search-design.md`

## Global Constraints

- Branch `feat/product-vector-search-slice-3` off `feat/product-vector-search-slice-2` (or off the feature branch once slice 2 merged; the handover's stack table decides).
- `PATCH /products/:id` takes a partial body of `shopName`, `name`, `price`, `quantity`, `discountPercentage`, validated with the same rules as create; re-embeds only when `normalizeForEmbedding(newName) !== normalizeForEmbedding(oldName)`; sets `updatedAt`; 404 when the id is unknown or non-numeric; returns the product with `finalPrice`.
- `DELETE /products/:id` returns 204, or 404.
- The repository stays the one write path; resolvers never touch `db`.
- Duplicates remain allowed; an update never checks uniqueness.
- Web rules as slices 1 and 2. The delete dialog is a Mantine `Modal` named by its visible title, closes on Escape, returns focus to the row's button, and its confirm button is disabled while the delete runs. Row action buttons carry the product name in their accessible name ("Editar Banana prata") and are at least 44 px.
- Local gates before the PR: `pnpm test`, `pnpm test:stories`, `pnpm e2e`.

## Review Focus

1. A PATCH with an empty body `{}` is a no-op 200 returning the unchanged product, not a 400 and not a re-embed. (Task 1)
2. A PATCH that only changes the case or spacing of the name keeps the stored vector byte-for-byte. (Task 1)
3. A PATCH with `price: 4.99` is 400, exactly like create. (Task 1)
4. Deleting a product twice is 404 the second time, and `GET` after delete is 404. (Task 2)
5. Editing a product with 0% discount shows "0" in the discount field and "0,00"-style reais formatting for a zero price, not blank fields. (Task 3)

---

### Task 1: `PATCH /products/:id` with re-embed on rename

**Files:**
- Create: `apps/api/src/modules/products/resolvers/update-product-resolver.ts`, `apps/api/src/modules/products/__tests__/update-product.api.test.ts`
- Modify: `apps/api/src/modules/products/schema.ts`, `apps/api/src/modules/products/repository.ts`, `apps/api/src/modules/products/resolvers/index.ts`, `apps/api/src/modules/products/routes.ts`

**Interfaces:**
- Consumes: `productsRepository.findById`, `findEmbedding`, `search`; `embed`, `normalizeForEmbedding`; `PRODUCT_PUBLIC_COLUMNS`; `toProduct`; `seedBananaScenario`.
- Produces: `updateProductSchema`, `UpdateProductInput` (all fields optional); `productsRepository.update(id: number, input: UpdateProductInput): Promise<Product | undefined>`; route `PATCH /products/:id`.

- [ ] **Step 1: Write the failing tests**

`__tests__/update-product.api.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { productsRepository } from "@/modules/products/repository";
import { bananaPrata } from "./fixtures";

const create = (base: string) =>
  json(base, "/products", { method: "POST", body: JSON.stringify(bananaPrata) }).then((r) => r.json());
const patch = (base: string, id: number | string, body: unknown) =>
  json(base, `/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });

describe("PATCH /products/:id", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("updates fields and recomputes finalPrice (200)", async () => {
    const created = await create(base);
    const res = await patch(base, created.id, { price: 1000, discountPercentage: 25, quantity: 3 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: created.id, name: "Banana prata", price: 1000, discountPercentage: 25, quantity: 3, finalPrice: 750 });
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(created.updatedAt).getTime());
    expect(body).not.toHaveProperty("embedding");
  });

  it("an empty body is a no-op 200", async () => {
    const created = await create(base);
    const before = await productsRepository.findEmbedding(created.id);
    const res = await patch(base, created.id, {});
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: created.id, name: "Banana prata", finalPrice: 350 });
    expect(await productsRepository.findEmbedding(created.id)).toEqual(before);
  });

  it("re-embeds when the normalised name changes", async () => {
    const created = await create(base);
    const before = await productsRepository.findEmbedding(created.id);
    const res = await patch(base, created.id, { name: "Maçã argentina" });
    expect(res.status).toBe(200);
    const after = await productsRepository.findEmbedding(created.id);
    expect(after).not.toEqual(before);
    const hits = await (await fetch(`${base}/products/search?q=banana`)).json();
    expect(hits.map((h: { id: number }) => h.id)).not.toContain(created.id);
  });

  it("keeps the vector when only case or spacing of the name changes", async () => {
    const created = await create(base);
    const before = await productsRepository.findEmbedding(created.id);
    const res = await patch(base, created.id, { name: "  BANANA   prata " });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("BANANA   prata");
    expect(await productsRepository.findEmbedding(created.id)).toEqual(before);
  });

  it.each([
    ["price with decimals", { price: 4.99 }],
    ["whitespace-only name", { name: "   " }],
    ["discount above 100", { discountPercentage: 101 }],
    ["negative quantity", { quantity: -1 }],
  ])("rejects %s (400)", async (_label, body) => {
    const created = await create(base);
    const res = await patch(base, created.id, body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("validation_error");
  });

  it("is 404 for an unknown or non-numeric id", async () => {
    expect((await patch(base, 999999, { price: 1 })).status).toBe(404);
    expect((await patch(base, "abc", { price: 1 })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
cd apps/api && pnpm vitest run src/modules/products/__tests__/update-product.api.test.ts
```

Expected: FAIL with 404 (no PATCH route).

- [ ] **Step 3: Implement**

`schema.ts`, append:

```ts
export const updateProductSchema = createProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
```

`repository.ts`, add the import of `UpdateProductInput` and the method:

```ts
  /**
   * Partial update. The vector is recomputed only when the normalised name changed, so a
   * change of case or spacing does not re-embed (CONTEXT.md § Search).
   */
  async update(id: number, input: UpdateProductInput): Promise<Product | undefined> {
    if (!Number.isInteger(id)) return undefined;
    const [current] = await db.select({ name: products.name }).from(products).where(eq(products.id, id));
    if (!current) return undefined;

    const renamed =
      input.name !== undefined &&
      normalizeForEmbedding(input.name) !== normalizeForEmbedding(current.name);
    const embedding = renamed ? await embed(normalizeForEmbedding(input.name!)) : undefined;

    const [row] = await db
      .update(products)
      .set({ ...input, ...(embedding ? { embedding } : {}), updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning(PRODUCT_PUBLIC_COLUMNS);
    return row ? toProduct(row) : undefined;
  },
```

`resolvers/update-product-resolver.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "@/db/data/errors";
import { productsRepository } from "@/modules/products/repository";
import { updateProductSchema } from "@/modules/products/schema";

export const updateProductResolver = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = updateProductSchema.parse(req.body);
    const updated = await productsRepository.update(Number(req.params.id), input);
    if (!updated) throw new NotFoundError(`product ${req.params.id} not found`);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};
```

`resolvers/index.ts` gains the export; `routes.ts` gains, after `GET /:id`:

```ts
productsRouter.patch("/:id", resolvers.updateProductResolver);
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd apps/api && pnpm test && pnpm typecheck && pnpm lint
```

Expected: green. If `createProductSchema.partial()` keeps drizzle-zod's trimming refinements (it does in 0.8), the whitespace-only name case is red only if the refinement was lost; fix the schema, not the test.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): PATCH /products/:id, re-embedding only on rename"
```

---

### Task 2: `DELETE /products/:id`

**Files:**
- Create: `apps/api/src/modules/products/resolvers/delete-product-resolver.ts`, `apps/api/src/modules/products/__tests__/delete-product.api.test.ts`
- Modify: `apps/api/src/modules/products/repository.ts`, `apps/api/src/modules/products/resolvers/index.ts`, `apps/api/src/modules/products/routes.ts`

**Interfaces:**
- Produces: `productsRepository.remove(id: number): Promise<boolean>`; route `DELETE /products/:id`.

- [ ] **Step 1: Write the failing test**

`__tests__/delete-product.api.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

describe("DELETE /products/:id", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("deletes (204), then GET is 404 and a second delete is 404", async () => {
    const created = await (
      await json(base, "/products", { method: "POST", body: JSON.stringify(bananaPrata) })
    ).json();
    expect((await fetch(`${base}/products/${created.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await fetch(`${base}/products/${created.id}`)).status).toBe(404);
    expect((await fetch(`${base}/products/${created.id}`, { method: "DELETE" })).status).toBe(404);
    const list = await (await fetch(`${base}/products`)).json();
    expect(list).toEqual([]);
  });

  it("is 404 for a non-numeric id", async () => {
    expect((await fetch(`${base}/products/abc`, { method: "DELETE" })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd apps/api && pnpm vitest run src/modules/products/__tests__/delete-product.api.test.ts
```

Expected: FAIL with 404 on the first delete.

- [ ] **Step 3: Implement**

`repository.ts`:

```ts
  async remove(id: number): Promise<boolean> {
    if (!Number.isInteger(id)) return false;
    const deleted = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    return deleted.length > 0;
  },
```

`resolvers/delete-product-resolver.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "@/db/data/errors";
import { productsRepository } from "@/modules/products/repository";

export const deleteProductResolver = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ok = await productsRepository.remove(Number(req.params.id));
    if (!ok) throw new NotFoundError(`product ${req.params.id} not found`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
```

`resolvers/index.ts` gains the export; `routes.ts` gains:

```ts
productsRouter.delete("/:id", resolvers.deleteProductResolver);
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd apps/api && pnpm test && pnpm typecheck && pnpm lint
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): DELETE /products/:id"
```

---

### Task 3: Web: update and delete in the API client and hooks; edit mode of `ProductForm`

**Files:**
- Create: `apps/web/src/modules/products/utils/cents-to-reais-input.ts`, `apps/web/src/modules/products/utils/cents-to-reais-input.test.ts`, `apps/web/src/modules/products/utils/to-product-form-values.ts`, `apps/web/src/modules/products/utils/to-product-form-values.test.ts`
- Modify: `apps/web/src/modules/products/types.ts`, `apps/web/src/modules/products/api.ts`, `apps/web/src/modules/products/api.test.ts`, `apps/web/src/modules/products/hooks/use-product-mutations.ts`, `apps/web/src/modules/products/components/ProductForm.tsx`, `apps/web/src/modules/products/components/ProductForm.stories.tsx`

**Interfaces:**
- Produces: `UpdateProductInput = Partial<CreateProductInput>`; `productsAPI.update(id, input)`, `productsAPI.remove(id)`; `useUpdateProduct()`, `useDeleteProduct()`; `centsToReaisInput(cents): string` ("500" → "5,00"); `toProductFormValues(product): ProductFormValues`; `ProductForm` props gain `initialValues?: ProductFormValues` and `title: string`.

- [ ] **Step 1: Write the failing unit tests**

`utils/cents-to-reais-input.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { centsToReaisInput } from "@/modules/products/utils/cents-to-reais-input";

describe("centsToReaisInput", () => {
  it("formats cents as a reais string a person can edit, no currency symbol", () => {
    expect(centsToReaisInput(500)).toBe("5,00");
    expect(centsToReaisInput(123456)).toBe("1234,56");
    expect(centsToReaisInput(0)).toBe("0,00");
  });
});
```

`utils/to-product-form-values.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toProductFormValues } from "@/modules/products/utils/to-product-form-values";

describe("toProductFormValues", () => {
  it("turns a product into editable strings", () => {
    const at = "2026-09-22T12:00:00.000Z";
    expect(
      toProductFormValues({ id: 1, shopName: "VEC", name: "Banana prata", price: 500, quantity: 10, discountPercentage: 0, finalPrice: 500, createdAt: at, updatedAt: at }),
    ).toEqual({ shopName: "VEC", name: "Banana prata", priceReais: "5,00", quantity: "10", discountPercentage: "0" });
  });
});
```

`api.test.ts`, append:

```ts
  it("patches /products/:id and deletes /products/:id", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await productsAPI.update(7, { price: 100 });
    expect(String(spy.mock.calls[0][0])).toMatch(/\/products\/7$/);
    expect(spy.mock.calls[0][1]?.method).toBe("PATCH");
    spy.mockResolvedValue(new Response(null, { status: 204 }));
    await productsAPI.remove(7);
    expect(spy.mock.calls[1][1]?.method).toBe("DELETE");
  });
```

- [ ] **Step 2: Run them to verify they fail**

```bash
cd apps/web && pnpm test
```

Expected: FAIL.

- [ ] **Step 3: Implement utilities, types, API and hooks**

`utils/cents-to-reais-input.ts`:

```ts
/** Cents → the plain reais string the form edits ("5,00"). No grouping, no symbol. */
export const centsToReaisInput = (cents: number): string => {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
};
```

`utils/to-product-form-values.ts`:

```ts
import type { ProductFormValues } from "@/modules/products/schema";
import type { Product } from "@/modules/products/types";
import { centsToReaisInput } from "@/modules/products/utils/cents-to-reais-input";

export const toProductFormValues = (p: Product): ProductFormValues => ({
  shopName: p.shopName,
  name: p.name,
  priceReais: centsToReaisInput(p.price),
  quantity: String(p.quantity),
  discountPercentage: String(p.discountPercentage),
});
```

`types.ts`, append:

```ts
export type UpdateProductInput = Partial<CreateProductInput>;
```

`api.ts`, append:

```ts
  update: (id: number, input: UpdateProductInput) =>
    request<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`/products/${id}`, { method: "DELETE" }),
```

`hooks/use-product-mutations.ts`, append:

```ts
export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateProductInput }) => productsAPI.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productsAPI.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}
```

(Import `UpdateProductInput` from the types.)

- [ ] **Step 4: Run the unit tests to verify they pass**

```bash
cd apps/web && pnpm test
```

Expected: PASS.

- [ ] **Step 5: Write the failing edit-mode story**

In `ProductForm.stories.tsx`, add `title: "Novo produto"` to `meta.args`, change the `drawer` helper to `screen.findByRole("dialog", { name: /produto/ })`, and add:

```tsx
/** Edit mode opens with the product's values in every field, zero included. */
export const EditModePrefilled: Story = {
  args: {
    title: "Editar produto",
    initialValues: { shopName: "VEC Hortifruti", name: "Banana prata", priceReais: "5,00", quantity: "10", discountPercentage: "0" },
  },
  play: async ({ args }) => {
    const d = within(await screen.findByRole("dialog", { name: "Editar produto" }));
    await expect(d.getByLabelText("Loja")).toHaveValue("VEC Hortifruti");
    await expect(d.getByLabelText("Nome do produto")).toHaveValue("Banana prata");
    await expect(d.getByLabelText("Preço (R$)")).toHaveValue("5,00");
    await expect(d.getByLabelText("Quantidade em estoque")).toHaveValue("10");
    await expect(d.getByLabelText("Desconto (%)")).toHaveValue("0");
    await userEvent.clear(d.getByLabelText("Nome do produto"));
    await userEvent.type(d.getByLabelText("Nome do produto"), "Maçã");
    await userEvent.click(d.getByRole("button", { name: "Salvar" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ shopName: "VEC Hortifruti", name: "Maçã", price: 500, quantity: 10, discountPercentage: 0 });
  },
};
```

- [ ] **Step 6: Run the stories to verify the new one fails**

```bash
cd apps/web && pnpm test:stories
```

Expected: `EditModePrefilled` FAIL (no `title` / `initialValues` props).

- [ ] **Step 7: Add edit mode to `ProductForm.tsx`**

Props:

```ts
export interface ProductFormProps {
  opened: boolean;
  title: string;
  initialValues?: ProductFormValues;
  onClose: () => void;
  onSubmit: (input: CreateProductInput) => Promise<void>;
  pending: boolean;
  error: string | null;
}
```

Replace the reset effect with:

```tsx
  useEffect(() => {
    if (opened) reset(initialValues ?? EMPTY);
  }, [opened, initialValues, reset]);
```

and `title="Novo produto"` on the `Drawer` with `title={title}`. Update `ProductsPageContainer` to pass `title="Novo produto"` (edit wiring comes in Task 5).

- [ ] **Step 8: Run the stories, typecheck, lint**

```bash
cd apps/web && pnpm test:stories && pnpm typecheck && pnpm lint
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/modules/products
git commit -m "feat(web): update and delete API, hooks, ProductForm edit mode"
```

---

### Task 4: `DeleteProductDialog` and row actions on `ProductsTable`

**Files:**
- Create: `apps/web/src/modules/products/components/DeleteProductDialog.tsx`, `apps/web/src/modules/products/components/DeleteProductDialog.stories.tsx`
- Modify: `apps/web/src/modules/products/components/ProductsTable.tsx`, `apps/web/src/modules/products/components/ProductsTable.stories.tsx`

**Interfaces:**
- Produces: `<DeleteProductDialog product={Product | null} deleting onConfirm onClose />`; `ProductsTable` props gain `onEdit: (p: Product) => void` and `onDelete: (p: Product) => void`.

- [ ] **Step 1: Write the failing stories**

`DeleteProductDialog.stories.tsx`:

```tsx
import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, userEvent, within } from "storybook/test";
import { DeleteProductDialog } from "@/modules/products/components/DeleteProductDialog";
import type { Product } from "@/modules/products/types";

type Props = ComponentProps<typeof DeleteProductDialog>;

const at = "2026-09-22T12:00:00.000Z";
const banana: Product = {
  id: 1, shopName: "Mercadinho Candelária", name: "Banana", price: 600, quantity: 10,
  discountPercentage: 50, finalPrice: 300, createdAt: at, updatedAt: at,
};

const meta = {
  component: DeleteProductDialog,
  parameters: { docs: { story: { inline: false, iframeHeight: "400px" } } },
  tags: ["autodocs"],
  args: { product: banana, deleting: false, onConfirm: fn(), onClose: fn() },
} satisfies Meta<typeof DeleteProductDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const question = async () => within(await screen.findByRole("dialog", { name: "Excluir produto" }));

/** The question names the product; confirming calls the handler; both buttons are 44 px. */
export const ConfirmDeletes: Story = {
  play: async ({ args }) => {
    const d = await question();
    await expect(d.getByText("Excluir “Banana” de Mercadinho Candelária? Esta ação não pode ser desfeita.")).toBeInTheDocument();
    for (const name of ["Cancelar", "Excluir"]) {
      await expect(d.getByRole("button", { name }).getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
    await userEvent.click(d.getByRole("button", { name: "Excluir" }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

/** While deleting, the confirm button is disabled and says so. */
export const Deleting: Story = {
  args: { deleting: true },
  play: async () => {
    const d = await question();
    await expect(d.getByRole("button", { name: "Excluindo…" })).toBeDisabled();
  },
};

/** Opened from a real button so focus has somewhere to return; Escape cancels and focus comes back. */
function OpenedFromAButton(args: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  return (
    <>
      <button type="button" onClick={() => setProduct(args.product)}>
        abrir
      </button>
      <DeleteProductDialog
        {...args}
        product={product}
        onClose={() => {
          args.onClose();
          setProduct(null);
        }}
      />
    </>
  );
}

export const EscapeCancelsAndReturnsFocus: Story = {
  render: (args) => <OpenedFromAButton {...args} />,
  play: async ({ canvasElement, args }) => {
    const opener = within(canvasElement).getByRole("button", { name: "abrir" });
    await userEvent.click(opener);
    await question();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalled();
    await expect(screen.queryByRole("dialog", { name: "Excluir produto" })).toBeNull();
    await expect(opener).toHaveFocus();
  },
};
```

In `ProductsTable.stories.tsx`, add `onEdit: fn()` and `onDelete: fn()` to `meta.args` (import `fn`, `userEvent`), and add:

```tsx
/** Each row has an edit and a delete action named after the product, 44 px tall, wired to the handlers. */
export const RowActions: Story = {
  play: async ({ canvasElement, args }) => {
    const table = within(canvasElement).getByRole("table", { name: "Produtos" });
    const edit = within(table).getByRole("button", { name: "Editar Banana prata" });
    const del = within(table).getByRole("button", { name: "Excluir Banana prata" });
    for (const b of [edit, del]) {
      await expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
    await userEvent.click(edit);
    await expect(args.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    await userEvent.click(del);
    await expect(args.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  },
};
```

- [ ] **Step 2: Run the stories to verify they fail**

```bash
cd apps/web && pnpm test:stories
```

Expected: the dialog stories FAIL (component missing); `RowActions` FAILS (no buttons).

- [ ] **Step 3: Write the dialog and the row actions**

`DeleteProductDialog.tsx`:

```tsx
"use client";

import { Button, Modal, Text } from "@mantine/core";
import type { Product } from "@/modules/products/types";

export interface DeleteProductDialogProps {
  /** The product being asked about; `null` while the question is closed. */
  product: Product | null;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Presentational: asks, and reports the answer. Escape and the backdrop cancel. */
export function DeleteProductDialog({ product, deleting, onConfirm, onClose }: DeleteProductDialogProps) {
  return (
    <Modal
      opened={product !== null}
      onClose={onClose}
      title="Excluir produto"
      centered
      size="sm"
      withCloseButton={false}
      classNames={{ title: "font-semibold" }}
    >
      <div className="grid gap-4">
        <Text size="sm">
          Excluir “{product?.name}” de {product?.shopName}? Esta ação não pode ser desfeita.
        </Text>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="default" size="md" h={44} onClick={onClose}>
            Cancelar
          </Button>
          <Button color="red" size="md" h={44} disabled={deleting} onClick={onConfirm}>
            {deleting ? "Excluindo…" : "Excluir"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

`ProductsTable.tsx`: add the props, a sixth header cell `<Table.Th>Ações</Table.Th>`, and in each row (import `ActionIcon` and `IconPencil`, `IconTrash` from `@tabler/icons-react`):

```tsx
              <Table.Td>
                <div className="flex gap-1">
                  <ActionIcon variant="subtle" color="gray" w={44} h={44} aria-label={`Editar ${p.name}`} onClick={() => onEdit(p)}>
                    <IconPencil size={20} aria-hidden="true" />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" w={44} h={44} aria-label={`Excluir ${p.name}`} onClick={() => onDelete(p)}>
                    <IconTrash size={20} aria-hidden="true" />
                  </ActionIcon>
                </div>
              </Table.Td>
```

- [ ] **Step 4: Run the stories, typecheck, lint**

```bash
cd apps/web && pnpm test:stories && pnpm typecheck && pnpm lint
```

Expected: PASS (the container does not compile until Task 5 passes the new props; if `typecheck` is red only there, continue to Task 5 before committing, or pass no-op handlers now).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/products/components
git commit -m "feat(web): DeleteProductDialog and row actions with stories"
```

---

### Task 5: Container wiring and the rename and delete e2e

**Files:**
- Create: `e2e/modules/products/edit-and-delete-product.test.ts`
- Modify: `apps/web/src/modules/products/components/ProductsPageContainer.tsx`

- [ ] **Step 1: Write the failing e2e**

`e2e/modules/products/edit-and-delete-product.test.ts`:

```ts
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { seedProduct } from "../../fixtures/seed";
import { BANANA_SCENARIO } from "../../../apps/api/src/modules/products/fixtures/banana-scenario";

async function seedScenario(request: APIRequestContext) {
  for (const row of BANANA_SCENARIO) {
    const { key: _key, ...input } = row;
    await seedProduct(request, input);
  }
}

test("renaming Banana to Maçã takes it out of the banana results", async ({ page, request }) => {
  await seedScenario(request);
  await page.goto("/produtos");
  await page.getByRole("button", { name: "Editar Banana" }).click();
  const drawer = page.getByRole("dialog", { name: "Editar produto" });
  await expect(drawer.getByLabel("Nome do produto")).toHaveValue("Banana");
  await drawer.getByLabel("Nome do produto").fill("Maçã");
  await drawer.getByRole("button", { name: "Salvar" }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("row", { name: /Maçã/ })).toContainText("Mercadinho Candelária");

  await page.goto("/buscar");
  await page.getByRole("searchbox", { name: "Nome do produto" }).fill("banana");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("article").first()).toBeVisible();
  const names = await page.getByRole("article").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  expect(names).not.toContain("Maçã");
  expect(names.slice(0, 3)).toEqual(["Banana prata orgânica", "Banana prata", "Banana nanica"]);
});

test("deleting a product removes its row", async ({ page, request }) => {
  await seedProduct(request, { shopName: "VEC Hortifruti", name: "Banana prata", price: 500, quantity: 10, discountPercentage: 30 });
  await page.goto("/produtos");
  await page.getByRole("button", { name: "Excluir Banana prata" }).click();
  const dialog = page.getByRole("dialog", { name: "Excluir produto" });
  await dialog.getByRole("button", { name: "Excluir" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Nenhum produto cadastrado.")).toBeVisible();
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm e2e
```

Expected: FAIL (no "Editar Banana" button on the page yet, since the container passes no handlers).

- [ ] **Step 3: Wire the container**

`ProductsPageContainer.tsx` (whole file):

```tsx
"use client";

import { useState } from "react";
import { Button } from "@mantine/core";
import { notify } from "@/lib/notify";
import { DeleteProductDialog } from "@/modules/products/components/DeleteProductDialog";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { ProductsTable } from "@/modules/products/components/ProductsTable";
import { useCreateProduct, useDeleteProduct, useUpdateProduct } from "@/modules/products/hooks/use-product-mutations";
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
        opened={formOpen}
        title={editing ? "Editar produto" : "Novo produto"}
        initialValues={editing ? toProductFormValues(editing) : undefined}
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
```

- [ ] **Step 4: Run every gate**

```bash
pnpm e2e && pnpm test && pnpm test:stories && pnpm typecheck && pnpm lint && pnpm prettier --check . && pnpm build
```

Expected: green.

- [ ] **Step 5: Commit and push**

```bash
git add apps/web e2e
git commit -m "feat(web): edit and delete products from the table; e2e rename leaves banana results"
git push -u origin feat/product-vector-search-slice-3
```

The PR body (opened by `/implement-stack`) carries `Plan: docs/superpowers/plans/2026-09-22-product-vector-search-slice-3-edit-and-delete.md`.
