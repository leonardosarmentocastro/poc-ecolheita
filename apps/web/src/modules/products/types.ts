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

export interface CreateProductInput {
  shopName: string;
  name: string;
  price: number;
  quantity: number;
  discountPercentage: number;
}
