from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import AdminUser, User, Course, Indicator, Bot, Purchase
from app.schemas import AdminCreate, AdminLoginRequest
from app.core.deps import get_current_admin
from app.core.security import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    return {
        "total_users": db.query(User).count(),
        "total_courses": db.query(Course).count(),
        "total_indicators": db.query(Indicator).count(),
        "total_bots": db.query(Bot).count(),
        "total_purchases": db.query(Purchase).count(),
        "total_admins": db.query(AdminUser).count(),
    }


@router.get("/users", response_model=List[dict])
def get_all_users(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "UserUUID": u.UserUUID,
            "UserID": u.UserID,
            "UserName": u.UserName,
            "email": u.email,
            "tvid": u.tvid,
            "is_verified": u.is_verified,
            "created_at": u.created_at,
        }
        for u in users
    ]


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