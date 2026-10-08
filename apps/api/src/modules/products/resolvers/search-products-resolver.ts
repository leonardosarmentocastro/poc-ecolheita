import type { Request, Response, NextFunction } from "express";
import { productsRepository } from "@/modules/products/repository";
import { UNTIERED_CAP } from "@/modules/products/search-constants";
import { searchQuerySchema } from "@/modules/products/search-schema";
import type { SearchResponse } from "@/modules/products/types";

export const searchProductsResolver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { q } = searchQuerySchema.parse(req.query);
    const shortlist = await productsRepository.shortlist(q);
    const body: SearchResponse = { tiered: false, results: shortlist.slice(0, UNTIERED_CAP) };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
};
