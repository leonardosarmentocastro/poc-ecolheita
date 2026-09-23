/**
 * Parses reais typed by a person into integer cents: "4,99" and "4.99" are 499,
 * "1.234,56" is 123456. Returns null for anything that is not a non-negative amount,
 * and for input it would otherwise have to guess at: more than two decimal digits
 * ("4,999") and a comma-less amount whose dots read as thousands separators ("1.234").
 */
export const parseReaisToCents = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!/^\d[\d.,]*$/.test(trimmed)) return null;
  if (!trimmed.includes(",") && /^\d{1,3}(\.\d{3})+$/.test(trimmed)) return null;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
};
