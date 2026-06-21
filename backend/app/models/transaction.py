from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), ForeignKey("users.username"), index=True)
    product_section = Column(String(20), nullable=False, index=True)  # Course, Discord, Indicator, Bot
    course_id = Column(String(50), ForeignKey("courses.course_id"), nullable=True, index=True)
    indicator_id = Column(String(64), ForeignKey("indicators.indicator_id"), nullable=True, index=True)
    bot_id = Column(String(50), ForeignKey("bots.bot_id"), nullable=True, index=True)
    expiry = Column(DateTime, nullable=True)
    amount = Column(Float, default=0)
    method = Column(String(50), nullable=True)
    status = Column(String(20), default="completed")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
