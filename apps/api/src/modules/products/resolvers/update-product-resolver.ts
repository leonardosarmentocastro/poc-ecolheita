import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "@/db/data/errors";
import { productsRepository } from "@/modules/products/repository";
import { updateProductSchema } from "@/modules/products/schema";

export const updateProductResolver = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = updateProductSchema.parse(req.body);
    const updated = await productsRepository.update(Number(req.params.id), input);
    if (!updated) throw new NotFoundError(`product ${req.params.id} not found`);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};
