/**
 * The shortlist merge (spec § Merge): each list's best hits are guaranteed a top spot, because
 * the two lists are built to disagree. Reciprocal Rank Fusion was measured and rejected.
 */
export const interleave = (a: number[], b: number[], size: number): number[] => {
  const out: number[] = [];
  const taken = new Set<number>();
  for (let i = 0; out.length < size && (i < a.length || i < b.length); i++) {
    for (const id of [a[i], b[i]]) {
      if (id === undefined || taken.has(id) || out.length >= size) continue;
      taken.add(id);
      out.push(id);
    }
  }
  return out;
};
