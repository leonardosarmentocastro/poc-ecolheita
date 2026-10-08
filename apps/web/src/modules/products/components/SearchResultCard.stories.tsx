import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SearchResultCard } from "@/modules/products/components/SearchResultCard";
import type { Product } from "@/modules/products/types";

const at = "2026-09-22T12:00:00.000Z";
const ceasa: Product = {
  id: 4,
  shopName: "CEASA SJC",
  name: "Banana prata orgânica",
  price: 800,
  quantity: 10,
  discountPercentage: 80,
  finalPrice: 160,
  createdAt: at,
  updatedAt: at,
};

const meta = {
  component: SearchResultCard,
  tags: ["autodocs"],
  args: { product: ceasa },
} satisfies Meta<typeof SearchResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shop, name, struck original price, final price, badge and stock; no similarity. */
export const DiscountedOffer: Story = {
  play: async ({ canvasElement }) => {
    const card = within(
      within(canvasElement).getByRole("article", { name: "Banana prata orgânica" }),
    );
    await expect(card.getByText("CEASA SJC")).toBeInTheDocument();
    const struck = card.getByText("R$ 8,00");
    await expect(getComputedStyle(struck).textDecorationLine).toContain("line-through");
    await expect(card.getByText("R$ 1,60")).toBeInTheDocument();
    await expect(card.getByText("80% off")).toBeInTheDocument();
    await expect(card.getByText("10 un.")).toBeInTheDocument();
    await expect(card.queryByText(/similaridade/)).toBeNull();
  },
};
