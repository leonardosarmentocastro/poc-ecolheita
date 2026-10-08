import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SearchResults } from "@/modules/products/components/SearchResults";
import type { Product } from "@/modules/products/types";

const at = "2026-09-22T12:00:00.000Z";
const product = (id: number, shopName: string, name: string, finalPrice: number): Product => ({
  id,
  shopName,
  name,
  price: finalPrice * 2,
  quantity: 10,
  discountPercentage: 50,
  finalPrice,
  createdAt: at,
  updatedAt: at,
});
const bananas = [
  product(4, "CEASA SJC", "Banana prata orgânica", 160),
  product(1, "Mercadinho Candelária", "Banana", 300),
  product(2, "VEC Hortifruti", "Banana prata", 350),
];

const meta = {
  component: SearchResults,
  tags: ["autodocs"],
  args: {
    query: "banana",
    response: { tiered: false, results: bananas },
    loading: false,
    error: null,
  },
} satisfies Meta<typeof SearchResults>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the first search: a prompt, no cards, no empty state. */
export const Idle: Story = {
  args: { query: "", response: undefined },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Digite o nome de um produto")).toBeInTheDocument();
    await expect(c.queryAllByRole("article")).toHaveLength(0);
    await expect(c.queryByRole("heading")).toBeNull();
  },
};

/** Untiered: the notice, then the cards in the order the API gave. */
export const Untiered: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByText("Não conseguimos organizar os resultados por relevância"),
    ).toBeInTheDocument();
    const names = c.getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    await expect(names).toEqual(["Banana prata orgânica", "Banana", "Banana prata"]);
  },
};

/** Loading keeps the previous cards on screen and says it is loading. */
export const LoadingKeepsPreviousResults: Story = {
  args: { loading: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("status")).toHaveTextContent("Buscando…");
    await expect(c.getAllByRole("article")).toHaveLength(3);
  },
};

/** A failed request shows the error and keeps the previous cards. */
export const FailedKeepsPreviousResults: Story = {
  args: { error: "Não foi possível buscar. Tente novamente." },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent(
      "Não foi possível buscar. Tente novamente.",
    );
    await expect(c.getAllByRole("article")).toHaveLength(3);
  },
};

/** Untiered and empty: the "não encontramos" heading, no notice. */
export const UntieredNothing: Story = {
  args: { query: "detergente", response: { tiered: false, results: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByRole("heading", { name: "Não encontramos “detergente”" }),
    ).toBeInTheDocument();
    await expect(c.queryByText(/Não conseguimos organizar/)).toBeNull();
  },
};
