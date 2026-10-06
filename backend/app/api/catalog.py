"""Read-only seller search of the identification catalog."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth import Seller, require_seller
from app.db.session import get_db
from app.models.catalog import CardV2, ExpansionV2
from app.services.scanner import listing_fields

router = APIRouter(tags=["catalog"])


@router.get("/catalog/search")
def search_catalog(q: str = Query(min_length=2, max_length=100),
                   _: Seller = Depends(require_seller), db: Session = Depends(get_db)) -> dict:
    tokens = q.split()
    if not tokens:
        return {"cards": [], "has_more": False}
    fields = (CardV2.name, CardV2.en_name, CardV2.number, CardV2.printed_number,
              ExpansionV2.name, ExpansionV2.name_en)
    query = select(CardV2, ExpansionV2).join(ExpansionV2).where(CardV2.game == "pokemon")
    for token in tokens:
        # Bound parameters and literal wildcard escaping: user text is never SQL.
        pattern = "%" + token.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        query = query.where(or_(*(field.ilike(pattern, escape="\\") for field in fields)))
    rows = db.execute(query.order_by(CardV2.name, ExpansionV2.name, CardV2.printed_number,
                                     CardV2.language_code, CardV2.id).limit(26)).all()
    return {"cards": [listing_fields(card, expansion) for card, expansion in rows[:25]],
            "has_more": len(rows) > 25}
