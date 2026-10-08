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

const cakes = [
  product(10, "Padaria Pão Quente", "Fatia de bolo red velvet", 800),
  product(7, "Hortifruti São José", "Bolo de banana", 840),
];
const cakeExtras = [product(11, "Mercadinho Candelária", "Mistura para bolo de chocolate", 900)];
const names = (el: HTMLElement) =>
  within(el)
    .getAllByRole("article")
    .map((a) => a.getAttribute("aria-label"));

/** Matches and related: two headed sections, each in the order given. */
export const MatchesAndRelated: Story = {
  args: { query: "bolo", response: { tiered: true, matches: cakes, related: cakeExtras } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const found = c.getByRole("heading", { name: "Encontramos 2 produtos para “bolo”" });
    const also = c.getByRole("heading", { name: "Você também pode gostar" });
    await expect(
      found.compareDocumentPosition(also) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(names(canvasElement)).toEqual([
      "Fatia de bolo red velvet",
      "Bolo de banana",
      "Mistura para bolo de chocolate",
    ]);
    await expect(c.queryByText(/Não conseguimos organizar/)).toBeNull();
  },
};

/** One match: the singular. */
export const OneMatch: Story = {
  args: { query: "bolo", response: { tiered: true, matches: cakes.slice(0, 1), related: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByRole("heading", { name: "Encontramos 1 produto para “bolo”" }),
    ).toBeInTheDocument();
    await expect(c.queryByRole("heading", { name: "Você também pode gostar" })).toBeNull();
  },
};

/** No match, some related: the plain "no", then the related section. */
export const NoMatchButRelated: Story = {
  args: { query: "bolo", response: { tiered: true, matches: [], related: cakeExtras } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { name: "Não encontramos “bolo”" })).toBeInTheDocument();
    await expect(c.getByRole("heading", { name: "Você também pode gostar" })).toBeInTheDocument();
    await expect(names(canvasElement)).toEqual(["Mistura para bolo de chocolate"]);
  },
};

/** Loading or failing over a tiered answer keeps its sections and cards on screen. */
export const LoadingKeepsTieredResults: Story = {
  args: {
    query: "bolo",
    response: { tiered: true, matches: cakes, related: cakeExtras },
    loading: true,
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("status")).toHaveTextContent("Buscando…");
    await expect(c.getByRole("heading", { name: "Você também pode gostar" })).toBeInTheDocument();
    await expect(c.getAllByRole("article")).toHaveLength(3);
  },
};

export const FailedKeepsTieredResults: Story = {
  args: {
    query: "bolo",
    response: { tiered: true, matches: cakes, related: cakeExtras },
    error: "Não foi possível buscar. Tente novamente.",
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent(
      "Não foi possível buscar. Tente novamente.",
    );
    await expect(c.getAllByRole("article")).toHaveLength(3);
  },
};

/** Nothing at all: only the plain "no". */
export const TieredNothing: Story = {
  args: { query: "bolo", response: { tiered: true, matches: [], related: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { name: "Não encontramos “bolo”" })).toBeInTheDocument();
    await expect(c.queryByRole("heading", { name: "Você também pode gostar" })).toBeNull();
    await expect(c.queryAllByRole("article")).toHaveLength(0);
  },
};
