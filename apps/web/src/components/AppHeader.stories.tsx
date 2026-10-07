import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { AppHeader } from "@/components/AppHeader";

const meta = {
  component: AppHeader,
  tags: ["autodocs"],
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the products page: both links reachable by name, the current one marked. */
export const OnProductsPage: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/produtos" } } },
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getByRole("navigation", { name: "Principal" });
    const produtos = within(nav).getByRole("link", { name: "Produtos" });
    const buscar = within(nav).getByRole("link", { name: "Buscar" });
    await expect(produtos).toHaveAttribute("aria-current", "page");
    await expect(buscar).not.toHaveAttribute("aria-current");
    for (const link of [produtos, buscar]) {
      await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};

/** On the search page the mark moves. */
export const OnSearchPage: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/buscar" } } },
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getByRole("navigation", { name: "Principal" });
    await expect(within(nav).getByRole("link", { name: "Buscar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
};
