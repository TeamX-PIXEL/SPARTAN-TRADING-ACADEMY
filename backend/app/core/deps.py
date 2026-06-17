from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
import jwt
from app.database import get_db, SessionLocal
from app.models import User, AdminUser
from app.core.security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_admin(token: str = Depends(oauth2_scheme)):
    """Validates the JWT and ensures the user is an admin.
    
    Matches original main.py behavior: checks the 'role' claim in the JWT
    instead of querying a database. Admins are stored in raw MySQL admin_users,
    not SQLAlchemy AdminUser, so we trust the JWT issued by /api/admin/login.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        username: str = payload.get("username")

        # Strictly enforce that this token belongs to an admin
        if user_id is None or role != "admin":
            raise credentials_exception

        # Return a simple dictionary instead of a SQLAlchemy model
        # (matches original main.py get_current_admin)
        return {"id": user_id, "username": username, "role": role}

    except jwt.PyJWTError:
        raise credentials_exception