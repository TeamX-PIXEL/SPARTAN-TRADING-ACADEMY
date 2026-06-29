from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), ForeignKey("users.username"), index=True)
    product_section = Column(String(20), nullable=False, index=True)  # Course, Discord, Indicator, Bot
    batch_id = Column(String(50), ForeignKey("batches.batch_id", ondelete="SET NULL"), nullable=True, index=True)
    indicator_id = Column(String(64), ForeignKey("indicators.indicator_id"), nullable=True, index=True)
    bot_id = Column(String(50), ForeignKey("bots.bot_id"), nullable=True, index=True)
    expiry = Column(DateTime, nullable=True)
    amount = Column(Float, default=0)
    method = Column(String(50), nullable=True)
    type = Column(String(20), default="Purchase")  # Purchase or Renewal
    status = Column(String(20), default="completed")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    settlement_date = Column(DateTime, nullable=True)
    address = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
