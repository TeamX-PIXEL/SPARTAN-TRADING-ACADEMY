from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class IndicatorBase(BaseModel):
    indicator_id: str
    title: str
    description: Optional[str] = None
    long_description: Optional[str] = None
    price: float = 0.0
    image: Optional[str] = None
    category: str = "General"
    features: Optional[list] = None
    script_type: str = "Pine Script (v6)"
    accuracy: Optional[str] = None
    timeframe: Optional[str] = None
    pine_id: Optional[str] = None
    session_id: Optional[str] = None
    status: str = Field(default="unavailable", description="Must be: unavailable, paused, or running")


class IndicatorCreate(IndicatorBase):
    pass


class IndicatorUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None
    features: Optional[list] = None
    script_type: Optional[str] = None
    accuracy: Optional[str] = None
    timeframe: Optional[str] = None
    pine_id: Optional[str] = None
    session_id: Optional[str] = None
    status: Optional[str] = Field(None, description="Must be: unavailable, paused, or running")


class IndicatorResponse(IndicatorBase):
    id: int
    purchased_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedIndicatorsResponse(BaseModel):
    indicators: list[IndicatorResponse]
    total: int
    skip: int
    limit: int


class IndicatorDeleteResponse(BaseModel):
    message: str = "Indicator deleted successfully"
    indicator_id: str


class IndicatorMemberCreate(BaseModel):
    username: str
    expiry: Optional[datetime] = None
    amount: float = 0
    method: Optional[str] = None


class IndicatorMemberUpdate(BaseModel):
    expiry: Optional[datetime] = None


class IndicatorMemberResponse(BaseModel):
    id: int
    username: str
    indicator_id: str
    expiry: Optional[datetime] = None
    joined_at: datetime
    name: str = ""
    email: str = ""
    discord_user_id: Optional[str] = None
    access_type: str = "free"

    model_config = ConfigDict(from_attributes=True)


class AddIndicatorMemberRequest(BaseModel):
    username: str
    indicator_id: str
