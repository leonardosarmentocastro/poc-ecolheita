import type { Request, Response, NextFunction } from "express";
import { ClassifierError, classifierOf } from "@/modules/relevance";
import { productsRepository } from "@/modules/products/repository";
import { UNTIERED_CAP } from "@/modules/products/search-constants";
import { searchQuerySchema } from "@/modules/products/search-schema";
import type { Product, SearchResponse } from "@/modules/products/types";
import { tierShortlist } from "@/modules/products/utils/tier-shortlist";

const untiered = (shortlist: Product[]): SearchResponse => ({
  tiered: false,
  results: shortlist.slice(0, UNTIERED_CAP),
});

export const searchProductsResolver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { q } = searchQuerySchema.parse(req.query);
    const shortlist = await productsRepository.shortlist(q);
    const classifier = classifierOf(req);
    if (!classifier) {
      res.status(200).json(untiered(shortlist));
      return;
    }
    if (shortlist.length === 0) {
      res.status(200).json({ tiered: true, matches: [], related: [] } satisfies SearchResponse);
      return;
    }
    try {
      const { matches, related } = await tierShortlist(q, shortlist, classifier);
      res.status(200).json({ tiered: true, matches, related } satisfies SearchResponse);
    } catch (err) {
      if (!(err instanceof ClassifierError)) throw err;
      // The failure kind only: never the query, never a key (spec § When Jev fails).
      console.warn(`search answered untiered: classifier ${err.kind}`);
      res.status(200).json(untiered(shortlist));
    }
  } catch (err) {
    next(err);
  }
};
