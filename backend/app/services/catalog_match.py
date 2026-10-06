"""
Catalog matching for the scanner: OCR fields → a card in cards_v2.

`match_card_v3` and its helpers are copied verbatim from leftovers.gg (commit 5e2159b)
backend/app/services/catalog_match.py (the matcher leftovers.gg's Quick Scan uses),
so both apps match cards identically. Change it there first, then re-copy.
`func.unaccent` relies on the `extensions` schema being on the search path, as it
is on Supabase (the local test database is configured the same way).
"""

import unicodedata
from typing import Any, Dict, List, Optional

from rapidfuzz import fuzz
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.catalog import CardV2, ExpansionV2


def _strip_accents(s: str) -> str:
    """Strip Latin diacritics (é→e) without touching other scripts.
    Only removes Mn characters in U+0300–U+036F (Latin Combining Diacritical Marks).
    Japanese voiced kana (グ, ダ, ボ…) decompose to base+U+3099/U+309A in NFD;
    those marks are outside the Latin range and are preserved, then re-composed to NFC."""
    stripped = "".join(
        c for c in unicodedata.normalize("NFD", s)
        if not (unicodedata.category(c) == "Mn" and 0x0300 <= ord(c) <= 0x036F)
    )
    return unicodedata.normalize("NFC", stripped)


def _local_id_variants(set_number: str) -> List[str]:
    """
    Return both the raw and leading-zero-stripped form of a set number's local ID.
    '006/091' -> ['006', '6']
    'TG15/TG30' -> ['TG15']
    'No.150'   -> ['150']  (old Japanese Base-era Pokédex-number format)
    Deduplicated so exact matches don't produce duplicates.
    """
    part = set_number.split("/")[0]
    if part.upper().startswith("NO."):
        digits = part[3:].strip()
        return [str(int(digits))] if digits.isdigit() else [digits]
    if part.upper().startswith("TG"):
        return [part.upper()]
    stripped = str(int(part)) if part.isdigit() else part
    return list(dict.fromkeys([part, stripped]))


def _best_name_score(card: CardV2, name_candidates: List[str]) -> int:
    """Score a card against all OCR name candidates; return the highest score.

    Uses max(ratio, token_sort_ratio) per candidate:
    - token_sort_ratio handles reordered tokens (e.g. OCR reads "Pikachu BASIC" vs DB "BASIC Pikachu")
    - ratio handles merged tokens (e.g. OCR reads "イマクニ?のドードー" vs DB "イマクニ? のドードー"
      where the space causes token_sort to rearrange to "のドードー イマクニ?", tanking the score)
    """
    best = 0
    for candidate in name_candidates:
        c = candidate.lower()
        db_name = (card.name or "").lower()
        s = max(fuzz.ratio(c, db_name), fuzz.token_sort_ratio(c, db_name))
        if card.en_name:
            en = card.en_name.lower()
            s = max(s, fuzz.ratio(c, en), fuzz.token_sort_ratio(c, en))
        best = max(best, s)
    return best


def _filter_by_name(
    rows: List[tuple], name_candidates: List[str], gap: int = 10
) -> List[tuple]:
    """Return only the rows whose name score is within `gap` of the best scorer.
    Drops partial-match contamination (e.g. 'キョウのモンジャラ' scoring ~80%
    when 'モンジャラ' scores 100%) from ambiguous candidate lists.
    If name_candidates is empty or all rows score 0, returns rows unchanged."""
    if not name_candidates or not rows:
        return rows
    scored = [(r, _best_name_score(r[0], name_candidates)) for r in rows]
    top = max(s for _, s in scored)
    if top == 0:
        return rows
    return [r for r, s in scored if s >= top - gap]


def _is_bare_number(set_number: str) -> bool:
    """True for bare card numbers with no format indicator: '085', '007'.
    False for slash ('063/182'), No-prefix ('No.036'), and promo ('064/SV-P') formats."""
    if not set_number:
        return True
    return "/" not in set_number and not set_number.upper().startswith("NO.")


def _v3_disambiguate(
    rows: List[tuple],
    name_candidates: List[str],
    illustrator: str,
    hp: Optional[int],
    method_prefix: str,
) -> Optional[Dict[str, Any]]:
    """Try HP-elimination → artist → name_candidates → HP-positive to pick one row.
    Returns a match dict or None if still ambiguous."""

    # 0. HP negative elimination — remove candidates whose DB hp is known (non-null)
    #    and contradicts the OCR hp. null DB hp is inconclusive (vending/vintage cards
    #    often lack hp data), so only a confirmed mismatch eliminates.
    #
    #    Guard: only run elimination when at least one candidate *confirms* the OCR HP
    #    (i.e. has hp == str(ocr_hp)). If no candidate confirms it, the OCR reading is
    #    probably wrong (e.g. "LV.15 HP 50" misread as hp=15) — skip elimination to
    #    avoid incorrectly narrowing to surviving null-HP cards.
    working = rows
    if hp is not None:
        confirmed = [r for r in rows if r[0].hp == str(hp)]
        if confirmed:
            surviving = [r for r in rows if r[0].hp is None or r[0].hp == str(hp)]
            if 0 < len(surviving) < len(rows):
                if len(surviving) == 1:
                    return {
                        "card": surviving[0][0],
                        "expansion": surviving[0][1],
                        "confidence": 0.90,
                        "method": f"{method_prefix}_hp_elim",
                    }
                working = surviving

    # 1. Artist fuzzy (unique match scoring ≥ 85)
    if illustrator:
        artist_scored = [
            (r, fuzz.ratio(illustrator.lower(), (r[0].artist or "").lower()))
            for r in working
        ]
        artist_top = [(r, s) for r, s in artist_scored if s >= 85]
        if len(artist_top) == 1:
            r, score = artist_top[0]
            return {
                "card": r[0],
                "expansion": r[1],
                "confidence": round(score / 100 * 0.97, 2),
                "method": f"{method_prefix}_artist",
            }
        # Multiple artist matches — narrow working to artist-confirmed candidates so
        # subsequent name/HP steps operate on a smaller, validated set.
        # Example: base2_ja Vaporeon + vnd_ja Vaporeon both by Kagemaru Himeno →
        # narrows to those two, then step 3 HP-positive picks the one with HP=80.
        if artist_top and len(artist_top) < len(working):
            working = [r for r, s in artist_top]

    # 2. Name candidates — score each row against all candidates, take max per row.
    #    Only auto-picks when there is a single uniquely best candidate; does NOT
    #    auto-pick on a perfect-score tie (e.g. two cards with the same name both
    #    scoring 100% would previously be incorrectly resolved by this step).
    if name_candidates:
        name_scored = sorted(
            [(r, _best_name_score(r[0], name_candidates)) for r in working],
            key=lambda x: x[1],
            reverse=True,
        )
        top_score = name_scored[0][1] if name_scored else 0
        if top_score >= 80:
            close = [r for r, s in name_scored if s >= top_score - 5]
            if len(close) == 1:
                r = name_scored[0][0]
                return {
                    "card": r[0],
                    "expansion": r[1],
                    "confidence": round(top_score / 100 * 0.95, 2),
                    "method": f"{method_prefix}_name",
                }

    # 3. HP positive — pick the single candidate whose HP matches OCR.
    #    Only auto-pick when no null-HP candidates remain: null HP in the DB can mean
    #    "data not populated" (Vending Machine era) rather than "card has no HP," so
    #    auto-picking against a null-HP sibling risks choosing the wrong card.
    #    When null-HP siblings exist, caller surfaces all remaining candidates as ambiguous.
    if hp is not None:
        hp_matched = [r for r in working if r[0].hp == str(hp)]
        null_hp = [r for r in working if r[0].hp is None]
        if len(hp_matched) == 1 and not null_hp:
            return {
                "card": hp_matched[0][0],
                "expansion": hp_matched[0][1],
                "confidence": 0.82,
                "method": f"{method_prefix}_hp",
            }

    return None


def match_card_v3(ocr: Dict[str, Any], db: Session) -> Optional[Dict[str, Any]]:
    """
    Quick Scan v3: printed_number-primary matching strategy.

    Anchors on the DB printed_number field (exact match against what OCR reads)
    as the primary signal, then uses artist → name_candidates → HP to resolve
    the small result sets that remain.

    PATH A (non-bare set_number: slash, No.NNN, promo):
      1. printed_number direct match + language  → 1 result → done (0.99)
      2. >1 results → artist → name_candidates → HP → else ambiguous
      3. 0 results → fallback: number variants + language, same disambiguation

    PATH B (bare NNN or no set_number):
      Pool by number (if available) + name search; score all rows against every
      name candidate, then artist → HP to break ties.
    """
    set_number: str = (ocr.get("set_number") or "").strip()
    name_candidates: List[str] = list(ocr.get("name_candidates") or [])
    if not name_candidates:
        single = (ocr.get("name") or "").strip()
        if single:
            name_candidates = [single]
    illustrator: str = (ocr.get("illustrator") or "").strip()
    hp: Optional[int] = ocr.get("hp")
    lang_code: Optional[str] = (ocr.get("language_code") or "").upper().strip() or None
    local_id_variants = _local_id_variants(set_number) if set_number else []

    def _base_q() -> Any:
        q = (
            db.query(CardV2, ExpansionV2)
            .join(ExpansionV2, CardV2.expansion_id == ExpansionV2.id)
            .filter(CardV2.game == "pokemon")
        )
        if lang_code:
            q = q.filter(CardV2.language_code == lang_code)
        return q

    # ------------------------------------------------------------------
    # PATH A: non-bare set_number
    # ------------------------------------------------------------------
    if set_number and not _is_bare_number(set_number):
        # Step 1: exact printed_number match
        rows = _base_q().filter(
            func.lower(CardV2.printed_number) == set_number.lower()
        ).all()

        if len(rows) == 1:
            return {"card": rows[0][0], "expansion": rows[0][1], "confidence": 0.99, "method": "v3_printed_number"}

        if len(rows) > 1:
            result = _v3_disambiguate(rows, name_candidates, illustrator, hp, "v3_printed_number")
            if result:
                return result
            filtered = _filter_by_name(rows, name_candidates)
            return {"ambiguous": True, "candidates": [{"card": r[0], "expansion": r[1]} for r in filtered[:10]]}

        # Step 2: 0 printed_number results — fallback to number variants
        if local_id_variants:
            rows2 = _base_q().filter(CardV2.number.in_(local_id_variants)).all()
            if len(rows2) == 1:
                return {"card": rows2[0][0], "expansion": rows2[0][1], "confidence": 0.75, "method": "v3_number_fallback"}
            if len(rows2) > 1:
                result = _v3_disambiguate(rows2, name_candidates, illustrator, hp, "v3_number_fallback")
                if result:
                    return result
                filtered2 = _filter_by_name(rows2, name_candidates)
                return {"ambiguous": True, "candidates": [{"card": r[0], "expansion": r[1]} for r in filtered2[:10]]}

        return None

    # ------------------------------------------------------------------
    # PATH B: bare number or no number — name-primary with multi-candidates
    # ------------------------------------------------------------------

    # PATH B sub-step: zero-padded bare numbers ("007", "036") from Topsun/Vending-era
    # cards where the number is printed alone with no slash total.
    # printed_number="007" only matches cards whose full printed number IS "007" —
    # slash-format cards like sv2a's "007/165" won't match, so this cleanly isolates
    # the vintage card without needing any name scoring.
    if set_number and set_number.startswith("0") and set_number.isdigit():
        pn_rows = _base_q().filter(
            func.lower(CardV2.printed_number) == set_number.lower()
        ).all()
        if len(pn_rows) == 1:
            return {
                "card": pn_rows[0][0],
                "expansion": pn_rows[0][1],
                "confidence": 0.95,
                "method": "v3_bare_printed_number",
            }
        if len(pn_rows) > 1:
            dis = _v3_disambiguate(pn_rows, name_candidates, illustrator, hp, "v3_bare_printed_number")
            if dis:
                return dis
        # 0 results or disambiguation failed — fall through to pool approach

    pool: List[tuple] = []

    # Pool A: by number variants
    if local_id_variants:
        pool.extend(_base_q().filter(CardV2.number.in_(local_id_variants)).limit(50).all())

    # Pool B: by name candidates (first 2 to limit queries)
    if len(pool) < 20:
        for candidate in name_candidates[:2]:
            if len(candidate) < 2:
                continue
            norm = _strip_accents(candidate)
            pool.extend(
                _base_q().filter(
                    or_(
                        func.unaccent(CardV2.name).ilike(f"%{norm}%"),
                        func.unaccent(CardV2.en_name).ilike(f"%{norm}%"),
                    )
                ).limit(30).all()
            )

    # Pool C: artist-targeted — guarantees the illustrator's cards are present even
    # when Pool B's limit(30) + [:50] cap would otherwise exclude them (e.g. promo
    # cards that sort after main-set cards in heap scan order).
    if illustrator and len(illustrator) >= 3:
        pool.extend(
            _base_q().filter(
                func.unaccent(CardV2.artist).ilike(f"%{_strip_accents(illustrator)}%")
            ).limit(20).all()
        )

    # Deduplicate preserving order
    seen_ids: set = set()
    unique_pool: List[tuple] = []
    for row in pool:
        if row[0].id not in seen_ids:
            seen_ids.add(row[0].id)
            unique_pool.append(row)
    pool = unique_pool[:50]

    if not pool:
        return None

    scored = sorted(
        [(row, _best_name_score(row[0], name_candidates)) for row in pool],
        key=lambda x: x[1],
        reverse=True,
    )

    if not scored or scored[0][1] < 75:
        return None

    top_score = scored[0][1]
    top = [row for row, s in scored if s >= top_score - 5]

    if len(top) == 1:
        r = scored[0][0]
        return {"card": r[0], "expansion": r[1], "confidence": round(top_score / 100 * 0.90, 2), "method": "v3_name_primary"}

    result = _v3_disambiguate(top, name_candidates, illustrator, hp, "v3_name")
    if result:
        return result

    if len(top) <= 10:
        return {"ambiguous": True, "candidates": [{"card": r[0], "expansion": r[1]} for r in top]}

    # > 10 name-tied candidates — HP-filter to produce a manageable ambiguous list
    # (e.g. スリーパー HP90 matches base1_ja + base3_ja, not sv6a HP110)
    if hp is not None:
        hp_reduced = [r for r in top if r[0].hp == str(hp)]
        if 0 < len(hp_reduced) <= 10:
            return {"ambiguous": True, "candidates": [{"card": r[0], "expansion": r[1]} for r in hp_reduced]}

    # Still too many — cap at 10 and surface as ambiguous rather than auto-picking
    return {"ambiguous": True, "candidates": [{"card": r[0], "expansion": r[1]} for r in top[:10]]}
