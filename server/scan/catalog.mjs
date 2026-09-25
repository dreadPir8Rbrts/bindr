// Read-only queries against the Bindr Supabase card catalog (cards_v2 + expansions_v2,
// copied from leftovers.gg). Mirrors the SQLAlchemy queries in leftovers.gg's matcher:
// no ORDER BY, same limits, so ties resolve the same way against the same data.
import postgres from 'postgres';

export function createCatalog(connectionString) {
 // prepare:false keeps this compatible with Supabase's transaction pooler (port 6543),
 // which Netlify functions need because the direct connection host is IPv6-only.
 const sql = postgres(connectionString, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 10, ssl: 'require' });

 const select = (where, lang, limit) => sql`
  select c.id, c.name, c.en_name, c.number, c.printed_number, c.rarity, c.hp, c.artist,
         c.language_code, c.images, e.name as set_name, e.name_en as set_name_en,
         e.series as series_name, e.release_date
  from public.cards_v2 c
  join public.expansions_v2 e on e.id = c.expansion_id
  where c.game = 'pokemon'
    ${lang ? sql`and c.language_code = ${lang}` : sql``}
    and ${where}
  ${limit ? sql`limit ${limit}` : sql``}`;

 return {
  byPrintedNumber: (setNumber, lang) => select(sql`lower(c.printed_number) = ${setNumber.toLowerCase()}`, lang),
  byNumbers: (variants, lang, limit) => select(sql`c.number in ${sql(variants)}`, lang, limit),
  byNameLike: (text, lang, limit) => select(sql`(extensions.unaccent(c.name) ilike ${'%' + text + '%'} or extensions.unaccent(c.en_name) ilike ${'%' + text + '%'})`, lang, limit),
  byArtistLike: (text, lang, limit) => select(sql`extensions.unaccent(c.artist) ilike ${'%' + text + '%'}`, lang, limit),
  end: () => sql.end({ timeout: 5 }),
 };
}
