from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON, UniqueConstraint
from app.database import Base


class Indicator(Base):
    __tablename__ = "indicators"

    id = Column(Integer, primary_key=True, index=True)
    indicator_id = Column(String(64), unique=True, index=True)
    title = Column(String(255), index=True)
    description = Column(Text)
    long_description = Column(Text, nullable=True)
    price = Column(Float, default=0.0)
    image = Column(Text, nullable=True)
    category = Column(String(128), default="General")
    features = Column(JSON, nullable=True)
    script_type = Column(String(128), default="Pine Script (v6)")
    accuracy = Column(String(32), nullable=True)
    timeframe = Column(String(128), nullable=True)
    pine_id = Column(String(128), nullable=True, index=True)
    session_id = Column(String(128), nullable=True, index=True)
    status = Column(String(16), default="unavailable", index=True)
    purchased_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class IndicatorMember(Base):
    __tablename__ = "indicator_members"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True)
    indicator_id = Column(String(64), index=True)
    expiry = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("username", "indicator_id", name="uk_indicator_user"),
    )
