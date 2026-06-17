import os
from urllib.parse import urlparse, unquote
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import get_settings

settings = get_settings()


def ensure_database_exists():
    db_url = settings.DATABASE_URL
    if not db_url.startswith("mysql"):
        return

    import mysql.connector

    parsed = urlparse(db_url)
    db_name = parsed.path.lstrip("/")
    if not db_name:
        return

    try:
        conn = mysql.connector.connect(
            host=parsed.hostname,
            port=parsed.port or 3306,
            user=parsed.username,
            password=unquote(parsed.password),
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Warning: Could not auto-create database: {e}")


ensure_database_exists()

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_connection():
    """Establish raw MySQL connection for the signals table."""
    import mysql.connector
    db_name = os.getenv("MYSQL_DATABASE", "trading_db")
    try:
        conn = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        cursor.close()
        conn.close()

        return mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=db_name
        )
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return None