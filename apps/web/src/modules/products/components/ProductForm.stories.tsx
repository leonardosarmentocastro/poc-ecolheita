import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, userEvent, within } from "storybook/test";
import { ProductForm } from "@/modules/products/components/ProductForm";

const meta = {
  component: ProductForm,
  // A drawer portals a full-viewport overlay; inline docs would stack one per story.
  parameters: { docs: { story: { inline: false, iframeHeight: "640px" } } },
  tags: ["autodocs"],
  args: { opened: true, onClose: fn(), onSubmit: fn(async () => {}), pending: false, error: null },
} satisfies Meta<typeof ProductForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const drawer = async () => within(await screen.findByRole("dialog", { name: "Novo produto" }));

/** Filling every field and saving submits the API's integers, reais turned into cents. */
export const SubmitsCentsAndIntegers: Story = {
  play: async ({ args }) => {
    const d = await drawer();
    await userEvent.type(d.getByLabelText("Loja"), "VEC Hortifruti");
    await userEvent.type(d.getByLabelText("Nome do produto"), "Banana prata");
    await userEvent.type(d.getByLabelText("Preço (R$)"), "5,00");
    await userEvent.clear(d.getByLabelText("Quantidade em estoque"));
    await userEvent.type(d.getByLabelText("Quantidade em estoque"), "10");
    await userEvent.clear(d.getByLabelText("Desconto (%)"));
    await userEvent.type(d.getByLabelText("Desconto (%)"), "30");
    await userEvent.click(d.getByRole("button", { name: "Salvar" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      shopName: "VEC Hortifruti",
      name: "Banana prata",
      price: 500,
      quantity: 10,
      discountPercentage: 30,
    });
  },
};

/** Saving with empty required fields shows a message per field and submits nothing. */
export const RejectsEmptyRequiredFields: Story = {
  play: async ({ args }) => {
    const d = await drawer();
    await userEvent.click(d.getByRole("button", { name: "Salvar" }));
    await expect(await d.findAllByText("Obrigatório")).toHaveLength(3);
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** While the request is in flight the save button is disabled. */
export const Pending: Story = {
  args: { pending: true },
  play: async () => {
    const d = await drawer();
    await expect(d.getByRole("button", { name: "Salvando…" })).toBeDisabled();
  },
};

/** A failed request is on the screen as text. */
export const Failed: Story = {
  args: { error: "Não foi possível salvar o produto." },
  play: async () => {
    const d = await drawer();
    await expect(d.getByRole("alert")).toHaveTextContent("Não foi possível salvar o produto.");
  },
};

/** Escape closes the drawer. */
export const EscapeCloses: Story = {
  play: async ({ args }) => {
    await drawer();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalled();
  },
};
