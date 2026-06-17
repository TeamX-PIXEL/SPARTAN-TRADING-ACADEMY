from pydantic import BaseModel, ConfigDict
from datetime import datetime


class PurchaseCreate(BaseModel):
    product_section: int
    product_uuid: str
    cost: float


class PurchaseResponse(BaseModel):
    id: int
    product_section: int
    product_id: int
    user_id: int
    batch_list_id: int | None = None
    cost: float
    purchased_at: datetime
    expiry: datetime

    model_config = ConfigDict(from_attributes=True)