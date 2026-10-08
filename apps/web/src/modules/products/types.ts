export interface Product {
  id: number;
  shopName: string;
  name: string;
  /** Integer cents. */
  price: number;
  quantity: number;
  discountPercentage: number;
  /** Integer cents, computed by the API. */
  finalPrice: number;
  createdAt: string;
  updatedAt: string;
}

/** A search answer (API contract). Slice 2 adds the tiered branch. */
export type SearchResponse = { tiered: false; results: Product[] };

export interface CreateProductInput {
  shopName: string;
  name: string;
  price: number;
  quantity: number;
  discountPercentage: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;
