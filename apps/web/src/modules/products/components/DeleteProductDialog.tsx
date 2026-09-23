"use client";

import { useState } from "react";
import { Button, Modal, Text } from "@mantine/core";
import type { Product } from "@/modules/products/types";

export interface DeleteProductDialogProps {
  /** The product being asked about; `null` while the question is closed. */
  product: Product | null;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Presentational: asks, and reports the answer. Escape and the backdrop cancel, except
 * while the delete runs: then nothing closes it until the answer arrives.
 */
export function DeleteProductDialog({
  product,
  deleting,
  onConfirm,
  onClose,
}: DeleteProductDialogProps) {
  // The last product asked about, so the question still names it while the modal fades out
  // after `product` becomes null.
  const [shown, setShown] = useState(product);
  if (product !== null && product !== shown) setShown(product);

  return (
    <Modal
      opened={product !== null}
      onClose={onClose}
      closeOnEscape={!deleting}
      closeOnClickOutside={!deleting}
      title="Excluir produto"
      centered
      size="sm"
      withCloseButton={false}
      classNames={{ title: "font-semibold" }}
    >
      <div className="grid gap-4">
        <Text size="sm">
          Excluir “{shown?.name}” de {shown?.shopName}? Esta ação não pode ser desfeita.
        </Text>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="default" size="md" h={44} disabled={deleting} onClick={onClose}>
            Cancelar
          </Button>
          <Button color="red" size="md" h={44} disabled={deleting} onClick={onConfirm}>
            {deleting ? "Excluindo…" : "Excluir"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
