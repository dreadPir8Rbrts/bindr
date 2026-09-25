// Card scanner: Google Vision OCR → parse → catalog match → Bindr listing fields.
import { parsePokemonCardText } from './ocr-parse.mjs';
import { matchCard } from './match.mjs';
import { createCatalog } from './catalog.mjs';
import { createVisionClient } from './vision.mjs';

export class ScanError extends Error {
 constructor(message, status = 502) { super(message); this.status = status; }
}

function imageUrl(images) {
 const first = Array.isArray(images) ? images[0] : images;
 return first?.small || first?.large || null;
}

// Listings are English-first: Japanese cards use their English name and are labelled.
export function listingFields(row) {
 const japanese = row.language_code === 'JA';
 const name = japanese ? `${row.en_name || row.name} (Japanese)` : row.name;
 // Some imported rows store the Python literal 'None' as their rarity.
 const rarity = row.rarity === 'None' ? null : row.rarity;
 const set = [row.set_name_en || row.set_name, row.printed_number || row.number, rarity].filter(Boolean).join(' · ');
 return { id: row.id, name, set, catalog_name: row.name, image_url: imageUrl(row.images), language_code: row.language_code };
}

export function createScanner({ detectText, catalog }) {
 return async function scan(imageBytes) {
  const text = await detectText(imageBytes);
  const parsed = parsePokemonCardText(text || '');
  const ocr = { name: parsed.name, set_number: parsed.set_number, hp: parsed.hp, illustrator: parsed.illustrator, language_code: parsed.language_code };
  if (!text || (!parsed.name && !parsed.set_number && !parsed.name_candidates.length)) return { status: 'no_text', ocr };
  const match = await matchCard(parsed, catalog);
  if (!match) return { status: 'no_match', ocr };
  if (match.ambiguous) return { status: 'ambiguous', ocr, candidates: match.candidates.map(listingFields) };
  return { status: 'matched', ocr, confidence: match.confidence, method: match.method, card: listingFields(match.card) };
 };
}

// Built lazily from environment variables so a missing setting only affects scanning.
export function scannerFromEnv(env = process.env) {
 let scanner = null;
 return async imageBytes => {
  if (!scanner) {
   const connection = env.BINDR_SUPABASE_CONNECTION;
   if (!connection || !(env.GOOGLE_VISION_API_KEY || env.GOOGLE_CREDENTIALS_BASE64)) {
    throw new ScanError('Card scanning is not set up yet. Add BINDR_SUPABASE_CONNECTION and Google Vision credentials in Netlify.', 503);
   }
   scanner = createScanner({
    detectText: createVisionClient({ apiKey: env.GOOGLE_VISION_API_KEY, credentialsBase64: env.GOOGLE_CREDENTIALS_BASE64 }),
    catalog: createCatalog(connection),
   });
  }
  return scanner(imageBytes);
 };
}
