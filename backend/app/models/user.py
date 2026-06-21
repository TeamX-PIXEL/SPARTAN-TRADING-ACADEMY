from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column("user_id", Integer, primary_key=True, index=True)
    UserID = Column("username", String(255), unique=True, index=True)
    firstname = Column(String(255), nullable=True)
    lastname = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, index=True)
    password = Column("password_hash", String(255))
    tvid = Column(String(255), unique=True, nullable=True)
    phone_number = Column(String(255), unique=True, nullable=True)
    telegram_user_id = Column(String(255), unique=True, nullable=True)
    telegram_chat_id = Column(String(255), unique=True, nullable=True)
    discord_user_id = Column(String(255), unique=True, nullable=True)
    discord_chat_id = Column(String(255), unique=True, nullable=True)
    last_login = Column(DateTime, nullable=True)

    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True, index=True)
    token_expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
