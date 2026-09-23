/**
 * The proof scenario (spec § The proof scenario). One copy of the truth: the API test,
 * the e2e test and the seed script all import this file. Prices in integer cents.
 */
export interface ScenarioRow {
  key: string;
  shopName: string;
  name: string;
  price: number;
  quantity: number;
  discountPercentage: number;
}

export const BANANA_SCENARIO: readonly ScenarioRow[] = [
  {
    key: "candelaria-banana",
    shopName: "Mercadinho Candelária",
    name: "Banana",
    price: 600,
    quantity: 10,
    discountPercentage: 50,
  },
  {
    key: "vec-banana-prata",
    shopName: "VEC Hortifruti",
    name: "Banana prata",
    price: 500,
    quantity: 10,
    discountPercentage: 30,
  },
  {
    key: "sao-jose-banana-nanica",
    shopName: "Hortifruti São José",
    name: "Banana nanica",
    price: 400,
    quantity: 10,
    discountPercentage: 10,
  },
  {
    key: "ceasa-banana-prata-organica",
    shopName: "CEASA SJC",
    name: "Banana prata orgânica",
    price: 800,
    quantity: 10,
    discountPercentage: 80,
  },
  {
    key: "candelaria-bananada",
    shopName: "Mercadinho Candelária",
    name: "Bananada",
    price: 300,
    quantity: 10,
    discountPercentage: 20,
  },
  {
    key: "vec-maca-argentina",
    shopName: "VEC Hortifruti",
    name: "Maçã argentina",
    price: 700,
    quantity: 10,
    discountPercentage: 40,
  },
  {
    key: "sao-jose-bolo-de-banana",
    shopName: "Hortifruti São José",
    name: "Bolo de banana",
    price: 1200,
    quantity: 10,
    discountPercentage: 30,
  },
  {
    key: "ceasa-carne-moida",
    shopName: "CEASA SJC",
    name: "Carne moída patinho",
    price: 3000,
    quantity: 10,
    discountPercentage: 80,
  },
];

export const BANANA_QUERY = "banana";

/** Hard tier: these five, in this order (final price 1,60 · 2,40 · 3,00 · 3,50 · 3,60). */
export const EXPECTED_MATCH_KEYS_IN_ORDER = [
  "ceasa-banana-prata-organica",
  "candelaria-bananada",
  "candelaria-banana",
  "vec-banana-prata",
  "sao-jose-banana-nanica",
];

/** Hard tier: never in the results. */
export const HARD_DECOY_KEYS = ["vec-maca-argentina", "ceasa-carne-moida"];

/** Expected-failure candidate: absent if the threshold can separate it. */
export const SOFT_DECOY_KEY = "sao-jose-bolo-de-banana";

export const scenarioRow = (key: string): ScenarioRow => {
  const row = BANANA_SCENARIO.find((r) => r.key === key);
  if (!row) throw new Error(`unknown scenario key ${key}`);
  return row;
};
