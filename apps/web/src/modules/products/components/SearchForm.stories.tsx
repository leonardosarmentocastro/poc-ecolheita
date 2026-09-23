import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { SearchForm } from "@/modules/products/components/SearchForm";

const meta = {
  component: SearchForm,
  tags: ["autodocs"],
  args: { onSearch: fn() },
} satisfies Meta<typeof SearchForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Enter submits the trimmed query. */
export const EnterSubmits: Story = {
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByRole("searchbox", { name: "Nome do produto" });
    await userEvent.type(input, "  banana  {Enter}");
    await expect(args.onSearch).toHaveBeenCalledWith("banana");
  },
};

/** The button submits too, and is at least 44 px tall. */
export const ButtonSubmits: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Nome do produto" }), "maçã");
    const button = c.getByRole("button", { name: "Buscar" });
    await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await userEvent.click(button);
    await expect(args.onSearch).toHaveBeenCalledWith("maçã");
  },
};

/** An empty or blank query is not submitted. */
export const BlankIsNotSubmitted: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Nome do produto" }), "   {Enter}");
    await userEvent.click(c.getByRole("button", { name: "Buscar" }));
    await expect(args.onSearch).not.toHaveBeenCalled();
  },
};
