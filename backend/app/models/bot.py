import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float
from app.database import Base


class Bot(Base):
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True, index=True)
    product_uuid = Column(String(255), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    bot_name = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    price = Column(Float, default=0.0)
    thumbnail = Column(String(255), nullable=True)
    token_env = Column(String(255), nullable=False)
    telegram_id = Column(String(255), nullable=True)
    status = Column(String(255), default="active", index=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))