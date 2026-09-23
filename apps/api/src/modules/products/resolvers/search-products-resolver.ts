import type { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";
import { embed, normalizeForEmbedding } from "@/modules/embeddings";
import { productsRepository } from "@/modules/products/repository";
import { searchQuerySchema } from "@/modules/products/search-schema";

export const searchProductsResolver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { q } = searchQuerySchema.parse(req.query);
    const queryVector = await embed(normalizeForEmbedding(q));
    res
      .status(200)
      .json(
        await productsRepository.search(queryVector, {
          threshold: env.SEARCH_SIMILARITY_THRESHOLD,
        }),
      );
  } catch (err) {
    next(err);
  }
};
