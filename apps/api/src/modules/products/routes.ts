import { Router } from "express";
import * as resolvers from "@/modules/products/resolvers";

export const productsRouter = Router();

productsRouter.post("/", resolvers.createProductResolver);
