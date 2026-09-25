"""
Card scanner: OCR → parse → catalog match → Bindr listing fields.

OCR parsing and matching are leftovers.gg's (see ocr.py / catalog_match.py);
this module turns a matched catalog card into what a Bindr listing needs.
"""

from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models.catalog import CardV2, ExpansionV2
from app.services.catalog_match import match_card_v3
from app.services.ocr import extract_card_text


def _image_url(images: Any) -> Any:
    first = images[0] if isinstance(images, list) and images else images
    return (first or {}).get("small") or (first or {}).get("large") if isinstance(first, dict) else None


def listing_fields(card: CardV2, expansion: ExpansionV2) -> Dict[str, Any]:
    """Name and "Set · number · rarity" for a listing. Listings are English-first:
    Japanese cards use their English name and are labelled."""
    name = f"{card.en_name or card.name} (Japanese)" if card.language_code == "JA" else card.name
    rarity = None if card.rarity == "None" else card.rarity  # some imported rows hold the literal 'None'
    set_label = " · ".join(x for x in [expansion.name_en or expansion.name, card.printed_number or card.number, rarity] if x)
    return {
        "id": str(card.id), "name": name, "set": set_label, "catalog_name": card.name,
        "image_url": _image_url(card.images), "language_code": card.language_code,
    }


def scan_image(db: Session, image_bytes: bytes) -> Dict[str, Any]:
    parsed = extract_card_text(image_bytes)
    ocr = {k: parsed.get(k) for k in ("name", "set_number", "hp", "illustrator", "language_code")}
    # Same "nothing readable" test as leftovers.gg's /scans/quick-identify-v3.
    if not (parsed.get("name_candidates") or parsed.get("name")) and not parsed.get("set_number"):
        return {"status": "no_text", "ocr": ocr}
    match = match_card_v3(parsed, db)
    if not match:
        return {"status": "no_match", "ocr": ocr}
    if match.get("ambiguous"):
        return {"status": "ambiguous", "ocr": ocr, "candidates": [listing_fields(c["card"], c["expansion"]) for c in match["candidates"]]}
    return {
        "status": "matched", "ocr": ocr, "confidence": match["confidence"], "method": match["method"],
        "card": listing_fields(match["card"], match["expansion"]),
    }
