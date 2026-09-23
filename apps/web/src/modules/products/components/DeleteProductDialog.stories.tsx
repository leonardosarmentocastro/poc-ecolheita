import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { DeleteProductDialog } from "@/modules/products/components/DeleteProductDialog";
import type { Product } from "@/modules/products/types";

type Props = ComponentProps<typeof DeleteProductDialog>;

const at = "2026-09-22T12:00:00.000Z";
const banana: Product = {
  id: 1,
  shopName: "Mercadinho Candelária",
  name: "Banana",
  price: 600,
  quantity: 10,
  discountPercentage: 50,
  finalPrice: 300,
  createdAt: at,
  updatedAt: at,
};

const meta = {
  component: DeleteProductDialog,
  parameters: { docs: { story: { inline: false, iframeHeight: "400px" } } },
  tags: ["autodocs"],
  args: { product: banana, deleting: false, onConfirm: fn(), onClose: fn() },
} satisfies Meta<typeof DeleteProductDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const question = async () => within(await screen.findByRole("dialog", { name: "Excluir produto" }));

/** The question names the product; confirming calls the handler; both buttons are 44 px. */
export const ConfirmDeletes: Story = {
  play: async ({ args }) => {
    const d = await question();
    await expect(
      d.getByText("Excluir “Banana” de Mercadinho Candelária? Esta ação não pode ser desfeita."),
    ).toBeInTheDocument();
    for (const name of ["Cancelar", "Excluir"]) {
      await expect(
        d.getByRole("button", { name }).getBoundingClientRect().height,
      ).toBeGreaterThanOrEqual(44);
    }
    await userEvent.click(d.getByRole("button", { name: "Excluir" }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

/** While deleting, the confirm button is disabled and says so. */
export const Deleting: Story = {
  args: { deleting: true },
  play: async () => {
    const d = await question();
    await expect(d.getByRole("button", { name: "Excluindo…" })).toBeDisabled();
  },
};

/** Opened from a real button so focus has somewhere to return; Escape cancels and focus comes back. */
function OpenedFromAButton(args: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  return (
    <>
      <button type="button" onClick={() => setProduct(args.product)}>
        abrir
      </button>
      <DeleteProductDialog
        {...args}
        product={product}
        onClose={() => {
          args.onClose();
          setProduct(null);
        }}
      />
    </>
  );
}

export const EscapeCancelsAndReturnsFocus: Story = {
  render: (args) => <OpenedFromAButton {...args} />,
  play: async ({ canvasElement, args }) => {
    const opener = within(canvasElement).getByRole("button", { name: "abrir" });
    await userEvent.click(opener);
    await question();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalled();
    // The modal closes through a 200 ms transition; wait for it, as the drawer's story does.
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Excluir produto" })).toBeNull(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
  },
};
