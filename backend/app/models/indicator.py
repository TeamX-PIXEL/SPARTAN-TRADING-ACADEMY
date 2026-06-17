import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from app.database import Base


class Indicator(Base):
    __tablename__ = "indicators"

    id = Column(Integer, primary_key=True, index=True)
    product_uuid = Column(String(255), unique=True, index=True, default=lambda: str(uuid.uuid4()))

    pine_id = Column(String(255), nullable=True, index=True)
    session_id = Column(String(255), nullable=True, index=True)

    indicator_name = Column(String(255), index=True)
    indicator_description = Column(String(255))
    indicator_price = Column(Float, default=0.0)
    showcase_image = Column(String(255), nullable=True)

    buyers = Column(Integer, default=0)
    status = Column(String(255), default="unavailable", index=True)
    expiry_period = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class IndicatorUser(Base):
    __tablename__ = "indicator_users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    indicator_id = Column(Integer, ForeignKey("indicators.id"), index=True)
    expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))