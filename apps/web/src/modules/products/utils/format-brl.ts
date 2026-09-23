// `toLocaleString` separates "R$" from the amount with a NON-BREAKING space (U+00A0).
// The replace turns it into a plain space so "R$ 3,50" in a test matches byte for byte.
// The pattern uses the `\u00a0` escape, never a pasted character, so a reader can see it.
export const formatBRL = (cents: number): string =>
  (cents / 100)
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/\u00a0/g, " ");
