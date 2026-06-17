import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///trading_platform.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-later")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    DB_TABLE_USERS: str = os.getenv("DB_TABLE_USERS", "signal_users")

    EVERGREEN_BOT_TOKEN: str = os.getenv("EVERGREEN_BOT_TOKEN", "")
    LEGACY_BOT_TOKEN: str = os.getenv("LEGACY_BOT_TOKEN", "")
    ALPHA_BOT_TOKEN: str = os.getenv("ALPHA_BOT_TOKEN", "")

    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Trading Alerts")

    BASE_URL: str = os.getenv("BASE_URL", "http://localhost:8000")


@lru_cache()
def get_settings() -> Settings:
    return Settings()