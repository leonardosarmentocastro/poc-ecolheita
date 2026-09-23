/** Discounted price in integer cents, rounded half up (CONTEXT.md). */
export const finalPrice = (price: number, discountPercentage: number): number =>
  Math.round((price * (100 - discountPercentage)) / 100);
