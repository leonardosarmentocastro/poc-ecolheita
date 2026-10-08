import express, { type Express } from "express";
import { connectErrorHandler, connectMiddlewares } from "@/server/middlewares/connect";
import { connectRoutes } from "@/server/routes/connect";
import type { Classifier } from "@/modules/relevance";

export const createApp = (deps: { classifier?: Classifier | null } = {}): Express => {
  const app = express();
  app.locals.classifier = deps.classifier ?? null;
  connectMiddlewares(app);
  connectRoutes(app);
  connectErrorHandler(app);
  return app;
};
