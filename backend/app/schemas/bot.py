from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class BotBase(BaseModel):
    bot_id: str
    title: str
    description: Optional[str] = None
    long_description: Optional[str] = None
    price: float = 0.0
    image: Optional[str] = None
    category: str = "General"
    features: Optional[list] = None
    exchange: str = "Binance"
    apy: str = "—"
    status: str = "Idle"
    token_env: Optional[str] = None


class BotCreate(BotBase):
    pass


class BotUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None
    features: Optional[list] = None
    exchange: Optional[str] = None
    apy: Optional[str] = None
    status: Optional[str] = None
    token_env: Optional[str] = None


class BotResponse(BotBase):
    id: int
    purchased_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BotPublicResponse(BotBase):
    id: int
    is_purchased: bool = False
    expiry: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BotMemberResponse(BaseModel):
    id: int
    username: str
    bot_id: str
    expiry: Optional[datetime] = None
    joined_at: datetime
    name: str = ""
    email: str = ""
    access_type: str = "free"

    model_config = ConfigDict(from_attributes=True)


class BotMemberUpdate(BaseModel):
    expiry: Optional[datetime] = None


class AddBotMemberRequest(BaseModel):
    username: str
    expiry: Optional[datetime] = None
    amount: float = 0.0
    method: Optional[str] = None
