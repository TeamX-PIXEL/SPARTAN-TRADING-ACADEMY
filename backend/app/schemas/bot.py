from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class BotBase(BaseModel):
    bot_name: str
    display_name: str
    description: Optional[str] = None
    price: float = 0.0
    thumbnail: Optional[str] = None
    token_env: str
    telegram_id: Optional[str] = None
    status: str = "active"


class BotCreate(BotBase):
    pass


class BotUpdate(BaseModel):
    bot_name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    thumbnail: Optional[str] = None
    token_env: Optional[str] = None
    telegram_id: Optional[str] = None
    status: Optional[str] = None


class BotResponse(BotBase):
    id: int
    product_uuid: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BotPublicResponse(BaseModel):
    bot_name: str
    display_name: str
    product_uuid: str
    description: Optional[str] = None
    price: float = 0.0
    thumbnail: Optional[str] = None
    status: str
    telegram_id: Optional[str] = None
    is_purchased: bool = False
    expiry: Optional[datetime] = None
    api_key: Optional[str] = None
    user_telegram_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)