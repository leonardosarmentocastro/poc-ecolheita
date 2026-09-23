import { Router } from "express";
import * as resolvers from "@/modules/products/resolvers";

export const productsRouter = Router();

productsRouter.get("/", resolvers.listProductsResolver);
productsRouter.post("/", resolvers.createProductResolver);
productsRouter.get("/search", resolvers.searchProductsResolver);
productsRouter.get("/:id", resolvers.getProductResolver);
productsRouter.patch("/:id", resolvers.updateProductResolver);
