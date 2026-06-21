from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class TransactionCreate(BaseModel):
    username: str
    product_section: str  # Course, Discord, Indicator, Bot
    course_id: Optional[str] = None
    indicator_id: Optional[str] = None
    bot_id: Optional[str] = None
    expiry: Optional[datetime] = None
    amount: float = 0
    method: Optional[str] = None
    type: str = "Purchase"  # Purchase or Renewal
    status: str = "completed"


class PurchaseRequest(BaseModel):
    product_section: str  # Course, Indicator, Bot
    product_id: str
    amount: float = 0
    method: Optional[str] = "Card"


class RenewRequest(BaseModel):
    product_section: str  # Indicator, Bot
    product_id: str
    amount: float = 0
    duration_days: int = 30
    method: Optional[str] = "Card"


class DiscordRenewRequest(BaseModel):
    course_id: str
    amount: float = 0
    method: Optional[str] = "Card"


class TransactionResponse(BaseModel):
    id: int
    username: str
    product_section: str
    course_id: Optional[str] = None
    indicator_id: Optional[str] = None
    bot_id: Optional[str] = None
    expiry: Optional[datetime] = None
    amount: float
    method: Optional[str] = None
    type: str = "Purchase"
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
