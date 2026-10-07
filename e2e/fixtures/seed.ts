import type { APIRequestContext } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:4333";

export interface SeedProductInput {
  shopName: string;
  name: string;
  price: number;
  quantity: number;
  discountPercentage: number;
}

export async function seedProduct(
  request: APIRequestContext,
  input: SeedProductInput,
): Promise<{ id: number }> {
  const res = await request.post(`${API}/products`, { data: input });
  if (!res.ok()) throw new Error(`seedProduct failed: ${res.status()}`);
  return res.json();
}
