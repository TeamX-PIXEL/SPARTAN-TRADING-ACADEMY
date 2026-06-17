from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    UserID: str
    UserName: str
    email: EmailStr
    password: str
    tvid: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    UserUUID: str
    UserID: str
    UserName: str
    email: EmailStr
    tvid: Optional[str] = None
    is_verified: bool = False

    model_config = ConfigDict(from_attributes=True)


class VerifyEmailRequest(BaseModel):
    token: str
    type: str = "user"


class ResendVerificationRequest(BaseModel):
    email: EmailStr
    type: str = "user"


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str