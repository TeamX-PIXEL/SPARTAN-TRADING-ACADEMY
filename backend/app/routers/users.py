from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import mysql.connector

from app.database import get_db, get_db_connection
from app.models import User, Transaction, Course, Indicator, Bot
from app.schemas import UserResponse, UserPasswordUpdate
from app.core.deps import get_current_user, get_current_admin
from app.core.security import verify_password, get_password_hash
from app.config import get_settings
from pydantic import BaseModel

settings = get_settings()

DB_TABLE_EVERGREEN = settings.DB_TABLE_EVERGREEN
DB_TABLE_LEGACY = settings.DB_TABLE_LEGACY

# ---------------------------------------------------------------------------
# Helper models / functions
# ---------------------------------------------------------------------------

class UserProfileUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    tvid: Optional[str] = None
    phone_number: Optional[str] = None
    telegram_user_id: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_user_id: Optional[str] = None
    discord_chat_id: Optional[str] = None

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
    """Update the current user's profile."""
    if update.firstname is not None:
        current_user.firstname = update.firstname
    if update.lastname is not None:
        current_user.lastname = update.lastname
    current_user.client_name = f"{current_user.firstname or ''} {current_user.lastname or ''}".strip()
    if update.tvid is not None:
        current_user.tvid = update.tvid
    if update.phone_number is not None:
        current_user.phone_number = update.phone_number
    if update.telegram_user_id is not None:
        current_user.telegram_user_id = update.telegram_user_id
    if update.telegram_chat_id is not None:
        current_user.telegram_chat_id = update.telegram_chat_id
    if update.discord_user_id is not None:
        current_user.discord_user_id = update.discord_user_id
    if update.discord_chat_id is not None:
        current_user.discord_chat_id = update.discord_chat_id
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


@router.get("/users/{user_id}/transactions")
def get_user_transactions(user_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    transactions = db.query(Transaction).filter(Transaction.username == user.UserID).all()
    return transactions


@router.get("/me/purchases")
def get_my_purchases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return course, indicator, and bot IDs the current user owns via transactions."""
    transactions = db.query(Transaction).filter(Transaction.username == current_user.UserID).all()

    course_ids = [t.course_id for t in transactions if t.product_section == "Course" and t.course_id]
    indicator_ids = [t.indicator_id for t in transactions if t.product_section == "Indicator" and t.indicator_id]

    courses = db.query(Course).filter(Course.course_id.in_(course_ids)).all() if course_ids else []
    indicators = db.query(Indicator).filter(Indicator.indicator_id.in_(indicator_ids)).all() if indicator_ids else []

    # Bots: derive from bot alert filter tables
    bot_uuids = []
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            for model, table in [("Evergreen", DB_TABLE_EVERGREEN), ("Legacy", DB_TABLE_LEGACY)]:
                access_col = f"{model}_Access"
                cursor.execute(f"SELECT {access_col} FROM {table} WHERE user = %s", (current_user.UserID,))
                row = cursor.fetchone()
                if row and row.get(access_col):
                    # Find the bot with matching title
                    bot = db.query(Bot).filter(Bot.title == model).first()
                    if bot:
                        bot_uuids.append(bot.bot_id)
        finally:
            cursor.close()
            connection.close()

    return {
        "courses": [c.course_id for c in courses],
        "indicators": [i.indicator_id for i in indicators],
        "bots": bot_uuids
    }


@router.get("/users/search")
def search_users(q: str, current_admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    """Search users by @UserID prefix or email."""
    query = q.strip()

    if query.startswith("@"):
        users = db.query(User).filter(User.UserID.ilike(f"{query[1:]}%")).limit(8).all()
    else:
        users = db.query(User).filter(User.email.ilike(f"{query}%")).limit(8).all()

    return [
        {
            "id": u.id,
            "username": u.UserID or "",
            "name": f"{u.firstname or ''} {u.lastname or ''}".strip() or u.UserID or "",
            "email": u.email or "",
            "tvid": u.tvid or "",
        }
        for u in users
    ]
