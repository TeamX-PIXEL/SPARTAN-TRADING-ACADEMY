from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    UserID: str
    firstname: str
    lastname: str
    email: EmailStr
    password: str
    tvid: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False


class UserResponse(BaseModel):
    UserID: str
    firstname: str
    lastname: str
    email: EmailStr
    tvid: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    telegram_user_id: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_user_id: Optional[str] = None
    discord_chat_id: Optional[str] = None
    is_verified: bool = False

    model_config = ConfigDict(from_attributes=True)


class SendOTPRequest(BaseModel):
    username: str
    firstname: str
    lastname: str
    email: EmailStr
    phone_number: str


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class CompleteRegistrationRequest(BaseModel):
    token: str
    password: str
    address: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class VerifyEmailRequest(BaseModel):
    token: str
    type: str = "user"


class ResendVerificationRequest(BaseModel):
    email: EmailStr
    type: str = "user"


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str


# ---------------------------------------------------------------------------
# Client Management schemas (Admin portal)
# ---------------------------------------------------------------------------

class ClientCreate(BaseModel):
    username: str
    firstname: str
    lastname: str
    email: EmailStr
    phone_number: Optional[str] = None
    tvid: Optional[str] = None
    telegram_user_id: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_user_id: Optional[str] = None
    discord_chat_id: Optional[str] = None
    password: Optional[str] = None


class ClientUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    tvid: Optional[str] = None
    telegram_user_id: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_user_id: Optional[str] = None
    discord_chat_id: Optional[str] = None
    password: Optional[str] = None


class ClientUserResponse(BaseModel):
    id: int
    UserID: str
    UserName: str
    email: str
    tvid: Optional[str] = None
    phone_number: Optional[str] = None
    telegram_user_id: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_user_id: Optional[str] = None
    discord_chat_id: Optional[str] = None
    is_verified: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserEnrolledProduct(BaseModel):
    member_id: int
    product_id: str
    title: str
    access_type: str
    joined_at: Optional[datetime] = None
    expiry: Optional[datetime] = None