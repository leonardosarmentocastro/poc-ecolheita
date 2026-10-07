import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SearchResults } from "@/modules/products/components/SearchResults";
import type { SearchResult } from "@/modules/products/types";

const at = "2026-09-22T12:00:00.000Z";
const result = (id: number, shopName: string, name: string, finalPrice: number): SearchResult => ({
  id,
  shopName,
  name,
  price: finalPrice * 2,
  quantity: 10,
  discountPercentage: 50,
  finalPrice,
  similarity: 0.7,
  createdAt: at,
  updatedAt: at,
});
const bananas = [
  result(4, "CEASA SJC", "Banana prata orgânica", 160),
  result(1, "Mercadinho Candelária", "Banana", 300),
  result(2, "VEC Hortifruti", "Banana prata", 350),
];

const meta = {
  component: SearchResults,
  tags: ["autodocs"],
  args: { query: "banana", results: bananas, loading: false, error: null },
} satisfies Meta<typeof SearchResults>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the first search: a prompt, no cards, no empty state. */
export const Idle: Story = {
  args: { query: "", results: [] },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Digite o nome de um produto")).toBeInTheDocument();
    await expect(c.queryAllByRole("article")).toHaveLength(0);
    await expect(c.queryByText(/Nenhum produto parecido/)).toBeNull();
  },
};

/** Cards in the order given, cheapest first. */
export const CheapestFirst: Story = {
  play: async ({ canvasElement }) => {
    const names = within(canvasElement)
      .getAllByRole("article")
      .map((a) => a.getAttribute("aria-label"));
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

/** Nothing matched: the empty state with the query. */
export const NothingMatched: Story = {
  args: { query: "detergente", results: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Nenhum produto parecido com “detergente”."),
    ).toBeInTheDocument();
  },
};
