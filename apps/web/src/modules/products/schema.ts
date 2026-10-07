import { z } from "zod";
import { parseReaisToCents } from "@/modules/products/utils/parse-reais-to-cents";

const integerString = (min: number, max?: number) =>
  z
    .string()
    .trim()
    .min(1, "Obrigatório")
    .refine((v) => /^-?\d+$/.test(v), "Inteiro")
    .refine(
      (v) => Number(v) >= min && (max === undefined || Number(v) <= max),
      max === undefined ? "Valor inválido" : `De ${min} a ${max}`,
    );

export const productFormSchema = z.object({
  shopName: z.string().trim().min(1, "Obrigatório"),
  name: z.string().trim().min(1, "Obrigatório"),
  priceReais: z
    .string()
    .trim()
    .min(1, "Obrigatório")
    .refine((v) => parseReaisToCents(v) !== null, "Valor inválido"),
  quantity: integerString(0),
  discountPercentage: integerString(0, 100),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
