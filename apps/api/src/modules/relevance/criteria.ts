import type { Tier } from "@/modules/relevance/types";

/**
 * The tier rule (CONTEXT.md, Relevance tier) as Jev `choice` criteria. Examples never reuse
 * the search scenario's names, so tiers:eval does not grade Jev on its own prompt. Changing
 * this wording means re-running tiers:eval.
 */
export const TIER_CRITERIA: Record<Tier, { what: string; not_for?: string; examples: string[] }> = {
  match: {
    what: "The product IS the thing searched for, or a kind, variety or form of it that the shopper would accept as a yes.",
    not_for: "Products made from it, used with it, or merely associated with it.",
    examples: [
      '"Laranja pera" for "laranja"',
      '"Pão francês" for "pão"',
      '"Leite integral" for "leite"',
    ],
  },
  related: {
    what: "Not the thing searched for, but made from it, used with it, or plausibly wanted by someone looking for it.",
    not_for:
      "The thing itself or a variety of it (match), and products with no real connection (unrelated).",
    examples: [
      '"Suco de laranja" for "laranja"',
      '"Geleia de morango" for "morango"',
      '"Manteiga com sal" for "pão"',
      '"Panela de pressão" for "feijão"',
    ],
  },
  unrelated: {
    what: "Anything with no real connection to what was searched for.",
    examples: ['"Detergente líquido" for "laranja"', '"Ração para cachorro" for "pão"'],
  },
};
