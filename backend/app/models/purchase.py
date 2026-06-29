from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from app.database import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    product_section = Column(Integer, default=1)
    product_id = Column(Integer, index=True)
    user_id = Column(Integer, index=True)
    batch_list_id = Column(Integer, ForeignKey("batch_list.id"), nullable=True)

    cost = Column(Float)
    purchased_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expiry = Column(DateTime, default=lambda: datetime.now(timezone.utc) + timedelta(days=365))