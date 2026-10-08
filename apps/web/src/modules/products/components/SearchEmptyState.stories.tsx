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

/** The heading names the query verbatim. */
export const NothingFound: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("heading", { name: "Não encontramos “detergente”" }),
    ).toBeInTheDocument();
  },
};
