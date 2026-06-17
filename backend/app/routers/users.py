from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import mysql.connector

from app.database import get_db, get_db_connection
from app.models import User, Purchase, Course, Indicator, Bot
from app.schemas import UserResponse, UserPasswordUpdate, UserSearchResult
from app.core.deps import get_current_user, get_current_admin
from app.core.security import verify_password, get_password_hash
from app.config import get_settings
from pydantic import BaseModel

settings = get_settings()

# ---------------------------------------------------------------------------
# Helper models / functions
# ---------------------------------------------------------------------------

class UserProfileUpdate(BaseModel):
    UserName: Optional[str] = None
    tvid: Optional[str] = None


def get_bot_model(token_env: str) -> str:
    """Map a bot's token_env to its model name (Evergreen/Legacy/Alpha)."""
    mapping = {
        "EVERGREEN_BOT_TOKEN": "Evergreen",
        "LEGACY_BOT_TOKEN": "Legacy",
        "ALPHA_BOT_TOKEN": "Alpha",
    }
    return mapping.get(token_env)


DB_TABLE_USERS = settings.DB_TABLE_USERS

# ---------------------------------------------------------------------------
# Router for SQLAlchemy-based user endpoints (prefix /users)
# ---------------------------------------------------------------------------
router = APIRouter(prefix="", tags=["Users"])


@router.get("/users", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """List all SQLAlchemy users (admin only)."""
    return db.query(User).offset(skip).limit(limit).all()


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/me", response_model=UserResponse)
def update_my_profile(
    update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update the current user's profile (name and TradingView username)."""
    if update.UserName is not None:
        current_user.UserName = update.UserName
    if update.tvid is not None:
        current_user.tvid = update.tvid
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/users/me/password")
def change_my_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change the current user's password after verifying the current one."""
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@router.get("/users/{user_id}/purchases")
def get_user_purchases(user_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    purchases = db.query(Purchase).filter(Purchase.user_id == user_id).all()
    return purchases


@router.get("/me/purchases")
def get_my_purchases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return product UUIDs for courses, indicators, and bots the current user owns."""
    purchases = db.query(Purchase).filter(Purchase.user_id == current_user.id).all()

    course_ids = [p.product_id for p in purchases if p.product_section == 1]
    indicator_ids = [p.product_id for p in purchases if p.product_section == 2]

    courses = db.query(Course).filter(Course.id.in_(course_ids)).all() if course_ids else []
    indicators = db.query(Indicator).filter(Indicator.id.in_(indicator_ids)).all() if indicator_ids else []

    # Bots: derive from raw MySQL signal_users instead of purchases
    bot_uuids = []
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE user = %s", (current_user.UserID,))
            row = cursor.fetchone()
            if row:
                today = date.today()
                all_bots = db.query(Bot).filter(Bot.status == "active").all()
                for b in all_bots:
                    model = get_bot_model(b.token_env)
                    if model:
                        access = row.get(f"{model}_Access")
                        expiry = row.get(f"{model}_Expiry")
                        if access and expiry and expiry >= today:
                            bot_uuids.append(b.product_uuid)
        finally:
            cursor.close()
            connection.close()

    return {
        "courses": [c.product_uuid for c in courses],
        "indicators": [i.product_uuid for i in indicators],
        "bots": bot_uuids
    }


@router.get("/users/search", response_model=List[UserSearchResult])
def search_users(q: str, current_admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    """Search users by @UserID prefix or email."""
    query = q.strip()

    if query.startswith("@"):
        users = db.query(User).filter(User.UserID.ilike(f"{query[1:]}%")).limit(8).all()
    else:
        users = db.query(User).filter(User.email.ilike(f"{query}%")).limit(8).all()

    return users
