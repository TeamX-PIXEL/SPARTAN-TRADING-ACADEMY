from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class IndicatorBase(BaseModel):
    indicator_name: str
    indicator_description: Optional[str] = None
    indicator_price: float = 0.0
    showcase_image: Optional[str] = None
    status: str = Field(default="unavailable", description="Must be: unavailable, paused, or running")
    pine_id: Optional[str] = None
    session_id: Optional[str] = None
    expiry_period: Optional[str] = None


class IndicatorCreate(IndicatorBase):
    pass


class IndicatorUpdate(BaseModel):
    indicator_name: Optional[str] = None
    indicator_description: Optional[str] = None
    indicator_price: Optional[float] = None
    showcase_image: Optional[str] = None
    status: Optional[str] = Field(None, description="Must be: unavailable, paused, or running")
    pine_id: Optional[str] = None
    session_id: Optional[str] = None
    expiry_period: Optional[str] = None


class IndicatorResponse(IndicatorBase):
    id: int
    product_uuid: str
    buyers: int
    created_at: datetime
    updated_at: datetime
    is_purchased: bool = False
    expiry: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class IndicatorDeleteResponse(BaseModel):
    message: str = "Indicator deleted successfully"


class IndicatorUserResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    email: str
    indicator_id: int
    expiry: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AddIndicatorUserRequest(BaseModel):
    user_id: int