import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "@/db/data/errors";
import { productsRepository } from "@/modules/products/repository";

export const deleteProductResolver = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ok = await productsRepository.remove(Number(req.params.id));
    if (!ok) throw new NotFoundError(`product ${req.params.id} not found`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
