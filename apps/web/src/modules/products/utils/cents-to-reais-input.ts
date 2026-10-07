/** Cents → the plain reais string the form edits ("5,00"). No grouping, no symbol. */
export const centsToReaisInput = (cents: number): string => {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
};
