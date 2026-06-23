from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import secrets

from app.database import get_db
from app.models import AdminUser, User, Course, Indicator, Bot, Transaction
from app.models.course import CourseMember
from app.models.indicator import IndicatorMember
from app.models.bot import BotMember
from app.schemas import AdminCreate, AdminLoginRequest, ClientCreate, ClientUpdate
from app.core.deps import get_current_admin
from app.core.security import get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    return {
        "total_users": db.query(User).count(),
        "total_courses": db.query(Course).count(),
        "total_indicators": db.query(Indicator).count(),
        "total_bots": db.query(Bot).count(),
        "total_transactions": db.query(Transaction).count(),
        "total_admins": db.query(AdminUser).count(),
    }


# ---------------------------------------------------------------------------
# Client Management endpoints
# ---------------------------------------------------------------------------

def _user_to_dict(u: User) -> dict:
    name = f"{u.firstname or ''} {u.lastname or ''}".strip() or u.UserID or ""
    return {
        "id": u.id,
        "UserID": u.UserID,
        "UserName": name,
        "firstname": u.firstname or "",
        "lastname": u.lastname or "",
        "email": u.email,
        "tvid": u.tvid,
        "phone_number": u.phone_number,
        "telegram_user_id": u.telegram_user_id,
        "telegram_chat_id": u.telegram_chat_id,
        "discord_user_id": u.discord_user_id,
        "discord_chat_id": u.discord_chat_id,
        "is_verified": u.is_verified,
        "created_at": u.created_at,
    }


@router.get("/users")
def get_all_users(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    users = db.query(User).all()
    return [_user_to_dict(u) for u in users]


@router.get("/users/search")
def search_users_admin(q: str, current_admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    """Search users by @username prefix, name, or email."""
    query = q.strip().lstrip("@")

    users = db.query(User).filter(
        (User.UserID.ilike(f"{query}%")) |
        (User.firstname.ilike(f"%{query}%")) |
        (User.lastname.ilike(f"%{query}%")) |
        (User.email.ilike(f"%{query}%"))
    ).limit(8).all()

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


@router.get("/users/check-username/{username}")
def check_username(username: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    exists = db.query(User).filter(User.UserID == username).first() is not None
    return {"available": not exists}


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_client(data: ClientCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    if db.query(User).filter(User.UserID == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if data.phone_number and db.query(User).filter(User.phone_number == data.phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    raw_password = data.password or secrets.token_urlsafe(12)
    user = User(
        UserID=data.username,
        firstname=data.firstname,
        lastname=data.lastname,
        email=data.email,
        password=get_password_hash(raw_password),
        phone_number=data.phone_number,
        tvid=data.tvid,
        telegram_user_id=data.telegram_user_id,
        telegram_chat_id=data.telegram_chat_id,
        discord_user_id=data.discord_user_id,
        discord_chat_id=data.discord_chat_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_dict(user)


@router.put("/users/{user_id}")
def update_client(user_id: int, data: ClientUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.email and data.email != user.email:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
    if data.phone_number and data.phone_number != user.phone_number:
        if db.query(User).filter(User.phone_number == data.phone_number).first():
            raise HTTPException(status_code=400, detail="Phone number already registered")

    user.firstname = data.firstname
    user.lastname = data.lastname
    user.email = data.email
    user.phone_number = data.phone_number if data.phone_number else None
    user.tvid = data.tvid if data.tvid else None
    user.telegram_user_id = data.telegram_user_id if data.telegram_user_id else None
    user.telegram_chat_id = data.telegram_chat_id if data.telegram_chat_id else None
    user.discord_user_id = data.discord_user_id if data.discord_user_id else None
    user.discord_chat_id = data.discord_chat_id if data.discord_chat_id else None
    if data.password:
        user.password = get_password_hash(data.password)

    db.commit()
    db.refresh(user)
    return _user_to_dict(user)


@router.get("/users/{user_id}/courses")
def get_user_courses(user_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    members = db.query(CourseMember).filter(CourseMember.username == user.UserID).all()
    results = []
    for m in members:
        course = db.query(Course).filter(Course.course_id == m.course_id).first()
        txn = (
            db.query(Transaction)
            .filter(
                Transaction.username == user.UserID,
                Transaction.product_section == "Course",
                Transaction.course_id == m.course_id,
            )
            .order_by(Transaction.id.desc())
            .first()
        )
        access_type = "paid" if txn and txn.amount and txn.amount > 0 else "free"
        results.append({
            "member_id": m.id,
            "product_id": m.course_id,
            "title": course.title if course else m.course_id,
            "access_type": access_type,
            "joined_at": m.joined_at,
            "expiry": m.expiry,
        })
    return results


@router.get("/users/{user_id}/indicators")
def get_user_indicators(user_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    members = db.query(IndicatorMember).filter(IndicatorMember.username == user.UserID).all()
    results = []
    for m in members:
        indicator = db.query(Indicator).filter(Indicator.indicator_id == m.indicator_id).first()
        txn = (
            db.query(Transaction)
            .filter(
                Transaction.username == user.UserID,
                Transaction.product_section == "Indicator",
                Transaction.indicator_id == m.indicator_id,
            )
            .order_by(Transaction.id.desc())
            .first()
        )
        access_type = "paid" if txn and txn.amount and txn.amount > 0 else "free"
        results.append({
            "member_id": m.id,
            "product_id": m.indicator_id,
            "title": indicator.title if indicator else m.indicator_id,
            "access_type": access_type,
            "joined_at": m.joined_at,
            "expiry": m.expiry,
        })
    return results


@router.get("/users/{user_id}/bots")
def get_user_bots(user_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    members = db.query(BotMember).filter(BotMember.username == user.UserID).all()
    results = []
    for m in members:
        bot = db.query(Bot).filter(Bot.bot_id == m.bot_id).first()
        txn = (
            db.query(Transaction)
            .filter(
                Transaction.username == user.UserID,
                Transaction.product_section == "Bot",
                Transaction.bot_id == m.bot_id,
            )
            .order_by(Transaction.id.desc())
            .first()
        )
        access_type = "paid" if txn and txn.amount and txn.amount > 0 else "free"
        results.append({
            "member_id": m.id,
            "product_id": m.bot_id,
            "title": bot.title if bot else m.bot_id,
            "access_type": access_type,
            "joined_at": m.joined_at,
            "expiry": m.expiry,
        })
    return results


# ---------------------------------------------------------------------------
# Admin CRUD (existing)
# ---------------------------------------------------------------------------

@router.get("/admins", response_model=List[dict])
def get_all_admins(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    admins = db.query(AdminUser).all()
    return [
        {
            "id": a.id,
            "username": a.username,
            "email": a.email,
            "is_verified": a.is_verified,
            "created_at": a.created_at,
        }
        for a in admins
    ]


@router.post("/admins", status_code=status.HTTP_201_CREATED)
def create_admin(admin_data: AdminCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    if db.query(AdminUser).filter(AdminUser.username == admin_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if admin_data.email and db.query(AdminUser).filter(AdminUser.email == admin_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(admin_data.password)
    new_admin = AdminUser(
        username=admin_data.username,
        email=admin_data.email,
        password_hash=hashed_password,
    )
    db.add(new_admin)
    db.commit()
    return {"message": "Admin created successfully"}


@router.delete("/admins/{admin_id}")
def delete_admin(admin_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    if admin.username == current_admin.username:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(admin)
    db.commit()
    return {"message": "Admin deleted successfully"}
