import type { Request, Response, NextFunction } from "express";
import { productsRepository } from "@/modules/products/repository";
import { createProductSchema } from "@/modules/products/schema";

export const createProductResolver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = createProductSchema.parse(req.body);
    res.status(201).json(await productsRepository.create(input));
  } catch (err) {
    next(err);
  }
};
