import cors from "cors";
import express, { type Express } from "express";
import { errorHandlerMiddleware } from "@/server/middlewares/error-handler-middleware";

/** Global request middlewares, applied BEFORE routes. */
export const connectMiddlewares = (app: Express): void => {
  app.use(cors({ origin: true }));
  app.use(express.json());
};

/** Terminal error handler; Express only routes errors to it when registered AFTER routes. */
export const connectErrorHandler = (app: Express): void => {
  app.use(errorHandlerMiddleware);
};
