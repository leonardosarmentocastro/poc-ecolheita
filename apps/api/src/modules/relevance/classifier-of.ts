import type { Request } from "express";
import type { Classifier } from "@/modules/relevance/types";

/** The classifier `createApp` was given, or none. */
export const classifierOf = (req: Request): Classifier | null =>
  (req.app.locals.classifier as Classifier | null | undefined) ?? null;
