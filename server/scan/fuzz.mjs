// rapidfuzz-compatible string similarity (fuzz.ratio, fuzz.token_sort_ratio), as used by
// leftovers.gg's catalog matcher. Scores are 0–100 floats; compare on code points like Python.

function lcsLength(a, b) {
 if (!a.length || !b.length) return 0;
 let prev = new Array(b.length + 1).fill(0), row = new Array(b.length + 1).fill(0);
 for (let i = 1; i <= a.length; i++) {
  for (let j = 1; j <= b.length; j++) row[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
  [prev, row] = [row, prev];
 }
 return prev[b.length];
}

// Normalized Indel similarity × 100, computed in the same order as rapidfuzz.
export function ratio(s1, s2) {
 const a = [...s1], b = [...s2], total = a.length + b.length;
 if (!total) return 100;
 const distance = total - 2 * lcsLength(a, b);
 return (1 - distance / total) * 100;
}

const byCodePoint = (x, y) => {
 const a = [...x], b = [...y];
 for (let i = 0; i < Math.min(a.length, b.length); i++) {
  const d = a[i].codePointAt(0) - b[i].codePointAt(0);
  if (d) return d;
 }
 return a.length - b.length;
};
const sortedTokens = s => s.split(/\s+/u).filter(Boolean).sort(byCodePoint).join(' ');

export function tokenSortRatio(s1, s2) {
 return ratio(sortedTokens(s1), sortedTokens(s2));
}
