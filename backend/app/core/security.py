import hashlib
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone
from app.config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["scrypt", "bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pre_hashed = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
        return pwd_context.verify(pre_hashed, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pre_hashed = hashlib.sha256(password.encode('utf-8')).hexdigest()
    return pwd_context.hash(pre_hashed)


SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt