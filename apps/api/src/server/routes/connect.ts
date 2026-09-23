import { Router, type Express } from "express";
import { z } from "zod";
import { NotFoundError } from "@/db/data/errors";
import { healthRouter } from "@/modules/health/routes";
import { productsRouter } from "@/modules/products/routes";

/** Mounts every module's router under its base path. The single source of truth for routing. */
export const connectRoutes = (app: Express): void => {
  app.use("/health", healthRouter);
  app.use("/products", productsRouter);

  // Test-only routes that trigger each branch of the error handler, so middleware behaviour
  // is tested where it is owned instead of through a domain module.
  if (process.env.NODE_ENV === "test") {
    const testMiddlewaresRouter = Router();
    testMiddlewaresRouter.post("/json", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    testMiddlewaresRouter.get("/zod-error", () => {
      z.object({ id: z.string() }).parse({});
    });
    testMiddlewaresRouter.get("/not-found", () => {
      throw new NotFoundError("resource not found");
    });
    testMiddlewaresRouter.get("/boom", () => {
      throw new Error("unexpected failure");
    });
    app.use("/test/middlewares", testMiddlewaresRouter);
  }
};
