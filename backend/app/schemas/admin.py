from pydantic import BaseModel, EmailStr


class AdminCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class AdminLoginRequest(BaseModel):
    username: str
    password: str