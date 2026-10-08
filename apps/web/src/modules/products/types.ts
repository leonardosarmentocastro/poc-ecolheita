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

/** A search answer (API contract). */
export type SearchResponse =
  { tiered: true; matches: Product[]; related: Product[] } | { tiered: false; results: Product[] };

export interface CreateProductInput {
  shopName: string;
  name: string;
  price: number;
  quantity: number;
  discountPercentage: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;
