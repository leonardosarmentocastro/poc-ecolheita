import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ProductsTable } from "@/modules/products/components/ProductsTable";
import type { Product } from "@/modules/products/types";

const at = "2026-09-22T12:00:00.000Z";
const bananaPrata: Product = {
  id: 1,
  shopName: "VEC Hortifruti",
  name: "Banana prata",
  price: 500,
  quantity: 10,
  discountPercentage: 30,
  finalPrice: 350,
  createdAt: at,
  updatedAt: at,
};
const fullPriceApple: Product = {
  id: 2,
  shopName: "Mercadinho Candelária",
  name: "Maçã argentina",
  price: 700,
  quantity: 3,
  discountPercentage: 0,
  finalPrice: 700,
  createdAt: at,
  updatedAt: at,
};

const meta = {
  component: ProductsTable,
  tags: ["autodocs"],
  args: {
    products: [bananaPrata, fullPriceApple],
    loading: false,
    error: null,
    onEdit: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof ProductsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One row per product; a discounted row strikes the original price and shows the badge. */
export const DiscountedAndFullPriceRows: Story = {
  play: async ({ canvasElement }) => {
    const table = within(canvasElement).getByRole("table", { name: "Produtos" });
    const rows = within(table).getAllByRole("row").slice(1); // minus the header
    await expect(rows).toHaveLength(2);

    const banana = within(rows[0]);
    await expect(banana.getByText("VEC Hortifruti")).toBeInTheDocument();
    await expect(banana.getByText("Banana prata")).toBeInTheDocument();
    const struck = banana.getByText("R$ 5,00");
    await expect(getComputedStyle(struck).textDecorationLine).toContain("line-through");
    await expect(banana.getByText("R$ 3,50")).toBeInTheDocument();
    await expect(banana.getByText("30% off")).toBeInTheDocument();
    await expect(banana.getByText("10 un.")).toBeInTheDocument();

    const apple = within(rows[1]);
    await expect(apple.queryByText("0% off")).toBeNull();
    const price = apple.getByText("R$ 7,00");
    await expect(getComputedStyle(price).textDecorationLine).not.toContain("line-through");
  },
};

/** Nothing registered yet: the table says so instead of showing an empty grid. */
export const Empty: Story = {
  args: { products: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Nenhum produto cadastrado.")).toBeInTheDocument();
  },
};

/** While the list loads, a status line says so. */
export const Loading: Story = {
  args: { products: [], loading: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("Carregando…");
  },
};

/** When the list fails, the error is on the screen as text. */
export const Failed: Story = {
  args: { products: [], error: "Não foi possível carregar os produtos." },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os produtos.",
    );
  },
};

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
