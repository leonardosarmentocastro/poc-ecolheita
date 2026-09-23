import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SearchEmptyState } from "@/modules/products/components/SearchEmptyState";

const meta = {
  component: SearchEmptyState,
  tags: ["autodocs"],
  args: { query: "detergente" },
} satisfies Meta<typeof SearchEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The text names the query verbatim. */
export const NothingSimilar: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Nenhum produto parecido com “detergente”."),
    ).toBeInTheDocument();
  },
};
