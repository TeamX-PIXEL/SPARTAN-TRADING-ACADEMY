from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.models import Indicator, IndicatorMember, User, Transaction
from app.schemas import (
    IndicatorCreate, IndicatorUpdate, IndicatorResponse, IndicatorDeleteResponse,
    PaginatedIndicatorsResponse,
    IndicatorMemberCreate, IndicatorMemberUpdate, IndicatorMemberResponse,
)
from app.core.deps import get_current_admin
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/api/admin", tags=["Indicators"])
public_router = APIRouter(tags=["Indicators"])

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _get_optional_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


def _build_member_response(member: IndicatorMember, user: Optional[User] = None, txn: Optional[Transaction] = None) -> dict:
    """Build enriched member response by joining with users table."""
    name = ""
    email = ""
    discord_user_id = None
    access_type = "free"

    if user:
        name = f"{user.firstname or ''} {user.lastname or ''}".strip() or user.UserID or ""
        email = user.email or ""
        discord_user_id = getattr(user, "discord_user_id", None)

    if txn and (txn.amount or 0) > 0:
        access_type = "paid"

    return {
        "id": member.id,
        "username": member.username,
        "indicator_id": member.indicator_id,
        "expiry": member.expiry,
        "joined_at": member.joined_at,
        "name": name,
        "email": email,
        "discord_user_id": discord_user_id,
        "access_type": access_type,
    }


# ==========================================
# INDICATOR CRUD
# ==========================================

@router.get("/indicators", response_model=PaginatedIndicatorsResponse)
def list_indicators(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    total = db.query(Indicator).count()
    indicators = db.query(Indicator).offset(skip).limit(limit).all()
    return PaginatedIndicatorsResponse(
        indicators=indicators,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/indicators", response_model=IndicatorResponse, status_code=status.HTTP_201_CREATED)
def create_indicator(
    indicator: IndicatorCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    existing = db.query(Indicator).filter(Indicator.indicator_id == indicator.indicator_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Indicator ID '{indicator.indicator_id}' already exists")

    new_indicator = Indicator(**indicator.model_dump())
    db.add(new_indicator)
    db.commit()
    db.refresh(new_indicator)
    return new_indicator


@router.get("/indicators/check-id/{indicator_id}")
def check_indicator_id(
    indicator_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    exists = db.query(Indicator).filter(Indicator.indicator_id == indicator_id).first() is not None
    return {"exists": exists}


@router.get("/indicators/{indicator_id}", response_model=IndicatorResponse)
def get_indicator(
    indicator_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    indicator = db.query(Indicator).filter(Indicator.indicator_id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return indicator


@router.put("/indicators/{indicator_id}", response_model=IndicatorResponse)
def update_indicator(
    indicator_id: str,
    indicator_update: IndicatorUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    db_indicator = db.query(Indicator).filter(Indicator.indicator_id == indicator_id).first()
    if not db_indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")

    update_data = indicator_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_indicator, key, value)
    db.commit()
    db.refresh(db_indicator)
    return db_indicator


@router.delete("/indicators/{indicator_id}", response_model=IndicatorDeleteResponse)
def delete_indicator(
    indicator_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    db_indicator = db.query(Indicator).filter(Indicator.indicator_id == indicator_id).first()
    if not db_indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")

    if (db_indicator.purchased_count or 0) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete indicator — {db_indicator.title} has {db_indicator.purchased_count} member(s). Remove members first.",
        )

    db.query(IndicatorMember).filter(IndicatorMember.indicator_id == indicator_id).delete()
    db.delete(db_indicator)
    db.commit()
    return {"message": f"Indicator '{db_indicator.title}' deleted successfully", "indicator_id": indicator_id}


# ==========================================
# INDICATOR MEMBER MANAGEMENT
# ==========================================

@router.get("/indicators/{indicator_id}/members", response_model=List[IndicatorMemberResponse])
def get_indicator_members(
    indicator_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    indicator = db.query(Indicator).filter(Indicator.indicator_id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")

    entries = db.query(IndicatorMember).filter(
        IndicatorMember.indicator_id == indicator_id
    ).all()

    result = []
    for entry in entries:
        user = db.query(User).filter(User.UserID == entry.username).first()
        txn = db.query(Transaction).filter(
            Transaction.username == entry.username,
            Transaction.indicator_id == indicator_id,
            Transaction.product_section == "Indicator",
        ).order_by(Transaction.created_at.desc()).first()
        result.append(_build_member_response(entry, user, txn))

    return result


@router.post("/indicators/{indicator_id}/members")
def add_indicator_member(
    indicator_id: str,
    payload: IndicatorMemberCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    indicator = db.query(Indicator).filter(Indicator.indicator_id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")

    user = db.query(User).filter(User.UserID == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(IndicatorMember).filter(
        IndicatorMember.username == payload.username,
        IndicatorMember.indicator_id == indicator_id,
    ).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    txn = None

    if existing:
        existing.expiry = payload.expiry or existing.expiry
        db.commit()
        db.refresh(existing)
        member = existing
    else:
        member = IndicatorMember(
            username=payload.username,
            indicator_id=indicator_id,
            expiry=payload.expiry,
        )
        db.add(member)
        db.commit()
        db.refresh(member)

        indicator.purchased_count = (indicator.purchased_count or 0) + 1
        db.add(indicator)

        txn = Transaction(
            username=payload.username,
            product_section="Indicator",
            indicator_id=indicator_id,
            expiry=payload.expiry,
            amount=payload.amount,
            method=payload.method or "Free",
            status="completed",
        )
        db.add(txn)
        db.commit()

    return _build_member_response(member, user, txn)


@router.patch("/indicators/members/{member_id}")
def update_indicator_member(
    member_id: int,
    payload: IndicatorMemberUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    member = db.query(IndicatorMember).filter(IndicatorMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if payload.expiry is not None:
        member.expiry = payload.expiry

    db.commit()
    db.refresh(member)

    user = db.query(User).filter(User.UserID == member.username).first()
    txn = db.query(Transaction).filter(
        Transaction.username == member.username,
        Transaction.indicator_id == member.indicator_id,
        Transaction.product_section == "Indicator",
    ).order_by(Transaction.created_at.desc()).first()
    return _build_member_response(member, user, txn)


# ==========================================
# PUBLIC / CLIENT ENDPOINTS
# ==========================================
@public_router.get("/public/indicators")
def get_public_indicators(
    skip: int = Query(0, ge=0),
    limit: int = Query(8, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    """Returns indicators visible to public, excluding draft/unavailable."""
    query = db.query(Indicator).filter(
        Indicator.status.notin_(["draft", "unavailable"])
    )

    total = query.count()
    indicators = query.offset(skip).limit(limit).all()

    items = []
    for ind in indicators:
        items.append({
            "id": ind.indicator_id,
            "indicator_id": ind.indicator_id,
            "title": ind.title,
            "description": ind.description,
            "longDescription": ind.long_description or ind.description,
            "price": ind.price,
            "image": ind.image,
            "category": ind.category or "Scripts",
            "features": ind.features or [],
            "scriptType": ind.script_type or "Pine Script",
            "accuracy": ind.accuracy,
            "timeframe": ind.timeframe,
        })

    return {"indicators": items, "total": total, "skip": skip, "limit": limit}


@public_router.get("/public/indicators/{indicator_id}")
def get_public_indicator(
    indicator_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    """Returns a single indicator for public view."""
    ind = db.query(Indicator).filter(Indicator.indicator_id == indicator_id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Indicator not found")

    is_purchased = False
    if current_user:
        is_purchased = db.query(IndicatorMember).filter(
            IndicatorMember.username == current_user.UserID,
            IndicatorMember.indicator_id == indicator_id,
        ).first() is not None

    return {
        "id": ind.indicator_id,
        "indicator_id": ind.indicator_id,
        "title": ind.title,
        "description": ind.description,
        "longDescription": ind.long_description or ind.description,
        "price": ind.price,
        "image": ind.image,
        "category": ind.category or "Scripts",
        "features": ind.features or [],
        "scriptType": ind.script_type or "Pine Script",
        "accuracy": ind.accuracy,
        "timeframe": ind.timeframe,
        "is_purchased": is_purchased,
    }
