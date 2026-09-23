import { Router } from "express";
import * as resolvers from "@/modules/products/resolvers";

export const productsRouter = Router();

productsRouter.get("/", resolvers.listProductsResolver);
productsRouter.post("/", resolvers.createProductResolver);
productsRouter.get("/:id", resolvers.getProductResolver);
