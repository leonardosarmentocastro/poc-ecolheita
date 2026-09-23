/**
 * Parses reais typed by a person into integer cents: "4,99" and "4.99" are 499,
 * "1.234,56" is 123456. Returns null for anything that is not a non-negative amount.
 */
export const parseReaisToCents = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!/^\d[\d.,]*$/.test(trimmed)) return null;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
};
