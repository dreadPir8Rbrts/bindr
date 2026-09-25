// Catalog matching for OCR results — a port of leftovers.gg's match_card_v3
// (backend/app/services/catalog_match.py). The matcher anchors on the printed card
// number, then uses HP, artist and name candidates to break ties.
//
// `catalog` supplies the queries (see catalog.mjs); every method returns rows shaped
// {id, name, en_name, number, printed_number, hp, artist, ...} filtered to Pokémon
// cards and, when given, the OCR language.
import { ratio, tokenSortRatio } from './fuzz.mjs';

export function stripAccents(s) {
 return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

// Python's round(x, 2): exact binary ties go to the even neighbour.
function round2(x) {
 const scaled = x * 100, floor = Math.floor(scaled);
 if (scaled - floor === 0.5) return (floor % 2 === 0 ? floor : floor + 1) / 100;
 return Number(x.toFixed(2));
}

const isDigits = s => /^\d+$/.test(s);

export function localIdVariants(setNumber) {
 const part = setNumber.split('/')[0];
 if (part.toUpperCase().startsWith('NO.')) {
  const digits = part.slice(3).trim();
  return [isDigits(digits) ? String(parseInt(digits, 10)) : digits];
 }
 if (part.toUpperCase().startsWith('TG')) return [part.toUpperCase()];
 return [...new Set([part, isDigits(part) ? String(parseInt(part, 10)) : part])];
}

// Bare numbers ('085') carry no format indicator; slash, 'No.' and promo formats do.
function isBareNumber(setNumber) {
 if (!setNumber) return true;
 return !setNumber.includes('/') && !setNumber.toUpperCase().startsWith('NO.');
}

// Best score across all OCR name candidates; ratio handles merged tokens and
// token_sort_ratio handles reordered ones. Japanese cards also match on en_name.
export function bestNameScore(card, candidates) {
 let best = 0;
 for (const candidate of candidates) {
  const c = candidate.toLowerCase(), name = (card.name || '').toLowerCase();
  let s = Math.max(ratio(c, name), tokenSortRatio(c, name));
  if (card.en_name) {
   const en = card.en_name.toLowerCase();
   s = Math.max(s, ratio(c, en), tokenSortRatio(c, en));
  }
  best = Math.max(best, s);
 }
 return best;
}

// Keep rows scoring within `gap` of the best, dropping partial-name contamination.
function filterByName(rows, candidates, gap = 10) {
 if (!candidates.length || !rows.length) return rows;
 const scored = rows.map(r => [r, bestNameScore(r, candidates)]);
 const top = Math.max(...scored.map(([, s]) => s));
 if (top === 0) return rows;
 return scored.filter(([, s]) => s >= top - gap).map(([r]) => r);
}

const matched = (card, confidence, method) => ({ card, confidence, method });
const ambiguous = rows => ({ ambiguous: true, candidates: rows });

// HP elimination → artist → name candidates → HP match. Returns null while still ambiguous.
function disambiguate(rows, candidates, illustrator, hp, prefix) {
 let working = rows;
 const hpText = hp === null || hp === undefined ? null : String(hp);

 // Only eliminate on HP when some row confirms the OCR reading; otherwise OCR likely misread it.
 // A null DB hp is inconclusive (vintage/vending data often lacks it).
 if (hpText !== null && rows.some(r => r.hp === hpText)) {
  const surviving = rows.filter(r => r.hp === null || r.hp === undefined || r.hp === hpText);
  if (surviving.length > 0 && surviving.length < rows.length) {
   if (surviving.length === 1) return matched(surviving[0], 0.90, `${prefix}_hp_elim`);
   working = surviving;
  }
 }

 if (illustrator) {
  const artistTop = working
   .map(r => [r, ratio(illustrator.toLowerCase(), (r.artist || '').toLowerCase())])
   .filter(([, s]) => s >= 85);
  if (artistTop.length === 1) {
   const [r, score] = artistTop[0];
   return matched(r, round2(score / 100 * 0.97), `${prefix}_artist`);
  }
  if (artistTop.length && artistTop.length < working.length) working = artistTop.map(([r]) => r);
 }

 // Only a uniquely best name wins; a tie between perfect scores stays ambiguous.
 if (candidates.length) {
  const scored = working.map(r => [r, bestNameScore(r, candidates)]).sort((a, b) => b[1] - a[1]);
  const topScore = scored.length ? scored[0][1] : 0;
  if (topScore >= 80 && scored.filter(([, s]) => s >= topScore - 5).length === 1) {
   return matched(scored[0][0], round2(topScore / 100 * 0.95), `${prefix}_name`);
  }
 }

 // A null-HP sibling might be the real card with missing data, so don't auto-pick past it.
 if (hpText !== null) {
  const hpMatched = working.filter(r => r.hp === hpText);
  const nullHp = working.filter(r => r.hp === null || r.hp === undefined);
  if (hpMatched.length === 1 && !nullHp.length) return matched(hpMatched[0], 0.82, `${prefix}_hp`);
 }
 return null;
}

export async function matchCard(ocr, catalog) {
 const setNumber = (ocr.set_number || '').trim();
 let candidates = [...(ocr.name_candidates || [])];
 if (!candidates.length) {
  const single = (ocr.name || '').trim();
  if (single) candidates = [single];
 }
 const illustrator = (ocr.illustrator || '').trim();
 const hp = ocr.hp ?? null;
 const lang = (ocr.language_code || '').toUpperCase().trim() || null;
 const variants = setNumber ? localIdVariants(setNumber) : [];

 // PATH A: slash, "No." or promo number — anchor on the exact printed number.
 if (setNumber && !isBareNumber(setNumber)) {
  const rows = await catalog.byPrintedNumber(setNumber, lang);
  if (rows.length === 1) return matched(rows[0], 0.99, 'v3_printed_number');
  if (rows.length > 1) {
   return disambiguate(rows, candidates, illustrator, hp, 'v3_printed_number')
    || ambiguous(filterByName(rows, candidates).slice(0, 10));
  }
  if (variants.length) {
   const rows2 = await catalog.byNumbers(variants, lang);
   if (rows2.length === 1) return matched(rows2[0], 0.75, 'v3_number_fallback');
   if (rows2.length > 1) {
    return disambiguate(rows2, candidates, illustrator, hp, 'v3_number_fallback')
     || ambiguous(filterByName(rows2, candidates).slice(0, 10));
   }
  }
  return null;
 }

 // PATH B: bare number or none — name-primary.
 // Zero-padded bare numbers ('007') come from Topsun/Vending cards printed without a total.
 if (setNumber && setNumber.startsWith('0') && isDigits(setNumber)) {
  const rows = await catalog.byPrintedNumber(setNumber, lang);
  if (rows.length === 1) return matched(rows[0], 0.95, 'v3_bare_printed_number');
  if (rows.length > 1) {
   const result = disambiguate(rows, candidates, illustrator, hp, 'v3_bare_printed_number');
   if (result) return result;
  }
 }

 const pool = [];
 if (variants.length) pool.push(...await catalog.byNumbers(variants, lang, 50));
 if (pool.length < 20) {
  for (const candidate of candidates.slice(0, 2)) {
   if ([...candidate].length < 2) continue;
   pool.push(...await catalog.byNameLike(stripAccents(candidate), lang, 30));
  }
 }
 // Guarantees the illustrator's cards are present even when the name pools are capped.
 if (illustrator && [...illustrator].length >= 3) pool.push(...await catalog.byArtistLike(stripAccents(illustrator), lang, 20));

 const seen = new Set();
 const unique = pool.filter(r => !seen.has(r.id) && seen.add(r.id)).slice(0, 50);
 if (!unique.length) return null;

 const scored = unique.map(r => [r, bestNameScore(r, candidates)]).sort((a, b) => b[1] - a[1]);
 if (scored[0][1] < 75) return null;
 const topScore = scored[0][1];
 const top = scored.filter(([, s]) => s >= topScore - 5).map(([r]) => r);

 if (top.length === 1) return matched(top[0], round2(topScore / 100 * 0.90), 'v3_name_primary');
 const result = disambiguate(top, candidates, illustrator, hp, 'v3_name');
 if (result) return result;
 if (top.length <= 10) return ambiguous(top);
 if (hp !== null) {
  const reduced = top.filter(r => r.hp === String(hp));
  if (reduced.length > 0 && reduced.length <= 10) return ambiguous(reduced);
 }
 return ambiguous(top.slice(0, 10));
}
