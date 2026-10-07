import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@mantine/core";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { ProductForm } from "@/modules/products/components/ProductForm";

const meta = {
  component: ProductForm,
  // A drawer portals a full-viewport overlay; inline docs would stack one per story.
  parameters: { docs: { story: { inline: false, iframeHeight: "640px" } } },
  tags: ["autodocs"],
  args: {
    opened: true,
    title: "Novo produto",
    onClose: fn(),
    onSubmit: fn(async () => {}),
    pending: false,
    error: null,
  },
} satisfies Meta<typeof ProductForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const drawer = async () => within(await screen.findByRole("dialog", { name: /produto/ }));

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

/** Escape closes the drawer and returns focus to the button that opened it. */
export const EscapeCloses: Story = {
  // The trigger lives in the page, so the story supplies one to prove focus comes back to it.
  render: function EscapeClosesRender(args) {
    const [opened, setOpened] = useState(false);
    return (
      <>
        <Button onClick={() => setOpened(true)}>Novo produto</Button>
        <ProductForm
          {...args}
          opened={opened}
          onClose={() => {
            args.onClose();
            setOpened(false);
          }}
        />
      </>
    );
  },
  play: async ({ args, canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "Novo produto" });
    await userEvent.click(trigger);
    await drawer();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** Edit mode opens with the product's values in every field, zero included. */
export const EditModePrefilled: Story = {
  args: {
    title: "Editar produto",
    initialValues: {
      shopName: "VEC Hortifruti",
      name: "Banana prata",
      priceReais: "5,00",
      quantity: "10",
      discountPercentage: "0",
    },
  },
  play: async ({ args }) => {
    const d = within(await screen.findByRole("dialog", { name: "Editar produto" }));
    await expect(d.getByLabelText("Loja")).toHaveValue("VEC Hortifruti");
    await expect(d.getByLabelText("Nome do produto")).toHaveValue("Banana prata");
    await expect(d.getByLabelText("Preço (R$)")).toHaveValue("5,00");
    await expect(d.getByLabelText("Quantidade em estoque")).toHaveValue("10");
    await expect(d.getByLabelText("Desconto (%)")).toHaveValue("0");
    await userEvent.clear(d.getByLabelText("Nome do produto"));
    await userEvent.type(d.getByLabelText("Nome do produto"), "Maçã");
    await userEvent.click(d.getByRole("button", { name: "Salvar" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      shopName: "VEC Hortifruti",
      name: "Maçã",
      price: 500,
      quantity: 10,
      discountPercentage: 0,
    });
  },
};
