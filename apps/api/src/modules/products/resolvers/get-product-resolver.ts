import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "@/db/data/errors";
import { productsRepository } from "@/modules/products/repository";

export const getProductResolver = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const found = await productsRepository.findById(Number(req.params.id));
    if (!found) throw new NotFoundError(`product ${req.params.id} not found`);
    res.status(200).json(found);
  } catch (err) {
    next(err);
  }
};
