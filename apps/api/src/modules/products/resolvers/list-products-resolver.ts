import type { Request, Response, NextFunction } from "express";
import { productsRepository } from "@/modules/products/repository";

export const listProductsResolver = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(200).json(await productsRepository.findAll());
  } catch (err) {
    next(err);
  }
};
