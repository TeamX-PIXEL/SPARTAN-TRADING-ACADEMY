import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Indicator, IndicatorUser, User
from app.schemas import (
    IndicatorCreate, IndicatorUpdate, IndicatorResponse, IndicatorDeleteResponse,
    IndicatorUserResponse, AddIndicatorUserRequest
)
from app.core.deps import get_current_admin
from app.core.security import SECRET_KEY, ALGORITHM
from app.services.tradingview import tradingview as tv_handler

router = APIRouter(prefix="", tags=["Indicators"])

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# ==========================================
# HELPERS
# ==========================================
def get_optional_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    """Like get_current_user but returns None for unauthenticated requests."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None


def parse_expiry_period(expiry_period: str, now: datetime = None):
    """
    Parses an expiry_period string (e.g. '7D', '1M', '3M', '6M', '1Y', '1L')
    Returns (extension_type, extension_length, expiry_date) where:
    - extension_type/ext_length are for TradingView's add_access
    - expiry_date is the calculated DateTime for the indicator_users table
    """
    from dateutil.relativedelta import relativedelta
    if not expiry_period:
        expiry_period = "1M"

    ext_type = expiry_period[-1].upper()
    try:
        ext_length = 0 if ext_type == 'L' else int(expiry_period[:-1])
    except ValueError:
        ext_type = 'M'
        ext_length = 1

    if now is None:
        now = datetime.now()

    if ext_type == 'D':
        expiry_date = now + timedelta(days=ext_length)
    elif ext_type == 'M':
        expiry_date = now + relativedelta(months=ext_length)
    elif ext_type == 'Y':
        expiry_date = now + relativedelta(years=ext_length)
    elif ext_type == 'L':
        expiry_date = None  # Lifetime
    else:
        expiry_date = now + relativedelta(months=1)

    return ext_type, ext_length, expiry_date


def _build_indicator_response(indicator: Indicator, current_user: Optional[User], db: Session):
    is_purchased = False
    expiry = None
    if current_user:
        iu = db.query(IndicatorUser).filter(
            IndicatorUser.user_id == current_user.id,
            IndicatorUser.indicator_id == indicator.id
        ).first()
        if iu:
            is_purchased = True
            expiry = iu.expiry.isoformat() if iu.expiry else None
    return {
        "id": indicator.id,
        "indicator_name": indicator.indicator_name,
        "indicator_description": indicator.indicator_description,
        "indicator_price": indicator.indicator_price,
        "showcase_image": indicator.showcase_image,
        "status": indicator.status,
        "pine_id": indicator.pine_id,
        "session_id": indicator.session_id,
        "expiry_period": indicator.expiry_period,
        "product_uuid": indicator.product_uuid,
        "buyers": indicator.buyers,
        "created_at": indicator.created_at,
        "updated_at": indicator.updated_at,
        "is_purchased": is_purchased,
        "expiry": expiry,
    }


# ==========================================
# ADMIN ENDPOINTS
# ==========================================
@router.post("/add/indicator", response_model=IndicatorResponse, status_code=status.HTTP_201_CREATED)
def create_indicator(indicator: IndicatorCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Add a new indicator to the database."""
    # Convert Pydantic schema to dictionary and unpack into SQLAlchemy model
    new_indicator = Indicator(**indicator.model_dump())

    db.add(new_indicator)
    db.commit()
    db.refresh(new_indicator)  # Grabs the newly generated ID and timestamps from DB

    return new_indicator


@router.get("/fetch/indicators", response_model=List[IndicatorResponse])
def get_all_indicators(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Fetch a list of all indicators with optional pagination."""
    indicators = db.query(Indicator).offset(skip).limit(limit).all()
    return indicators


@router.get("/fetch/indicator/{indicator_id}", response_model=IndicatorResponse)
def get_indicator(indicator_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Fetch details of a specific indicator by its ID."""
    indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()

    if not indicator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")

    return indicator


@router.patch("/edit/indicator/{indicator_id}", response_model=IndicatorResponse)
def update_indicator(indicator_id: int, indicator_update: IndicatorUpdate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Update specific fields of an existing indicator."""
    db_indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()

    if not db_indicator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")

    # Extract only the fields the user actually sent in the request
    update_data = indicator_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_indicator, key, value)

    db.commit()
    db.refresh(db_indicator)

    return db_indicator


@router.delete("/delete/indicator/{indicator_id}", response_model=IndicatorDeleteResponse)
def delete_indicator(indicator_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Remove an indicator from the database."""
    db_indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()

    if not db_indicator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")

    db.delete(db_indicator)
    db.commit()

    return {"message": f"Indicator '{db_indicator.indicator_name}' deleted successfully"}


# ==========================================
# INDICATOR USER MANAGEMENT
# ==========================================
@router.get("/indicators/{indicator_id}/users", response_model=List[IndicatorUserResponse])
def get_indicator_users(indicator_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")

    entries = db.query(IndicatorUser).filter(
        IndicatorUser.indicator_id == indicator_id
    ).all()

    if not entries:
        return []

    user_ids = [e.user_id for e in entries]
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u for u in users}

    return [
        {
            "id": e.id,
            "user_id": e.user_id,
            "user_name": user_map[e.user_id].UserName if e.user_id in user_map else "Unknown",
            "email": user_map[e.user_id].email if e.user_id in user_map else "",
            "indicator_id": e.indicator_id,
            "expiry": e.expiry,
            "created_at": e.created_at,
        }
        for e in entries
    ]


@router.post("/indicators/{indicator_id}/users")
def add_indicator_user(
    indicator_id: int,
    payload: AddIndicatorUserRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.tvid:
        raise HTTPException(status_code=400, detail="User does not have a TradingView username (tvid) set")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    ext_type, ext_length, expiry_date = parse_expiry_period(indicator.expiry_period, now)

    try:
        session_id = indicator.session_id
        pine_id = indicator.pine_id
        tv_username = user.tvid

        details = tv_handler.get_access_details(tv_username, pine_id, session_id)

        tv_result = tv_handler.add_access(
            access_details=details,
            extension_type=ext_type,
            extension_length=ext_length,
            sessionid=session_id
        )

        if tv_result.get("status") != "Success":
            return JSONResponse(
                content={"success": False, "message": "Failed to grant TradingView access"},
                status_code=500
            )

    except Exception as e:
        print(f"TradingView error: {e}")
        return JSONResponse(
            content={"success": False, "message": f"TradingView error: {str(e)}"},
            status_code=500
        )

    existing = db.query(IndicatorUser).filter(
        IndicatorUser.user_id == payload.user_id,
        IndicatorUser.indicator_id == indicator_id
    ).first()

    if existing:
        existing.expiry = expiry_date
        existing.updated_at = datetime.now(timezone.utc)
        db.add(existing)
        message = "User access updated successfully"
    else:
        new_entry = IndicatorUser(
            user_id=payload.user_id,
            indicator_id=indicator_id,
            expiry=expiry_date
        )
        db.add(new_entry)
        indicator.buyers += 1
        db.add(indicator)
        message = "User added successfully"

    db.commit()

    return {"success": True, "message": message}


# ==========================================
# PUBLIC ENDPOINTS
# ==========================================
@router.get("/public/indicators", response_model=List[IndicatorResponse])
def get_public_indicators(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Public endpoint to fetch available indicators."""
    indicators = db.query(Indicator).offset(skip).limit(limit).all()
    return [_build_indicator_response(i, current_user, db) for i in indicators]


@router.get("/public/indicators/{product_uuid}", response_model=IndicatorResponse)
def get_public_indicator(
    product_uuid: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    indicator = db.query(Indicator).filter(Indicator.product_uuid == product_uuid).first()
    if not indicator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")
    return _build_indicator_response(indicator, current_user, db)
