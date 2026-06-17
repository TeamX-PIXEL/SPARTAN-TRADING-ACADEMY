import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column("user_id", Integer, primary_key=True, index=True)
    UserUUID = Column(String(255), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    UserID = Column("username", String(255), unique=True, index=True)
    UserName = Column("client_name", String(255))
    email = Column(String(255), unique=True, index=True)
    password = Column("password_hash", String(255))
    tvid = Column(String(255), nullable=True)
    last_login = Column(DateTime, nullable=True)

    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True, index=True)
    token_expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
