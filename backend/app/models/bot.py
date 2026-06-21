from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Bot(Base):
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(String(50), unique=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    long_description = Column(Text, nullable=True)
    price = Column(Float, default=0.0)
    image = Column(Text, nullable=True)
    category = Column(String(100), default="General")
    features = Column(JSON, nullable=True)
    exchange = Column(String(100), default="Binance")
    apy = Column(String(50), default="—")
    status = Column(String(20), default="Idle", index=True)
    token_env = Column(String(255), nullable=True)
    purchased_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class BotMember(Base):
    __tablename__ = "bot_members"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True)
    bot_id = Column(String(50), index=True)
    expiry = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("username", "bot_id", name="uk_bot_user"),
    )
