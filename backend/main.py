import os
import json
import re
import urllib.parse
from urllib.parse import unquote
import asyncio
import uuid
import secrets
import string
import hmac
import hashlib
from datetime import datetime, date, timezone, timedelta
import calendar
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status, Header, Body, Request, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, or_, case
from pydantic import BaseModel
import jwt
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv
import uvicorn
import httpx
import mysql.connector
from werkzeug.security import generate_password_hash

# --- External Service Imports ---
from Tradingview.tradingview import tradingview

# --- Email Service ---
from email_service import send_verification_email, generate_verification_token, get_token_expiry

# --- Local Database & Schema Imports ---
from database import (
    SessionLocal, User, Course, Purchase,
    Lesson, CourseSchedule,
    CourseWaitlist, BatchTemplate, BatchList,
    Indicator, CourseProgress, IndicatorMember, Bot
)

from schemas import (
    UserCreate, UserLogin, UserResponse, UserPasswordUpdate,
    CourseCreate, CourseResponse, CourseUpdate,
    PurchaseCreate, PurchaseResponse,
    LessonCreate, LessonResponse, LessonUpdate,
    BatchListResponse, BatchTemplateCreate, BatchTemplateResponse, 
    ManualBatchCreate, BatchTemplateUpdate, BatchListUpdate, 
    CourseScheduleCreate, CourseScheduleUpdate, CourseScheduleResponse,IndicatorCreate, IndicatorUpdate, IndicatorResponse, IndicatorDeleteResponse,
    ProgressUpdate, UserProgressResponse, AdminUserProgress, BatchProgressSummary, ProgressSessionResponse,
    BatchParticipantResponse, UserSearchResult, AddParticipantRequest,
    IndicatorMemberResponse, AddIndicatorMemberRequest,
    PaginatedCoursesResponse, PublicCourseResponse, BotResponse, BotPublicResponse, BotUpdate
)

from security import create_access_token, get_password_hash, verify_password, SECRET_KEY, ALGORITHM
from werkzeug.security import check_password_hash
from pydantic import BaseModel
from datetime import timedelta

tv_handler = tradingview()
# Define the expected JSON payload
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminCreateRequest(BaseModel):
    username: str
    email: str
    password: str

        
# ==========================================
# INITIALIZATION & LIFESPAN
# ==========================================

# Load environment variables
load_dotenv()

DB_TABLE_USERS = os.getenv("DB_TABLE_USERS", "signal_users")
EVERGREEN_BOT_TOKEN = os.getenv("EVERGREEN_BOT_TOKEN")
LEGACY_BOT_TOKEN = os.getenv("LEGACY_BOT_TOKEN")
ALPHA_BOT_TOKEN = os.getenv("ALPHA_BOT_TOKEN")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    print("Executing startup tasks: Verifying tables and sample users...")
    create_tables()       
    insert_sample_users() 
    yield
    # Shutdown tasks
    print("Shutting down application...")

# Initialize App & TradingView
app = FastAPI(lifespan=lifespan)
tv = tradingview()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# ==========================================
# THUMBNAIL UPLOAD
# ==========================================
THUMBNAIL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "thumbnail")
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

app.mount("/thumbnail", StaticFiles(directory=THUMBNAIL_DIR), name="thumbnails")

# Mount miniapp folder for static assets
MINIAPP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "miniapp")
app.mount("/miniapp-static", StaticFiles(directory=MINIAPP_DIR), name="miniapp-static")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@app.post("/api/upload/thumbnail")
async def upload_thumbnail(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed.")
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size must be under 5MB.")
    
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    random_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(THUMBNAIL_DIR, random_name)
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    url = f"/thumbnail/{random_name}"
    return {"url": url, "filename": random_name}

# ==========================================
# PYDANTIC MODELS (TradingView)
# ==========================================
class PineIDList(BaseModel):
    pine_ids: List[str]

class AccessRequest(BaseModel):
    pine_ids: List[str]
    duration: Optional[str] = None

# ==========================================
# DEPENDENCIES & AUTHENTICATION
# ==========================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Validates the JWT and fetches the user from the SQLAlchemy database."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token structure")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_optional_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    """Like get_current_user but returns None for unauthenticated requests."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None

def get_current_admin(token: str = Depends(oauth2_scheme)):
    """Validates the JWT and ensures the user is an admin."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role") # We injected this during admin login
        
        # Strictly enforce that this token belongs to an admin
        if user_id is None or role != "admin":
            raise credentials_exception
            
        # Return a simple dictionary instead of a SQLAlchemy model
        return {"id": user_id, "username": payload.get("username"), "role": role}
        
    except jwt.PyJWTError:
        raise credentials_exception
        
# ==========================================
# RAW SQL DATABASE HELPERS 
# ==========================================

def get_db_connection():
    """Establish raw MySQL connection for the signals table. Auto-creates DB if missing."""
    db_name = os.getenv("MYSQL_DATABASE", "trading_db")
    try:
        # First connect without specifying a database
        conn = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        cursor.close()
        conn.close()

        # Now connect to the database
        return mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=db_name
        )
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return None

def create_tables():
    """Create necessary database tables from an external schema file."""
    connection = get_db_connection()
    if connection is None:
        return False

    cursor = connection.cursor()
    try:
        with open('schema.sql', 'r') as file:
            sql_script = file.read()

        for statement in sql_script.split(';'):
            if statement.strip():
                cursor.execute(statement)

        connection.commit()
        print("Tables verified/created successfully.")

        try_add_last_login_column(cursor)
        run_email_verification_migrations(cursor)
        connection.commit()

        return True
    except mysql.connector.Error as err:
        print(f"Error creating tables: {err}")
        return False
    except FileNotFoundError:
        print("schema.sql not found. Skipping table creation.")
        return False
    finally:
        cursor.close()
        connection.close()


def try_add_last_login_column(cursor):
    """Idempotent migration: add users.last_login if it doesn't already exist."""
    try:
        cursor.execute("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'last_login'")
        if cursor.fetchone() is not None:
            return
        cursor.execute("ALTER TABLE users ADD COLUMN last_login DATETIME NULL")
        print("Migration applied: added users.last_login column.")
    except mysql.connector.Error as err:
        if err.errno == 1060:
            return
        print(f"Migration check for users.last_login failed: {err}")


def run_email_verification_migrations(cursor):
    """Idempotent migrations: add email verification columns to admin_users and users tables."""
    migrations = [
        # admin_users table
        ("admin_users", "email", "VARCHAR(255) UNIQUE"),
        ("admin_users", "is_verified", "BOOLEAN DEFAULT FALSE"),
        ("admin_users", "verification_token", "VARCHAR(255) NULL"),
        ("admin_users", "token_expires_at", "DATETIME NULL"),
        ("admin_users", "updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        # users table (raw SQL side, for signal_users or any raw SQL users table)
        ("users", "is_verified", "BOOLEAN DEFAULT FALSE"),
        ("users", "verification_token", "VARCHAR(255) NULL"),
        ("users", "token_expires_at", "DATETIME NULL"),
    ]
    
    for table, column, col_type in migrations:
        try:
            cursor.execute(f"""
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = DATABASE() 
                AND table_name = '{table}' 
                AND column_name = '{column}'
            """)
            if cursor.fetchone() is None:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
                print(f"Migration applied: added {table}.{column} column.")
        except mysql.connector.Error as err:
            if err.errno == 1060:
                continue
            print(f"Migration check for {table}.{column} failed: {err}")


def get_matching_users(symbol: str, timeframe: str, trend: str, zone: bool, entry_type: str, modifiers: dict, model: str) -> List[dict]:
    connection = get_db_connection()
    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:
        if model == "Evergreen":
            prefix = "Evergreen"
        elif model == "Legacy":
            prefix = "Legacy"
        elif model == "Alpha":
            prefix = "Alpha"
        else:
            print(f"Unknown model: {model}")
            return []

        clean_symbol = symbol.rstrip('1!') if symbol.endswith('1!') else symbol if symbol else ""
        if not clean_symbol:
            print("Warning: Missing symbol in payload")
        
        trend_col = f"{prefix}_Bull" if trend == "Bullish" else f"{prefix}_Bear" if trend == "Bearish" else None
        if trend_col is None:
            print(f"Unknown trend: {trend}")
            return []

        query = f"""
        SELECT * FROM {DB_TABLE_USERS} 
        WHERE telegram_id IS NOT NULL
        AND telegram_id != ''
        AND {prefix}_Expiry >= CURDATE()
        AND {prefix}_Access = TRUE
        AND `{prefix}_{clean_symbol}` = TRUE
        AND `{prefix}_{timeframe}` = TRUE
        AND `{trend_col}` = TRUE
        """

        if entry_type:
            if model == "Evergreen" and entry_type in ["LCY", "LCY_Sweep", "Legacy_CR"]:
                return []
            elif model == "Legacy" and entry_type in ["BRK", "CISD", "CISD_PCL", "Evergreen_CR"]:
                return []
            elif model == "Alpha" and entry_type in ["Legacy_CR"]:
                return []
            query += f" AND `{entry_type}` = TRUE"

        if not zone:
            query += f" AND {prefix}_Zone = FALSE"
            
        if entry_type in ["Evergreen_CR", "Legacy_CR"]:
            if not modifiers.get('has_op'):
                query += f" AND {entry_type}_OP = FALSE"
            if model == "Legacy":
                if not modifiers.get('has_first_class'):
                    query += f" AND {entry_type}_First_Class = FALSE"
                if not modifiers.get('has_tpr'):
                    query += f" AND {entry_type}_TPR = FALSE"

        if entry_type and entry_type not in ["Evergreen_CR", "Legacy_CR"]:
            entry_prefix = entry_type
            if not modifiers.get('has_op'):
                query += f" AND {entry_prefix}_OP = FALSE"
            if not modifiers.get('has_swing_smt'):
                query += f" AND {entry_prefix}_Swing_SMT = FALSE"
            
            strength = modifiers.get('swing_strength')
            is_swing_strong_sql = "TRUE" if strength == 'Strong' else "FALSE"
            is_swing_weak_sql = "TRUE" if strength == 'Weak' else "FALSE"
            query += f" AND (({is_swing_strong_sql} AND {entry_prefix}_Swing_Strong_SMT_BUY = TRUE) OR ({is_swing_weak_sql} AND {entry_prefix}_Swing_Weak_SMT_SELL = TRUE) OR ({entry_prefix}_Swing_Strong_SMT_BUY = FALSE AND {entry_prefix}_Swing_Weak_SMT_SELL = FALSE))"

            if not modifiers.get('has_mitigation_smt'):
                query += f" AND {entry_prefix}_Mitigation_SMT = FALSE"
            
            mit_strength = modifiers.get('mitigation_strength')
            is_mit_strong_sql = "TRUE" if mit_strength == 'Strong' else "FALSE"
            is_mit_weak_sql = "TRUE" if mit_strength == 'Weak' else "FALSE"
            query += f" AND (({is_mit_strong_sql} AND {entry_prefix}_Mitigation_Strong_SMT_BUY = TRUE) OR ({is_mit_weak_sql} AND {entry_prefix}_Mitigation_Weak_SMT_SELL = TRUE) OR ({entry_prefix}_Mitigation_Strong_SMT_BUY = FALSE AND {entry_prefix}_Mitigation_Weak_SMT_SELL = FALSE))"
            
            if model == "Legacy" and entry_prefix in ["LCY", "LCY_Sweep"]:
                if not modifiers.get('has_first_class'):
                    query += f" AND {entry_prefix}_First_Class = FALSE"
                if not modifiers.get('has_tpr'):
                    query += f" AND {entry_prefix}_TPR = FALSE"

        cursor.execute(query)
        users = cursor.fetchall()
        return users
    except mysql.connector.Error as err:
        print(f"Error fetching matching users: {err}")
        return []
    finally:
        cursor.close()
        connection.close()

def insert_sample_users():
    connection = get_db_connection()
    if connection is None: return
    cursor = connection.cursor()
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {DB_TABLE_USERS}")
        if cursor.fetchone()[0] == 0:
            sample_users = [('TeamX_PIXEL', '1868335946', '2026-10-30', '2026-10-30', None), ('Spartaruban', '716745736', '2026-09-30', '2026-09-30', None)]
            cursor.executemany(f"INSERT INTO {DB_TABLE_USERS} (user, telegram_id, Evergreen_Expiry, Legacy_Expiry, Alpha_Expiry) VALUES (%s, %s, %s, %s, %s)", sample_users)
            connection.commit()
            print("Sample users inserted successfully")

        cursor.execute("SELECT COUNT(*) FROM admin_users")
        if cursor.fetchone()[0] == 0:
            admin_password = generate_password_hash('admin123')
            cursor.execute("INSERT INTO admin_users (username, password_hash) VALUES (%s, %s)", ('admin', admin_password))
            connection.commit()
            print("Default admin user created")
    except mysql.connector.Error as err:
        print(f"Error inserting sample data: {err}")
    finally:
        cursor.close()
        connection.close()

# ==========================================
# ASYNC NETWORK HELPERS
# ==========================================

async def send_telegram_notifications(message: str, matching_users: List[dict], bot_token: str):
    encoded_message = urllib.parse.quote(message)
    async with httpx.AsyncClient(timeout=10.0) as client:
        current_batch = matching_users.copy()
        batch_number = 1
        
        while batch_number <= 3 and current_batch:
            tasks = []
            for user in current_batch:
                chat_id = user['telegram_id']
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage?chat_id={chat_id}&text={encoded_message}"
                tasks.append(client.get(url))
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            next_batch = []
            for i, response in enumerate(responses):
                user = current_batch[i]
                if isinstance(response, httpx.Response) and response.status_code == 200:
                    continue
                else:
                    next_batch.append(user)
                    error_msg = f"status {response.status_code}" if isinstance(response, httpx.Response) else str(response)
                    print(f"Batch {batch_number}: Failed for {user.get('user', 'Unknown')} ({user.get('telegram_id')}) - {error_msg}")
            
            current_batch = next_batch
            batch_number += 1
            if current_batch and batch_number <= 3:
                await asyncio.sleep(1)

async def send_telegram_reply(chat_id: str, text: str, bot_token: str) -> bool:
    encoded_text = urllib.parse.quote(text)
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage?chat_id={chat_id}&text={encoded_text}"
    print(f"DEBUG: Sending reply to {chat_id}: {text[:50]}...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            print(f"DEBUG: Telegram response: {response.status_code} - {response.text}")
            return response.status_code == 200
    except Exception as e:
        print(f"Error sending reply: {e}")
        return False

async def send_telegram_inline_keyboard(
    chat_id: str, text: str, buttons: list, bot_token: str
) -> bool:
    """
    Send a message with inline keyboard buttons.
    buttons: list of list of dicts, e.g. [[{'text':'Yes','callback_data':'yes'}]]
    """
    payload = {
        "chat_id": chat_id,
        "text": text,
        "reply_markup": {"inline_keyboard": buttons},
    }
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    print(f"DEBUG: Sending inline keyboard to {chat_id}: {text[:50]}...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            print(f"DEBUG: Telegram keyboard response: {response.status_code} - {response.text}")
            return response.status_code == 200
    except Exception as e:
        print(f"Error sending inline keyboard: {e}")
        return False

async def answer_callback_query(callback_query_id: str, bot_token: str, text: str = None) -> bool:
    """Answer a Telegram callback query to remove the loading state."""
    payload = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
        payload["show_alert"] = True
    url = f"https://api.telegram.org/bot{bot_token}/answerCallbackQuery"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            return response.status_code == 200
    except Exception as e:
        print(f"Error answering callback query: {e}")
        return False

async def delete_telegram_message(chat_id: str, message_id: int, bot_token: str) -> bool:
    """Delete a Telegram message."""
    url = f"https://api.telegram.org/bot{bot_token}/deleteMessage"
    payload = {"chat_id": chat_id, "message_id": message_id}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            return response.status_code == 200
    except Exception as e:
        print(f"Error deleting message: {e}")
        return False

def get_user_status_message(user: dict) -> str:
    msg = "📊 *Your Subscription Status*\n\n"
    today = date.today()
    models = []
    
    if user.get('Evergreen_Access') and user.get('Evergreen_Expiry') and user['Evergreen_Expiry'] >= today:
        models.append(f"✅ *Evergreen* - Expires: {user['Evergreen_Expiry']}")
    else:
        msg += "❌ *Evergreen* - Not Active\n"
    
    if user.get('Legacy_Access') and user.get('Legacy_Expiry') and user['Legacy_Expiry'] >= today:
        models.append(f"✅ *Legacy* - Expires: {user['Legacy_Expiry']}")
    else:
        msg += "❌ *Legacy* - Not Active\n"
    
    if user.get('Alpha_Access') and user.get('Alpha_Expiry') and user['Alpha_Expiry'] >= today:
        models.append(f"✅ *Alpha* - Expires: {user['Alpha_Expiry']}")
    else:
        msg += "❌ *Alpha* - Not Active\n"
    
    if models:
        msg += "\n".join(models)
    
    msg += "\n\n🌐 Manage filters: https://spartantradingacademy.com/miniapp"
    return msg



@app.post("/api/admin/login")
async def admin_login(credentials: AdminLoginRequest):
    """Authenticates an admin and returns a JWT token"""
    connection = get_db_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection error")
    
    cursor = connection.cursor(dictionary=True)
    try:
        # Fetch the admin user
        cursor.execute("SELECT * FROM admin_users WHERE username = %s", (credentials.username,))
        admin = cursor.fetchone()
        
        # Verify user exists and password matches
        if not admin or not check_password_hash(admin['password_hash'], credentials.password):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Check if email is verified
        if not admin.get('is_verified'):
            # Check if token expired and allow resend
            if admin.get('token_expires_at') and admin['token_expires_at'] < datetime.now(timezone.utc):
                # Generate new token
                new_token = generate_verification_token()
                new_expiry = get_token_expiry()
                cursor.execute(
                    "UPDATE admin_users SET verification_token = %s, token_expires_at = %s WHERE id = %s",
                    (new_token, new_expiry, admin['id'])
                )
                connection.commit()
                send_verification_email(admin['email'], new_token, 'admin')
            
            raise HTTPException(
                status_code=403,
                detail="Email not verified. Please check your inbox and verify your email before logging in."
            )
        
        # Generate the JWT Access Token (Expires in 2 hours)
        access_token = create_access_token(
            data={"sub": str(admin['id']), "role": "admin", "username": admin['username']}
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        connection.close()

@app.post("/api/admin/register")
async def admin_register(request: AdminCreateRequest):
    """Register a new admin with email verification."""
    connection = get_db_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection error")
    
    cursor = connection.cursor(dictionary=True)
    try:
        # Check if username or email already exists
        cursor.execute("SELECT * FROM admin_users WHERE username = %s OR email = %s", (request.username, request.email))
        existing = cursor.fetchone()
        
        if existing:
            raise HTTPException(status_code=409, detail="Username or email already exists")
        
        # Hash password
        hashed_password = generate_password_hash(request.password)
        
        # Generate verification token
        verification_token = generate_verification_token()
        token_expires = get_token_expiry()
        
        # Insert new admin
        cursor.execute(
            """
            INSERT INTO admin_users (username, email, password_hash, is_verified, verification_token, token_expires_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (request.username, request.email, hashed_password, False, verification_token, token_expires)
        )
        connection.commit()
        
        # Send verification email
        email_sent = send_verification_email(request.email, verification_token, 'admin')
        if not email_sent:
            print(f"Warning: Failed to send verification email to {request.email}")
        
        return {
            "success": True,
            "message": "Admin registered successfully! Please check your email to verify your account before logging in."
        }
        
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        connection.close()

# ==========================================
# PUBLIC WEBHOOK ROUTES 
# ==========================================

@app.post('/webhook')
async def webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        content_type = request.headers.get('content-type', '')
        if not (content_type.startswith('application/json') or content_type.startswith('text/plain')):
            print(f"Error: Invalid Content-Type: {content_type}")
            return PlainTextResponse("Error: Content-Type must be application/json or text/plain", status_code=415)

        raw_data = await request.body()
        if not raw_data:
            print("Error: Empty payload received")
            return PlainTextResponse("Error: Empty payload", status_code=400)

        try:
            if content_type.startswith('application/json'):
                data = await request.json()
            else:
                raw_str = raw_data.decode("utf-8")
                try:
                    data = json.loads(raw_str)
                except json.JSONDecodeError:
                    data = {"message": raw_str}
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON payload: {e}")
            return PlainTextResponse("Error: Invalid JSON payload", status_code=400)

        if not data or not isinstance(data, dict):
            return PlainTextResponse("Error: No valid JSON data", status_code=400)

        message = data.get('message', 'No message received')
        
        lines = message.split('\n')
        parsed = {}
        for line in lines:
            separator = '»' if '»' in line else ':' if ':' in line else None
            if separator:
                key, value = line.split(separator, 1)
                key, value = key.strip(), value.strip()
                
                if 'Symbol' in key or '𝐒𝐘𝐌𝐁𝐎𝐋' in key: parsed['Symbol'] = value
                elif 'Signal' in key or '𝐒𝐈𝐆𝐍𝐀𝐋' in key: parsed['Signal'] = value
                elif 'Timeframe' in key or '𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄' in key: parsed['Timeframe'] = value
                elif 'Trend' in key or '𝐓𝐑𝐄𝐍𝐃' in key: parsed['Trend'] = value
                elif 'Class' in key or '𝐂𝐋𝐀𝐒𝐒' in key: parsed['Class'] = value
                elif 'Zone' in key or '𝐙𝐎𝐍𝐄' in key: parsed['Zone'] = value
                elif 'Model' in key or '𝐌𝐨𝐝𝐞𝐥' in key: parsed['Model'] = value
                elif 'Swing SMT' in key or '𝐒𝐰𝐢𝐧𝐠 𝐒𝐌𝐓' in key: parsed['Swing SMT'] = value
                elif 'Mitigation SMT' in key or '𝐌𝐢𝐭𝐢𝐠𝐚𝐭𝐢𝐨𝐧 𝐒𝐌𝐓' in key: parsed['Mitigation SMT'] = value
                else:
                    normalized_key = re.sub(r'^\s*[\W_]+', '', key).strip()
                    parsed[normalized_key] = value

        symbol, signal, timeframe = parsed.get('Symbol'), parsed.get('Signal'), parsed.get('Timeframe')
        trend, Class, zone, model = parsed.get('Trend'), parsed.get('Class'), parsed.get('Zone'), parsed.get('Model')

        swing_smt_strength = parsed.get('Swing SMT')
        mitigation_smt_strength = parsed.get('Mitigation SMT')

        if not swing_smt_strength:
            if "🚀 Swing SMT : Strong" in message or "⚡️ 𝐒𝐰𝐢𝐧𝐠 𝐒𝐌𝐓 » Strong" in message: swing_smt_strength = "Strong"
            elif "🚀 Swing SMT : Weak" in message or "⚡️ 𝐒𝐰𝐢𝐧𝐠 𝐒𝐌𝐓 » Weak" in message: swing_smt_strength = "Weak"

        if not mitigation_smt_strength:
            if "🚀 Mitigation SMT : Strong" in message or "⚡️ 𝐌𝐢𝐭𝐢𝐠𝐚𝐭𝐢𝐨𝐧 𝐒𝐌𝐓 » Strong" in message: mitigation_smt_strength = "Strong"
            elif "🚀 Mitigation SMT : Weak" in message or "⚡️ 𝐌𝐢𝐭𝐢𝐠𝐚𝐭𝐢𝐨𝐧 𝐒𝐌𝐓 » Weak" in message: mitigation_smt_strength = "Weak"

        entry_type = None
        if signal and "Candlestick Rejection (CR)" in signal:
            entry_type = "Legacy_CR" if model == "Legacy" else "Evergreen_CR"
            shifts = {
                "Timeframe : 1M": "Timeframe : 15M", "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 1M": "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 15M",
                "Timeframe : 5M": "Timeframe : 1H",  "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 5M": "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 1H",
                "Timeframe : 15M": "Timeframe : 4H", "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 15M": "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 4H",
                "Timeframe : 1H": "Timeframe : 1D",  "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 1H": "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 1D",
                "Timeframe : 4H": "Timeframe : 1W",  "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 4H": "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 1W",
                "Timeframe : 1D": "Timeframe : 1MN", "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 1D": "𝐓𝐈𝐌𝐄𝐅𝐑𝐀𝐌𝐄 » 1MN"
            }
            for old, new in shifts.items():
                if old in message: message = message.replace(old, new)

        elif signal and "Tagged with BRK" in signal: entry_type = "BRK"
        elif signal and ("Tagged with CISD (pcl)" in signal or "Tagged with CISD (pch)" in signal): entry_type = "CISD_PCL"
        elif signal and "Tagged with CISD" in signal: entry_type = "CISD"
        elif signal and "Tagged with LCY" in signal: entry_type = "LCY"
        elif signal and "Tagged with LCY Sweep" in signal: entry_type = "LCY_Sweep"

        modifiers = {
            'has_cr': bool(signal and "CR" in signal),
            'has_first_class': bool(Class and "First Class" in Class),
            'has_tpr': bool(signal and "TPR" in signal),
            'has_op': bool(signal and "OP" in signal),
            'has_swing_smt': bool(signal and "Swing SMT" in signal),
            'has_mitigation_smt': bool(signal and "Mitigation SMT" in signal),
            'swing_strength': swing_smt_strength,
            'mitigation_strength': mitigation_smt_strength
        }

        matching_users = get_matching_users(symbol, timeframe, trend, zone, entry_type, modifiers, model)

        if matching_users:
            cleaned_message = '\n'.join([line for line in message.split('\n') if not line.strip().startswith('Model')])
            target_bot_token = LEGACY_BOT_TOKEN if model == "Legacy" else ALPHA_BOT_TOKEN if model == "Alpha" else EVERGREEN_BOT_TOKEN
            background_tasks.add_task(send_telegram_notifications, cleaned_message, matching_users, target_bot_token)

        return PlainTextResponse("Success", status_code=200)

    except Exception as e:
        print(f"Error: {e}")
        return PlainTextResponse("Error", status_code=500)

@app.post('/telegram_user_webhook')
async def telegram_user_webhook(request: Request):
    try:
        data = await request.json()
        if not data:
            return PlainTextResponse("Error: No data", status_code=400)
        
        print(f"DEBUG: Webhook received: {data}")
        
        # Handle callback queries (inline keyboard button presses)
        callback_query = data.get('callback_query')
        if callback_query:
            cq_id = callback_query.get('id')
            cq_data = callback_query.get('data', '')
            chat_id = callback_query.get('message', {}).get('chat', {}).get('id')
            
            if cq_data.startswith('connect_yes:') or cq_data.startswith('connect_no:'):
                parts = cq_data.split(':')
                action = parts[0]
                user_id = parts[1] if len(parts) > 1 else None
                
                connection = get_db_connection()
                if not connection:
                    await answer_callback_query(cq_id, EVERGREEN_BOT_TOKEN, "Database error")
                    return PlainTextResponse("Error", status_code=500)
                
                cursor = connection.cursor(dictionary=True)
                try:
                    # Get the message ID of the inline keyboard to delete it
                    message_id = callback_query.get('message', {}).get('message_id')
                    
                    if action == 'connect_yes' and user_id:
                        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE id = %s", (user_id,))
                        key_user = cursor.fetchone()
                        
                        if key_user:
                            if key_user.get('telegram_id') and str(key_user['telegram_id']) == str(chat_id):
                                await answer_callback_query(cq_id, EVERGREEN_BOT_TOKEN)
                                await send_telegram_reply(chat_id, "✅ You are already connected!", EVERGREEN_BOT_TOKEN)
                            elif key_user.get('telegram_id'):
                                await answer_callback_query(cq_id, EVERGREEN_BOT_TOKEN)
                                await send_telegram_reply(chat_id, "⚠️ This account is already linked to another Telegram account. Please contact support.", EVERGREEN_BOT_TOKEN)
                            else:
                                # Only update telegram_id, NOT user field
                                cursor.execute(f"UPDATE {DB_TABLE_USERS} SET telegram_id = %s WHERE id = %s", (str(chat_id), user_id))
                                connection.commit()
                                await answer_callback_query(cq_id, EVERGREEN_BOT_TOKEN, "✅ Connected successfully!")
                                await send_telegram_reply(chat_id, "✅ Successfully linked your account!\n\n" + get_user_status_message(key_user), EVERGREEN_BOT_TOKEN)
                        else:
                            await answer_callback_query(cq_id, EVERGREEN_BOT_TOKEN, "User not found")
                    elif action == 'connect_no':
                        await answer_callback_query(cq_id, EVERGREEN_BOT_TOKEN)
                        await send_telegram_reply(chat_id, "❌ Connection cancelled. You can link your account anytime by using /start with your key.", EVERGREEN_BOT_TOKEN)
                    
                    # Delete the confirmation message after Yes/No response
                    if message_id:
                        await delete_telegram_message(str(chat_id), message_id, EVERGREEN_BOT_TOKEN)
                except Exception as e:
                    print(f"Error handling callback query: {e}")
                    await answer_callback_query(cq_id, EVERGREEN_BOT_TOKEN, "An error occurred")
                finally:
                    cursor.close()
                    connection.close()
                
                return PlainTextResponse("OK", status_code=200)
        
        # Handle regular messages
        message = data.get('message') or data.get('edited_message')
        if not message:
            return PlainTextResponse("OK", status_code=200)
        
        chat_id = message.get('chat', {}).get('id')
        text = message.get('text', '').strip()
        from_user = message.get('from', {})
        username = from_user.get('username') or from_user.get('first_name', '')
        
        if not chat_id or not text:
            return PlainTextResponse("OK", status_code=200)
        
        connection = get_db_connection()
        if not connection:
            return PlainTextResponse("Error: DB connection failed", status_code=500)
        
        try:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE telegram_id = %s", (str(chat_id),))
            user = cursor.fetchone()
            
            text_lower = text.lower()
            today = date.today()
            
            # Handle /start with optional API key
            if text_lower.startswith('/start'):
                parts = text.split()
                if len(parts) > 1:
                    # /start <api_key>
                    api_key = parts[1]
                    # Validate API key format (XXXX-XXXX-XXXX-XXXX)
                    if len(api_key) == 19 and api_key.replace('-', '').isalnum() and api_key.count('-') == 3:
                        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE user_key = %s", (api_key,))
                        key_user = cursor.fetchone()
                        
                        if not key_user:
                            reply = "❌ Invalid key. Please check your key and try again."
                            await send_telegram_reply(chat_id, reply, EVERGREEN_BOT_TOKEN)
                        else:
                            if key_user.get('telegram_id') and str(key_user['telegram_id']) == str(chat_id):
                                reply = "✅ You are already connected!"
                                await send_telegram_reply(chat_id, reply, EVERGREEN_BOT_TOKEN)
                            elif key_user.get('telegram_id'):
                                reply = "⚠️ This account is already linked to another Telegram account. Please contact support."
                                await send_telegram_reply(chat_id, reply, EVERGREEN_BOT_TOKEN)
                            else:
                                # Ask for confirmation with inline keyboard
                                confirm_text = "🔗 *Connect Account*\n\nWould you like to connect your bot with this Telegram account?"
                                buttons = [
                                    [
                                        {"text": "✅ Yes", "callback_data": f"connect_yes:{key_user['id']}"},
                                        {"text": "❌ No", "callback_data": f"connect_no:{key_user['id']}"}
                                    ]
                                ]
                                await send_telegram_inline_keyboard(chat_id, confirm_text, buttons, EVERGREEN_BOT_TOKEN)
                    else:
                        reply = "❌ Invalid key format. Your key should look like: ABCD-EFGH-IJKL-MNOP"
                        await send_telegram_reply(chat_id, reply, EVERGREEN_BOT_TOKEN)
                else:
                    # Plain /start
                    if user:
                        has_active = any(
                            user.get(f'{m}_Access') and user.get(f'{m}_Expiry') and user[f'{m}_Expiry'] >= today 
                            for m in ['Evergreen', 'Legacy', 'Alpha']
                        )
                        reply = get_user_status_message(user) if has_active else "⚠️ Your subscription has expired. Please contact support to renew."
                    else:
                        reply = "🔑 Welcome! Please enter your 16-digit access key to link your account."
                    
                    await send_telegram_reply(chat_id, reply, EVERGREEN_BOT_TOKEN)
            
            # Handle plain 16-digit key entry (existing behavior)
            elif len(text.replace('-', '')) == 16 and text.replace('-', '').isalnum():
                cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE REPLACE(user_key, '-', '') = %s", (text.replace('-', ''),))
                key_user = cursor.fetchone()
                
                if not key_user:
                    reply = "❌ Invalid key. Please check your key and try again."
                    await send_telegram_reply(chat_id, reply, EVERGREEN_BOT_TOKEN)
                else:
                    if key_user.get('telegram_id') and str(key_user['telegram_id']) == str(chat_id):
                        reply = "✅ You are already logged in!"
                    elif key_user.get('telegram_id'):
                        reply = "⚠️ This key is already linked to another Telegram account. Please contact support."
                    else:
                        # Only update telegram_id, NOT user field
                        cursor.execute(f"UPDATE {DB_TABLE_USERS} SET telegram_id = %s WHERE id = %s", (str(chat_id), key_user['id']))
                        connection.commit()
                        
                        reply = "✅ Successfully linked your account!\n\n" + get_user_status_message(key_user)
                
                await send_telegram_reply(chat_id, reply, EVERGREEN_BOT_TOKEN)
            
            elif user:
                has_active = any(
                    user.get(f'{m}_Access') and user.get(f'{m}_Expiry') and user[f'{m}_Expiry'] >= today 
                    for m in ['Evergreen', 'Legacy', 'Alpha']
                )
                reply = get_user_status_message(user) if has_active else "⚠️ Your subscription has expired. Please contact support to renew."
                await send_telegram_reply(chat_id, reply, EVERGREEN_BOT_TOKEN)
            
        except Exception as e:
            print(f"Error in telegram_user_webhook: {e}")
            return PlainTextResponse("Error", status_code=500)
        finally:
            cursor.close()
            connection.close()
        
        return PlainTextResponse("OK", status_code=200)
        
    except Exception as e:
        print(f"Error: {e}")
        return PlainTextResponse("Error", status_code=500)

# ==========================================
# PROTECTED ADMIN ROUTES (Requires JWT)
# ==========================================

@app.get('/api/users')
# 1. CHANGE THIS LINE: Use get_current_admin instead of get_current_user
async def get_users_api(current_admin: dict = Depends(get_current_admin)):
    """Get all users from database (Admin Only)"""
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={'success': False, 'message': 'Database connection error'}, status_code=500)
    
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS}")
        users = cursor.fetchall()
        encoded_users = jsonable_encoder(users)
        return JSONResponse(content={'success': True, 'count': len(users), 'users': encoded_users})
    except mysql.connector.Error as err:
        return JSONResponse(content={'success': False, 'message': str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@app.get('/api/users/{user_id}')
async def get_single_user_api(user_id: int, current_admin: dict = Depends(get_current_admin)):
    """Fetch a single user's data to populate the React Edit form"""
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={'success': False, 'message': 'Database connection error'}, status_code=500)

    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()

        if user_data is None:
            raise HTTPException(status_code=404, detail="User not found")

        encoded_user_data = jsonable_encoder(user_data)
        return JSONResponse(content={'success': True, 'user': encoded_user_data}, status_code=200)
    except mysql.connector.Error as err:
        return JSONResponse(content={'success': False, 'message': str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()

@app.post('/api/users')
async def add_user_api(request: Request, current_admin: dict = Depends(get_current_admin)):
    """Add a new user to database (supports all fields)"""
    data = await request.json()
    if not data:
        return JSONResponse(content={'success': False, 'message': 'No data provided'}, status_code=400)
    
    user = data.get('user') or None
    telegram_id = data.get('telegram_id') or None
    user_key = data.get('user_key', '')
    
    evergreen_expiry = data.get('evergreen_expiry', '2099-12-31')
    legacy_expiry = data.get('legacy_expiry', '2099-12-31')
    alpha_expiry = data.get('alpha_expiry', '2099-12-31')
    
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={'success': False, 'message': 'Database connection error'}, status_code=500)
    
    cursor = connection.cursor()
    try:
        if telegram_id:
            cursor.execute(f"SELECT COUNT(*) FROM {DB_TABLE_USERS} WHERE telegram_id = %s", (telegram_id,))
            if cursor.fetchone()[0] > 0:
                return JSONResponse(content={'success': False, 'message': 'Telegram ID already exists'}, status_code=409)
        
        symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'EURCAD', 'GBPCAD',
                  'EURNZD', 'GBPNZD', 'EURAUD', 'GBPAUD', 'AUDUSD', 'NZDUSD', 'AUDJPY', 'NZDJPY', 'AUDCHF',
                  'NZDCHF', 'AUDCAD', 'NZDCAD', 'USDCHF', 'USDCAD', 'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL',
                  'BTCUSD', 'ETHUSD', 'BTCUSDT', 'ETHUSDT', 'NAS100', 'SPX500', 'US30', 'DXY', 'BANKNIFTY',
                  'NIFTY', 'YM', 'NQ', 'MYM', 'MNQ', 'MCL', 'MRB', 'MES', 'CL', 'RB', 'GC', 'SI', '6E', '6B',
                  '6A', '6N', 'BTC', 'ETH', 'ES']
        
        timeframes = ['1M', '5M', '15M', '1H', '4H', '1D']
        
        columns = ['user_key', 'user', 'telegram_id', 'Evergreen_Expiry', 'Legacy_Expiry', 'Alpha_Expiry', 
                  'Evergreen_Access', 'Legacy_Access', 'Alpha_Access']
        values = [user_key, user, telegram_id, evergreen_expiry, legacy_expiry, alpha_expiry,
                 data.get('evergreen_access', 1), data.get('legacy_access', 0), data.get('alpha_access', 0)]
        placeholders = ['%s'] * len(columns)
        
        user_symbols = data.get('symbols', {})
        user_timeframes = data.get('timeframes', {})
        user_trends = data.get('trends', {})
        user_entries = data.get('entries', [])
        
        for symbol in symbols:
            for prefix in ['Evergreen', 'Legacy', 'Alpha']:
                col_name = f'{prefix}_{symbol}'
                columns.append(col_name)
                enabled = symbol in user_symbols.get(prefix.lower(), []) if prefix.lower() in user_symbols else 0
                values.append(1 if enabled else 0)
                placeholders.append('%s')
        
        for tf in timeframes:
            for prefix in ['Evergreen', 'Legacy', 'Alpha']:
                col_name = f'{prefix}_{tf}'
                columns.append(col_name)
                enabled = tf in user_timeframes.get(prefix.lower(), []) if prefix.lower() in user_timeframes else 0
                values.append(1 if enabled else 0)
                placeholders.append('%s')
        
        for prefix in ['Evergreen', 'Legacy', 'Alpha']:
            prefix_lower = prefix.lower()
            columns.extend([f'{prefix}_Bull', f'{prefix}_Bear', f'{prefix}_Zone'])
            trend_data = user_trends.get(prefix_lower, {})
            values.extend([
                1 if trend_data.get('bull', False) else 0,
                1 if trend_data.get('bear', False) else 0,
                1 if trend_data.get('zone', False) else 0
            ])
            placeholders.extend(['%s', '%s', '%s'])
        
        entry_types = ['CR', 'BRK', 'CISD', 'CISD_PCL', 'LCY', 'LCY_Sweep']
        for entry in entry_types:
            if entry in ['CR']:
                for pf in ['Evergreen', 'Legacy']:
                    col_name = f'{pf}_CR'
                    columns.append(col_name)
                    values.append(1 if entry in user_entries else 0)
                    placeholders.append('%s')
            else:
                columns.append(entry)
                values.append(1 if entry in user_entries else 0)
                placeholders.append('%s')
        
        query = f"INSERT INTO {DB_TABLE_USERS} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
        cursor.execute(query, values)
        connection.commit()
        
        return JSONResponse(content={'success': True, 'message': 'User added successfully', 'user_id': cursor.lastrowid}, status_code=201)
    except mysql.connector.Error as err:
        return JSONResponse(content={'success': False, 'message': str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()

@app.get('/api/user/{user_id}/details')
async def get_user_details_api(request: Request, current_admin: dict = Depends(get_current_admin)):
    """Get detailed user information."""
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={'success': False, 'message': 'Database error'}, status_code=500)
    
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        symbol_count = sum(1 for key in user.keys() if key.startswith('Evergreen_') and key not in ['Evergreen_Access', 'Evergreen_Expiry', 'Evergreen_Bull', 'Evergreen_Bear', 'Evergreen_Zone'] and not any(tf in key for tf in ['_1M', '_5M', '_15M', '_1H', '_4H', '_1D']) and user[key])
        user['symbol_count'] = symbol_count
        encoded_user = jsonable_encoder(user)
        return JSONResponse(content={'success': True, 'user': encoded_user})
    except Exception as e:
        return JSONResponse(content={'success': False, 'message': str(e)}, status_code=500)
    finally:
        cursor.close()
        connection.close()

@app.put('/api/users/{user_id}')
# 1. ADD `user_id: int` RIGHT HERE:
async def edit_user_api(user_id: int, request: Request, current_admin: dict = Depends(get_current_admin)):
    """Update an existing user in database (supports all fields)"""
    data = await request.json()
    if not data:
        return JSONResponse(content={'success': False, 'message': 'No data provided'}, status_code=400)
    
    user = data.get('user')
    telegram_id = data.get('telegram_id')
    user_key = data.get('user_key', '')
    
    # ... (the rest of your exact database code remains completely unchanged)

    
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={'success': False, 'message': 'Database connection error'}, status_code=500)
    
    cursor = connection.cursor()
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {DB_TABLE_USERS} WHERE telegram_id = %s AND id != %s", (telegram_id, user_id))
        if cursor.fetchone()[0] > 0:
            return JSONResponse(content={'success': False, 'message': 'Telegram ID already exists for another user'}, status_code=409)
            
        update_fields = [
            'user_key = %s', 'user = %s', 'telegram_id = %s', 
            'Evergreen_Expiry = %s', 'Legacy_Expiry = %s', 'Alpha_Expiry = %s',
            'Evergreen_Access = %s', 'Legacy_Access = %s', 'Alpha_Access = %s'
        ]
        values = [
            user_key, user, telegram_id, 
            data.get('evergreen_expiry', '2099-12-31'), data.get('legacy_expiry', '2099-12-31'), data.get('alpha_expiry', '2099-12-31'),
            data.get('evergreen_access', 1), data.get('legacy_access', 0), data.get('alpha_access', 0)
        ]
        
        user_symbols = data.get('symbols', {})
        user_timeframes = data.get('timeframes', {})
        user_trends = data.get('trends', {})
        user_entries = data.get('entries', [])
        
        symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'EURCAD', 'GBPCAD',
                  'EURNZD', 'GBPNZD', 'EURAUD', 'GBPAUD', 'AUDUSD', 'NZDUSD', 'AUDJPY', 'NZDJPY', 'AUDCHF',
                  'NZDCHF', 'AUDCAD', 'NZDCAD', 'USDCHF', 'USDCAD', 'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL',
                  'BTCUSD', 'ETHUSD', 'BTCUSDT', 'ETHUSDT', 'NAS100', 'SPX500', 'US30', 'DXY', 'BANKNIFTY',
                  'NIFTY', 'YM', 'NQ', 'MYM', 'MNQ', 'MCL', 'MRB', 'MES', 'CL', 'RB', 'GC', 'SI', '6E', '6B',
                  '6A', '6N', 'BTC', 'ETH', 'ES']
        
        for symbol in symbols:
            for prefix in ['Evergreen', 'Legacy', 'Alpha']:
                col_name = f'{prefix}_{symbol}'
                update_fields.append(f'{col_name} = %s')
                enabled = symbol in user_symbols.get(prefix.lower(), []) if prefix.lower() in user_symbols else 0
                values.append(1 if enabled else 0)
        
        timeframes = ['1M', '5M', '15M', '1H', '4H', '1D']
        for tf in timeframes:
            for prefix in ['Evergreen', 'Legacy', 'Alpha']:
                col_name = f'{prefix}_{tf}'
                update_fields.append(f'{col_name} = %s')
                enabled = tf in user_timeframes.get(prefix.lower(), []) if prefix.lower() in user_timeframes else 0
                values.append(1 if enabled else 0)
        
        for prefix in ['Evergreen', 'Legacy', 'Alpha']:
            prefix_lower = prefix.lower()
            update_fields.extend([f'{prefix}_Bull = %s', f'{prefix}_Bear = %s', f'{prefix}_Zone = %s'])
            trend_data = user_trends.get(prefix_lower, {})
            values.extend([
                1 if trend_data.get('bull', False) else 0,
                1 if trend_data.get('bear', False) else 0,
                1 if trend_data.get('zone', False) else 0
            ])
        
        entry_types = ['CR', 'BRK', 'CISD', 'CISD_PCL', 'LCY', 'LCY_Sweep']
        for entry in entry_types:
            if entry == 'CR':
                for pf in ['Evergreen', 'Legacy']:
                    col_name = f'{pf}_CR'
                    update_fields.append(f'{col_name} = %s')
                    values.append(1 if entry in user_entries else 0)
            else:
                update_fields.append(f'{entry} = %s')
                values.append(1 if entry in user_entries else 0)

        modifier_cols = [
            'Evergreen_CR_OP', 'Legacy_CR_OP', 'Legacy_CR_First_Class', 'Legacy_CR_TPR',
            'BRK_OP', 'BRK_Swing_SMT', 'BRK_Mitigation_SMT', 'BRK_Swing_Strong_SMT_BUY', 'BRK_Swing_Weak_SMT_SELL',
            'BRK_Mitigation_Strong_SMT_BUY', 'BRK_Mitigation_Weak_SMT_SELL',
            'CISD_OP', 'CISD_Swing_SMT', 'CISD_Mitigation_SMT', 'CISD_Swing_Strong_SMT_BUY', 'CISD_Swing_Weak_SMT_SELL',
            'CISD_Mitigation_Strong_SMT_BUY', 'CISD_Mitigation_Weak_SMT_SELL',
            'CISD_PCL_OP', 'CISD_PCL_Swing_SMT', 'CISD_PCL_Mitigation_SMT',
            'CISD_PCL_Swing_Strong_SMT_BUY', 'CISD_PCL_Swing_Weak_SMT_SELL',
            'CISD_PCL_Mitigation_Strong_SMT_BUY', 'CISD_PCL_Mitigation_Weak_SMT_SELL',
            'LCY_OP', 'LCY_Swing_SMT', 'LCY_Mitigation_SMT', 'LCY_Swing_Strong_SMT_BUY', 'LCY_Swing_Weak_SMT_SELL',
            'LCY_Mitigation_Strong_SMT_BUY', 'LCY_Mitigation_Weak_SMT_SELL', 'LCY_First_Class', 'LCY_TPR',
            'LCY_Sweep_OP', 'LCY_Sweep_Swing_SMT', 'LCY_Sweep_Mitigation_SMT',
            'LCY_Sweep_Swing_Strong_SMT_BUY', 'LCY_Sweep_Swing_Weak_SMT_SELL',
            'LCY_Sweep_Mitigation_Strong_SMT_BUY', 'LCY_Sweep_Mitigation_Weak_SMT_SELL',
            'LCY_Sweep_First_Class', 'LCY_Sweep_TPR'
        ]
        
        for col in modifier_cols:
            update_fields.append(f'{col} = %s')
            is_enabled = ('mod_OP' in user_entries and 'OP' in col) or \
                         ('mod_FirstClass' in user_entries and 'First_Class' in col) or \
                         ('mod_TPR' in user_entries and 'TPR' in col) or \
                         ('mod_SwingSMT' in user_entries and 'Swing_SMT' in col) or \
                         ('mod_MitigationSMT' in user_entries and 'Mitigation_SMT' in col) or \
                         ('Strong' in col and 'mod_SwingSMT' in user_entries) or \
                         ('Weak' in col and 'mod_SwingSMT' in user_entries)
            values.append(1 if is_enabled else 0)

        values.append(user_id)
        query = f"UPDATE {DB_TABLE_USERS} SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, values)
        connection.commit()
        return JSONResponse(content={'success': True, 'message': 'User updated successfully'}, status_code=200)
    except mysql.connector.Error as err:
        return JSONResponse(content={'success': False, 'message': str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()

@app.delete('/api/users/{user_id}')
async def delete_user(request: Request, current_admin: dict = Depends(get_current_admin)):
    """Delete a user."""
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={'success': False, 'message': 'Database connection error'}, status_code=500)

    cursor = connection.cursor()
    try:
        cursor.execute(f"DELETE FROM {DB_TABLE_USERS} WHERE id = %s", (user_id,))
        connection.commit()

        if cursor.rowcount > 0:
            return JSONResponse(content={'success': True, 'message': 'User deleted successfully'})
        else:
            return JSONResponse(content={'success': False, 'message': 'User not found'}, status_code=404)
    except mysql.connector.Error as err:
        return JSONResponse(content={'success': False, 'message': str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()

def calculate_next_start_date(last_batch: BatchList = None, now: datetime = None):
    """Calculates the 1st of the month AFTER the previous batch finishes."""
    if last_batch:
        finish_date = last_batch.batch_start_date + timedelta(days=last_batch.max_days)
        next_month = finish_date + relativedelta(months=1, day=1)
        return next_month
    else:
        return now + relativedelta(months=1, day=1)

def resolve_pine_id(pine_id_or_alias: str) -> str:
    """
    Resolves a pine_id from an alias if it exists in environment variables 
    (prefixed with PINE_), otherwise returns the input as is.
    """
    env_key = f"PINE_{pine_id_or_alias}"
    return os.getenv(env_key, pine_id_or_alias)

def parse_expiry_period(expiry_period: str, now: datetime = None):
    """
    Parses an expiry_period string (e.g. '7D', '1M', '3M', '6M', '1Y', '1L')
    Returns (extension_type, extension_length, expiry_date) where:
    - extension_type/ext_length are for TradingView's add_access
    - expiry_date is the calculated DateTime for the indicator_users table
    """
    if not expiry_period:
        expiry_period = "1M"

    ext_type = expiry_period[-1].upper()
    try:
        ext_length = 0 if ext_type == 'L' else int(expiry_period[:-1])
    except ValueError:
        ext_type = 'M'
        ext_length = 1

    if now is None:
        now = datetime.now()

    if ext_type == 'D':
        expiry_date = now + timedelta(days=ext_length)
    elif ext_type == 'M':
        expiry_date = now + relativedelta(months=ext_length)
    elif ext_type == 'Y':
        expiry_date = now + relativedelta(years=ext_length)
    elif ext_type == 'L':
        expiry_date = None  # Lifetime
    else:
        expiry_date = now + relativedelta(months=1)

    return ext_type, ext_length, expiry_date

# ==========================================
# BOT / SIGNAL_USERS HELPERS
# ==========================================

def generate_api_key():
    """Generate a unique API key in format XXXX-XXXX-XXXX-XXXX."""
    while True:
        parts = [''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4)) for _ in range(4)]
        key = '-'.join(parts)
        
        # Ensure uniqueness against signal_users
        connection = get_db_connection()
        if connection is None:
            return key
        cursor = connection.cursor()
        try:
            cursor.execute(f"SELECT 1 FROM {DB_TABLE_USERS} WHERE user_key = %s", (key,))
            if cursor.fetchone() is None:
                return key
        finally:
            cursor.close()
            connection.close()

def get_bot_model(token_env: str) -> str:
    """Map a bot's token_env to its model name (Evergreen/Legacy/Alpha)."""
    mapping = {
        "EVERGREEN_BOT_TOKEN": "Evergreen",
        "LEGACY_BOT_TOKEN": "Legacy",
        "ALPHA_BOT_TOKEN": "Alpha",
    }
    return mapping.get(token_env)

def get_user_signal_access(user_id: str, model: str) -> tuple:
    """
    Check signal_users for a user's model access and expiry.
    Returns (is_purchased: bool, expiry_date: date or None).
    """
    connection = get_db_connection()
    if connection is None:
        return False, None
    
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            f"SELECT {model}_Access, {model}_Expiry FROM {DB_TABLE_USERS} WHERE user = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            return False, None
        
        access = row.get(f"{model}_Access")
        expiry = row.get(f"{model}_Expiry")
        
        if access and expiry and expiry >= date.today():
            return True, expiry
        return False, None
    except Exception as e:
        print(f"Error checking signal_users access: {e}")
        return False, None
    finally:
        cursor.close()
        connection.close()


# ==========================================
# FRONTEND ROUTES
# ==========================================

@app.get("/", response_class=FileResponse)
def serve_frontend():
    # Make sure main.html is in the same folder!
    return FileResponse("main.html")

@app.get("/dashboard", response_class=FileResponse)
def serve_dashboard():
    return FileResponse("dashboard.html")

@app.get("/courses", response_class=FileResponse)
def serve_courses_page():
    return FileResponse("main.html")

@app.get("/indicators", response_class=FileResponse)
def serve_indicators_page():
    return FileResponse("main.html")

@app.get("/alerts", response_class=FileResponse)
def serve_alerts_page():
    return FileResponse("main.html")

# ... (Any additional frontend or course routes you have can go here) ...


# ==========================================
# TRADINGVIEW SERVICES
# ==========================================

@app.get("/tv-status")
def read_tv_root():
    """Renamed from '/' to avoid conflicting with the frontend root."""
    return {"message": "TradingView Access Management API is running"}

@app.get("/validate/{username}")
def validate_user(username: str):
    return tv.validate_username(username)

@app.post("/access/check/{username}")
def check_access(username: str, payload: PineIDList):
    results = []
    for raw_id in payload.pine_ids:
        pine_id = resolve_pine_id(raw_id)
        details = tv.get_access_details(username, pine_id)
        results.append(details)
    return results

@app.post("/access/add/{username}")
def add_access(username: str, payload: AccessRequest):
    if not payload.duration:
        raise HTTPException(status_code=400, detail="Duration is required")
    
    # Parse duration
    extension_type = payload.duration[-1].upper()
    try:
        if extension_type == 'L':
             extension_length = 0
        else:
            extension_length = int(payload.duration[:-1])
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid duration format. Example: 7D, 1M, 1L")

    results = []
    for raw_id in payload.pine_ids:
        pine_id = resolve_pine_id(raw_id)
        # First get current state
        details = tv.get_access_details(username, pine_id)
        # Then add access
        result = tv.add_access(details, extension_type, extension_length)
        results.append(result)
    return results

@app.post("/access/remove/{username}")
def remove_access(username: str, payload: PineIDList):
    results = []
    for raw_id in payload.pine_ids:
        pine_id = resolve_pine_id(raw_id)
        
        # We construct the minimal object needed
        details = {'pine_id': pine_id, 'username': username}
        tv.remove_access(details)
        results.append(details) # remove_access modifies details in place with status
    return results




# ==========================================
# AUTH API ROUTES
# ==========================================
@app.post("/signup", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_email = db.query(User).filter(User.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_userid = db.query(User).filter(User.UserID == user.UserID).first()
    if db_userid:
        raise HTTPException(status_code=400, detail="UserID already taken")

    hashed_password = get_password_hash(user.password)
    verification_token = generate_verification_token()
    token_expires = get_token_expiry()
    
    new_user = User(
        UserID=user.UserID,
        firstname=user.firstname,
        email=user.email,
        password=hashed_password,
        tvid=user.tvid,
        is_verified=False,
        verification_token=verification_token,
        token_expires_at=token_expires
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send verification email
    email_sent = send_verification_email(user.email, verification_token, 'user')
    if not email_sent:
        print(f"Warning: Failed to send verification email to {user.email}")
    
    return new_user

@app.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    # Check if email is verified
    if not db_user.is_verified:
        # Check if token expired and allow resend
        if db_user.token_expires_at and db_user.token_expires_at < datetime.now(timezone.utc):
            # Generate new token
            new_token = generate_verification_token()
            new_expiry = get_token_expiry()
            db_user.verification_token = new_token
            db_user.token_expires_at = new_expiry
            db.commit()
            send_verification_email(user.email, new_token, 'user')
        
        raise HTTPException(
            status_code=403, 
            detail="Email not verified. Please check your inbox and verify your email before logging in."
        )

    try:
        db_user.last_login = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"Warning: failed to record last_login for user {db_user.id}: {exc}")

    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"message": "Login successful", "access_token": access_token, "UserUUID": db_user.UserUUID}

@app.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


# ==========================================
# EMAIL VERIFICATION ROUTES
# ==========================================
@app.get("/verify-email")
def verify_email(token: str, type: str = "user"):
    """Verify email address using the token sent via email."""
    now = datetime.now(timezone.utc)
    
    if type == "admin":
        # Verify admin email (raw MySQL table)
        connection = get_db_connection()
        if connection is None:
            raise HTTPException(status_code=500, detail="Database connection error")
        
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM admin_users WHERE verification_token = %s AND token_expires_at > NOW()",
                (token,)
            )
            admin = cursor.fetchone()
            
            if not admin:
                raise HTTPException(status_code=400, detail="Invalid or expired verification token")
            
            cursor.execute(
                "UPDATE admin_users SET is_verified = TRUE, verification_token = NULL, token_expires_at = NULL WHERE id = %s",
                (admin['id'],)
            )
            connection.commit()
            
            return {"success": True, "message": "Email verified successfully! You can now log in."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()
            connection.close()
    else:
        # Verify user email (SQLAlchemy table)
        db = SessionLocal()
        try:
            user = db.query(User).filter(
                User.verification_token == token,
                User.token_expires_at > now
            ).first()
            
            if not user:
                raise HTTPException(status_code=400, detail="Invalid or expired verification token")
            
            user.is_verified = True
            user.verification_token = None
            user.token_expires_at = None
            db.commit()
            
            return {"success": True, "message": "Email verified successfully! You can now log in."}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()


@app.post("/resend-verification")
def resend_verification(request: ResendVerificationRequest):
    """Resend verification email."""
    if request.type == "admin":
        connection = get_db_connection()
        if connection is None:
            raise HTTPException(status_code=500, detail="Database connection error")
        
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM admin_users WHERE email = %s", (request.email,))
            admin = cursor.fetchone()
            
            if not admin:
                raise HTTPException(status_code=404, detail="Admin not found")
            
            if admin['is_verified']:
                return {"success": True, "message": "Email is already verified"}
            
            new_token = generate_verification_token()
            new_expiry = get_token_expiry()
            
            cursor.execute(
                "UPDATE admin_users SET verification_token = %s, token_expires_at = %s WHERE id = %s",
                (new_token, new_expiry, admin['id'])
            )
            connection.commit()
            
            email_sent = send_verification_email(request.email, new_token, 'admin')
            if not email_sent:
                raise HTTPException(status_code=500, detail="Failed to send verification email")
            
            return {"success": True, "message": "Verification email sent! Please check your inbox."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()
            connection.close()
    else:
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == request.email).first()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            if user.is_verified:
                return {"success": True, "message": "Email is already verified"}
            
            new_token = generate_verification_token()
            new_expiry = get_token_expiry()
            
            user.verification_token = new_token
            user.token_expires_at = new_expiry
            db.commit()
            
            email_sent = send_verification_email(request.email, new_token, 'user')
            if not email_sent:
                raise HTTPException(status_code=500, detail="Failed to send verification email")
            
            return {"success": True, "message": "Verification email sent! Please check your inbox."}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()


# ==========================================
# SCHEDULE API ROUTES
# ==========================================

@app.get("/batches/{batch_list_id}/schedules")
def get_batch_schedules(batch_list_id: int, db: Session = Depends(get_db)):
    """Fetches all schedules for a specific batch to populate the UI table"""
    
    # We join with Lesson to get the actual chapter names if they exist
    schedules = db.query(CourseSchedule, Lesson.title)\
        .outerjoin(Lesson, CourseSchedule.lesson_id == Lesson.id)\
        .filter(CourseSchedule.batch_list_id == batch_list_id)\
        .order_by(CourseSchedule.scheduled_at.asc())\
        .all()
    
    formatted_schedules = []
    for index, (sched, chap_name) in enumerate(schedules, start=1):
        now = datetime.now()
        
        if sched.scheduled_at:
            if sched.scheduled_at > now:
                status = "Scheduled"
            elif sched.scheduled_at < now - timedelta(hours=2): 
                status = "Completed"
            else:
                status = "Ongoing"
        else:
            status = "Scheduled"

        # ✅ NEW: Use chap_name if exists, else use custom_chapter_name, else fallback
        final_module_name = chap_name if chap_name else (sched.custom_chapter_name or "Custom Module")

        formatted_schedules.append({
            "id": str(sched.id),
            "moduleIndex": index,
            "moduleName": final_module_name, 
            "scheduledAt": sched.scheduled_at.strftime("%b %d, %Y - %I:%M %p") if sched.scheduled_at else "TBD",
            "duration": sched.estimated_duration, 
            "type": sched.session_type.capitalize() if sched.session_type else "Live",
            "status": status,
            "link": sched.join_link if sched.join_link else "#" 
        })
        
    return formatted_schedules



@app.post("/batches/{batch_list_id}/schedules", response_model=CourseScheduleResponse)
def create_schedule(batch_list_id: int, schedule: CourseScheduleCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Creates a new schedule from the Add popup"""
    if schedule.batch_list_id != batch_list_id:
        raise HTTPException(status_code=400, detail="Batch ID mismatch in URL and payload")
        
    new_schedule = CourseSchedule(**schedule.model_dump())
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule


@app.put("/schedules/{schedule_id}", response_model=CourseScheduleResponse)
def update_schedule(schedule_id: int, schedule_update: CourseScheduleUpdate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Updates an existing schedule from the Edit popup"""
    db_schedule = db.query(CourseSchedule).filter(CourseSchedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Exclude unset fields so we only update what the user actually changed
    update_data = schedule_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_schedule, key, value)
        
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Deletes a schedule when the trash icon is clicked"""
    sched = db.query(CourseSchedule).filter(CourseSchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db.delete(sched)
    db.commit()
    return {"message": "Schedule deleted successfully"}

# ==========================================
# PROGRESS TRACKING ROUTES
# ==========================================

def get_session_status(scheduled_at, is_completed):
    """Determine session status based on schedule time and completion."""
    if is_completed:
        return "Completed"
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not scheduled_at:
        return "Scheduled"
    if scheduled_at > now:
        return "Scheduled"
    elif scheduled_at < now - timedelta(hours=2):
        return "Missed"
    else:
        return "Ongoing"

@app.get("/my-progress/{batch_list_id}", response_model=UserProgressResponse)
def get_my_progress(batch_list_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's progress for a specific batch."""
    batch = db.query(BatchList).filter(BatchList.id == batch_list_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    course = db.query(Course).filter(Course.id == batch.course_id).first()
    schedules = db.query(CourseSchedule, Lesson.title).outerjoin(
        Lesson, CourseSchedule.lesson_id == Lesson.id
    ).filter(
        CourseSchedule.batch_list_id == batch_list_id
    ).order_by(CourseSchedule.scheduled_at.asc()).all()

    session_list = []
    completed_count = 0
    for sched, chap_name in schedules:
        progress = db.query(CourseProgress).filter(
            CourseProgress.user_id == current_user.id,
            CourseProgress.schedule_id == sched.id
        ).first()

        is_completed = progress.is_completed if progress else False
        completed_at = progress.completed_at if progress else None

        if is_completed:
            completed_count += 1

        module_name = chap_name if chap_name else (sched.custom_chapter_name or "Custom Module")
        status = get_session_status(sched.scheduled_at, is_completed)

        session_list.append(ProgressSessionResponse(
            schedule_id=sched.id,
            module_name=module_name,
            scheduled_at=sched.scheduled_at,
            estimated_duration=sched.estimated_duration or "1 hour",
            session_type=sched.session_type or "live",
            join_link=sched.join_link,
            status=status,
            is_completed=is_completed,
            completed_at=completed_at
        ))

    total = len(schedules)
    pct = (completed_count / total * 100) if total > 0 else 0

    return UserProgressResponse(
        batch_id=batch_list_id,
        course_title=course.title if course else "Unknown",
        total_sessions=total,
        completed_sessions=completed_count,
        progress_percentage=round(pct, 2),
        sessions=session_list
    )

@app.post("/progress/{schedule_id}")
def mark_session_joined(schedule_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """User joins a session — creates progress row with is_completed=True."""
    sched = db.query(CourseSchedule).filter(CourseSchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    progress = db.query(CourseProgress).filter(
        CourseProgress.user_id == current_user.id,
        CourseProgress.schedule_id == schedule_id
    ).first()

    if progress:
        raise HTTPException(status_code=400, detail="Already joined this session")

    progress = CourseProgress(
        user_id=current_user.id,
        course_id=sched.course_id,
        batch_list_id=sched.batch_list_id,
        schedule_id=schedule_id,
        is_completed=True,
        completed_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)

    return {"message": "Session joined", "is_completed": progress.is_completed, "completed_at": progress.completed_at}

@app.get("/admin/batches/{batch_list_id}/progress", response_model=BatchProgressSummary)
def get_batch_progress_admin(batch_list_id: int, current_admin: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Admin view: all users' progress in a batch."""
    batch = db.query(BatchList).filter(BatchList.id == batch_list_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    course = db.query(Course).filter(Course.id == batch.course_id).first()

    waitlist_users = db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == batch.course_id,
        CourseWaitlist.waitlist_batch_id == batch.assigned_to
    ).all()

    schedules = db.query(CourseSchedule, Lesson.title).outerjoin(
        Lesson, CourseSchedule.lesson_id == Lesson.id
    ).filter(
        CourseSchedule.batch_list_id == batch_list_id
    ).order_by(CourseSchedule.scheduled_at.asc()).all()

    total_sessions = len(schedules)
    users_progress = []
    total_pct = 0

    for wl in waitlist_users:
        user = db.query(User).filter(User.id == wl.user_id).first()
        if not user:
            continue

        session_list = []
        completed_count = 0

        for sched, chap_name in schedules:
            progress = db.query(CourseProgress).filter(
                CourseProgress.user_id == user.id,
                CourseProgress.schedule_id == sched.id
            ).first()

            is_completed = progress.is_completed if progress else False
            completed_at = progress.completed_at if progress else None

            if is_completed:
                completed_count += 1

            module_name = chap_name if chap_name else (sched.custom_chapter_name or "Custom Module")
            status = get_session_status(sched.scheduled_at, is_completed)

            session_list.append(ProgressSessionResponse(
                schedule_id=sched.id,
                module_name=module_name,
                scheduled_at=sched.scheduled_at,
                estimated_duration=sched.estimated_duration or "1 hour",
                session_type=sched.session_type or "live",
                join_link=sched.join_link,
                status=status,
                is_completed=is_completed,
                completed_at=completed_at
            ))

        pct = (completed_count / total_sessions * 100) if total_sessions > 0 else 0
        total_pct += pct

        users_progress.append(AdminUserProgress(
            user_id=user.id,
            user_name=user.firstname,
            email=user.email,
            total_sessions=total_sessions,
            completed_sessions=completed_count,
            progress_percentage=round(pct, 2),
            sessions=session_list
        ))

    user_count = len(users_progress)
    avg_pct = (total_pct / user_count) if user_count > 0 else 0

    return BatchProgressSummary(
        batch_id=batch_list_id,
        course_title=course.title if course else "Unknown",
        total_users=user_count,
        total_sessions=total_sessions,
        avg_progress_percentage=round(avg_pct, 2),
        users=users_progress
    )

    
# ==========================================
# COURSE API ROUTES
# ==========================================
@app.post("/api/admin/courses", response_model=CourseResponse)
def create_course(course: CourseCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    new_course = Course(**course.model_dump())
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    
    # NEW: Automatically create a default BatchTemplate for the new course
    default_template = BatchTemplate(
        course_id=new_course.id,
        min_enroll=10, 
        no_of_days=30,
        automated_batch_creation=True
    )
    db.add(default_template)
    db.commit()
    
    return new_course

@app.get("/api/admin/courses", response_model=PaginatedCoursesResponse)
def get_courses(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    total = db.query(Course).count()
    courses = db.query(Course).offset(skip).limit(limit).all()
    return {"courses": courses, "total": total, "skip": skip, "limit": limit}

def _build_public_course_response(db: Session, c: Course, current_user: Optional[User]):
    purchase = None
    is_purchased = False
    if current_user:
        purchase = db.query(Purchase).filter(
            Purchase.user_id == current_user.id,
            Purchase.product_section == 1,
            Purchase.product_id == c.id
        ).first()
        is_purchased = purchase is not None

    # Determine batch assignment via waitlist -> batch_list mapping
    batch_list_id = None
    is_assigned = False
    if is_purchased:
        waitlist = db.query(CourseWaitlist).filter(
            CourseWaitlist.user_id == current_user.id,
            CourseWaitlist.course_id == c.id
        ).first()
        if waitlist:
            batch = db.query(BatchList).filter(
                BatchList.course_id == c.id,
                BatchList.assigned_to == waitlist.waitlist_batch_id
            ).first()
            if batch:
                is_assigned = True
                batch_list_id = batch.id

    item = {
        "id": c.product_uuid,
        "product_uuid": c.product_uuid,
        "title": c.title,
        "description": c.description,
        "price": c.price,
        "course_thumbnail": c.course_thumbnail,
        "is_purchased": is_purchased,
        "is_assigned": is_assigned,
    }

    if is_purchased:
        now = datetime.now()

        next_schedule = None
        prev_schedule = None

        # Only query batch-specific schedules if user is assigned to a batch
        if is_assigned and batch_list_id:
            next_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.batch_list_id == batch_list_id,
                CourseSchedule.scheduled_at > now
            ).order_by(CourseSchedule.scheduled_at.asc()).first()

            prev_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.batch_list_id == batch_list_id,
                CourseSchedule.scheduled_at <= now
            ).order_by(CourseSchedule.scheduled_at.desc()).first()

        is_ongoing = False
        active_schedule = next_schedule

        if prev_schedule:
            dur_hours = 2
            if prev_schedule.estimated_duration:
                d = prev_schedule.estimated_duration.lower().replace('hours','').replace('hour','').strip()
                try: dur_hours = float(d)
                except: pass
            end_time = prev_schedule.scheduled_at + timedelta(hours=dur_hours)
            if end_time > now:
                is_ongoing = True
                active_schedule = prev_schedule

        schedule_chapter_title = None
        schedule_chapter_index = None
        if active_schedule:
            ch = active_schedule.chapter
            schedule_chapter_title = ch.title if ch else (active_schedule.custom_chapter_name or None)
            schedule_chapter_index = ch.chapter_index if ch else None

        if is_assigned and active_schedule:
            item["scheduled_at"] = active_schedule.scheduled_at.isoformat() if active_schedule.scheduled_at else None
            item["estimated_duration"] = active_schedule.estimated_duration
            item["course_link"] = active_schedule.join_link
            item["next_chapter_title"] = schedule_chapter_title
            item["next_chapter_index"] = schedule_chapter_index
            item["is_ongoing"] = is_ongoing

    return item


@app.get("/public/courses", response_model=List[PublicCourseResponse], response_model_exclude_none=True)
def get_public_courses(
    skip: int = 0,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    courses = db.query(Course).offset(skip).limit(limit).all()
    return [_build_public_course_response(db, c, current_user) for c in courses]


@app.get("/public/courses/{product_uuid}", response_model=PublicCourseResponse, response_model_exclude_none=True)
def get_public_course(
    product_uuid: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    c = db.query(Course).filter(Course.product_uuid == product_uuid).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return _build_public_course_response(db, c, current_user)

def _build_indicator_response(indicator: Indicator, current_user: Optional[User], db: Session):
    is_purchased = False
    expiry = None
    if current_user:
        iu = db.query(IndicatorMember).filter(
            IndicatorMember.user_id == current_user.id,
            IndicatorMember.indicator_id == indicator.id
        ).first()
        if iu:
            is_purchased = True
            expiry = iu.expiry.isoformat() if iu.expiry else None
    return {
        "id": indicator.id,
        "title": indicator.title,
        "description": indicator.description,
        "price": indicator.price,
        "image": indicator.image,
        "status": indicator.status,
        "pine_id": indicator.pine_id,
        "session_id": indicator.session_id,
        "expiry_period": "1M",
        "indicator_id": indicator.indicator_id,
        "buyers": indicator.purchased_count,
        "created_at": indicator.created_at,
        "updated_at": indicator.updated_at,
        "is_purchased": is_purchased,
        "expiry": expiry,
    }

@app.get("/public/indicators", response_model=List[IndicatorResponse])
def get_public_indicators(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Public endpoint to fetch available indicators."""
    indicators = db.query(Indicator).offset(skip).limit(limit).all()
    return [_build_indicator_response(i, current_user, db) for i in indicators]

@app.get("/public/indicators/{indicator_id}", response_model=IndicatorResponse)
def get_public_indicator(
    indicator_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    indicator = db.query(Indicator).filter(Indicator.indicator_id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")
    return _build_indicator_response(indicator, current_user, db)
    

# DEPRECATED: Use /fetch/indicators with pagination below
# @app.get("/fetch/indicators", response_model=list[IndicatorResponse])
# def get_indicators(db: Session = Depends(get_db)):
#     """Fetch a list of all available indicators."""
#     return db.query(Indicator).all()
    

@app.put("/api/admin/courses/{course_id}", response_model=CourseResponse)
def update_course(course_id: int, course_update: CourseUpdate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    update_data = course_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)

    db.commit()
    db.refresh(db_course)
    return db_course

@app.delete("/api/admin/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.query(CourseWaitlist).filter(CourseWaitlist.course_id == course_id).delete()
    db.query(CourseProgress).filter(CourseProgress.course_id == course_id).delete()
    db.query(CourseSchedule).filter(CourseSchedule.course_id == course_id).delete()

    db.delete(db_course)
    db.commit()

    return {"message": "Course deleted", "id": course_id}

# Add this right above your @app.post("/courses") endpoint
@app.get("/api/admin/courses/check-id/{course_id}")
def check_course_id(course_id: str, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Validates if a custom course ID is already taken"""
    exists = db.query(Course).filter(Course.course_id == course_id).first() is not None
    return {"exists": exists}
    
# ==========================================
# CHAPTER API ROUTES
# ==========================================

@app.get("/api/admin/courses/{course_id}/chapters", response_model=list[LessonResponse])
def get_course_chapters(course_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    return db.query(Lesson).filter(Lesson.course_id == course_id).order_by(Lesson.chapter_index).all()

@app.post("/api/admin/courses/{course_id}/chapters", response_model=LessonResponse)
def create_chapter(course_id: int, chapter: LessonCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    # Automatically append to the end of the index list if no index is provided
    if chapter.chapter_index == 0:
        count = db.query(Lesson).filter(Lesson.course_id == course_id).count()
        chapter.chapter_index = count + 1

    new_chapter = Lesson(**chapter.model_dump(), course_id=course_id)
    db.add(new_chapter)
    db.commit()
    db.refresh(new_chapter)
    return new_chapter


@app.put("/chapters/{lesson_id}", response_model=LessonResponse)
def update_chapter(lesson_id: int, chapter_update: LessonUpdate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    db_chapter = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    update_data = chapter_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_chapter, key, value)
        
    db.commit()
    db.refresh(db_chapter)
    return db_chapter

@app.delete("/chapters/{lesson_id}")
def delete_chapter(lesson_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    db_chapter = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    db.delete(db_chapter)
    db.commit()
    return {"message": "Chapter deleted"}


# ==========================================
# NEW: BATCH LIST API ROUTES
# ==========================================


@app.get("/api/admin/courses/{course_id}/batches", response_model=List[BatchListResponse])
def get_course_batches(course_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Fetches all generated batches with chapter progress"""
    batches = db.query(BatchList).filter(BatchList.course_id == course_id).all()
    total_chapters = db.query(func.count(Lesson.id)).filter(
        Lesson.course_id == course_id
    ).scalar()

    batch_ids = [b.id for b in batches]
    scheduled_map = {}
    if batch_ids:
        rows = db.query(
            CourseSchedule.batch_list_id,
            func.count(distinct(CourseSchedule.lesson_id)).label("scheduled")
        ).filter(
            CourseSchedule.batch_list_id.in_(batch_ids),
            CourseSchedule.lesson_id.isnot(None)
        ).group_by(CourseSchedule.batch_list_id).all()
        scheduled_map = {row.batch_list_id: row.scheduled for row in rows}

    result = []
    for batch in batches:
        count = db.query(CourseWaitlist).filter(
            CourseWaitlist.course_id == course_id,
            CourseWaitlist.waitlist_batch_id == batch.assigned_to
        ).count()
        result.append({
            "id": batch.id,
            "course_id": batch.course_id,
            "min_enroll": batch.min_enroll,
            "batch_start_date": batch.batch_start_date,
            "max_days": batch.max_days,
            "assigned_to": batch.assigned_to,
            "status": batch.status,
            "created_at": batch.created_at,
            "no_participants": count,
            "progress": {
                "scheduled": scheduled_map.get(batch.id, 0),
                "total": total_chapters or 0,
            },
        })
    return result

@app.post("/api/admin/courses/{course_id}/batches", response_model=BatchListResponse)
def create_manual_batch(course_id: int, batch_data: ManualBatchCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Batch template missing.")

    # 1. Determine the ID we intend to use
    check_id = template.current_batch if template.current_batch else 1
    
    # 2. Check if a batch already exists with this ID
    existing_batch = db.query(BatchList).filter(
        BatchList.course_id == course_id,
        BatchList.assigned_to == check_id
    ).first()

    if existing_batch:
        # CASE: A batch already exists with this ID.
        # We must "archive" the old one and create a new ID for the new batch.
        
        # Set the old batch to scheduled
        existing_batch.status = "scheduled"
        
        # Increment the latest_batch ID to get a fresh ID
        new_assigned_id = (template.latest_batch if template.latest_batch else 0) + 1
        
        # Update template trackers to this new ID
        template.current_batch = new_assigned_id
        template.latest_batch = new_assigned_id
        
        assigned_id = new_assigned_id
    else:
        # CASE: No batch exists with this ID. It's safe to use.
        assigned_id = check_id
        
        # Update template trackers to match this ID
        template.current_batch = assigned_id
        template.latest_batch = assigned_id

    # 3. Create the new batch with status "enrolling"
    new_batch = BatchList(
        course_id=course_id,
        min_enroll=template.min_enroll,
        batch_start_date=batch_data.start_date,
        max_days=batch_data.max_days,
        assigned_to=assigned_id,
        status="enrolling"
    )
    db.add(new_batch)
    
    db.commit()
    db.refresh(new_batch)
    
    return new_batch

@app.put("/batches/{batch_id}", response_model=BatchListResponse)
def update_batch(batch_id: int, batch_update: BatchListUpdate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Updates an existing batch from the Edit popup"""
    db_batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == db_batch.course_id).first()

    # CASE 1: Switching TO "enrolling" from another status
    if batch_update.status == "enrolling" and db_batch.status != "enrolling":
        if template and template.current_batch:
            # Find the batch currently marked as enrolling
            currently_enrolling_batch = db.query(BatchList).filter(
                BatchList.course_id == db_batch.course_id,
                BatchList.assigned_to == template.current_batch
            ).first()
            
            if currently_enrolling_batch:
                # Downgrade the old active batch to scheduled
                currently_enrolling_batch.status = "scheduled"
                
            # Point the template to the new active batch
            template.current_batch = db_batch.assigned_to
            db.add(template)

    # CASE 2: Switching FROM "enrolling" TO "scheduled" (FIXED)
    elif batch_update.status == "scheduled" and db_batch.status == "enrolling":
        if template:
            # Check if a batch already exists with the latest_batch ID
            next_batch_exists = db.query(BatchList).filter(
                BatchList.course_id == db_batch.course_id,
                BatchList.assigned_to == template.latest_batch
            ).first()

            if next_batch_exists:
                # If the next ID is already taken, increment to find a fresh one
                new_latest_id = template.latest_batch + 1
                template.latest_batch = new_latest_id
                template.current_batch = new_latest_id
            else:
                # If the next ID is free, just point to it WITHOUT incrementing
                template.current_batch = template.latest_batch
            
            db.add(template)

    # Apply the rest of the updates (status, dates, etc.) from the frontend
    update_data = batch_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_batch, key, value)
        
    db.commit()
    db.refresh(db_batch)
    return db_batch
    

@app.delete("/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Deletes a batch and handles template/participant reassignment logic"""
    db_batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == db_batch.course_id).first()
    
    # Step 1: Check if template exists
    if not template:
        raise HTTPException(status_code=404, detail="Batch template not found for this course")

    latest_batch = template.latest_batch
    current_batch = template.current_batch

    # Was the deleted batch the latest/highest one?
    is_latest = db_batch.assigned_to == template.latest_batch
    # Was the deleted batch the currently active (enrolling) one?
    is_current = db_batch.assigned_to == template.current_batch

    if is_latest:
        # Roll back latest_batch to the next-highest below it, or 0 if none
        lower_batch = db.query(BatchList).filter(
            BatchList.course_id == db_batch.course_id,
            BatchList.assigned_to < db_batch.assigned_to
        ).order_by(BatchList.assigned_to.desc()).first()
        if lower_batch:
            latest_batch = lower_batch.assigned_to
        else:
            latest_batch = 0

    if is_current:
        existing_latest_batch = db.query(BatchList).filter(
            BatchList.course_id == db_batch.course_id,
            BatchList.assigned_to == latest_batch
        ).first()
        if is_latest or existing_latest_batch:
            current_batch = latest_batch + 1
            latest_batch = latest_batch + 1
        else:
            current_batch = latest_batch

    template.current_batch = current_batch
    template.latest_batch = latest_batch

    db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == db_batch.course_id,
        CourseWaitlist.waitlist_batch_id == db_batch.assigned_to
    ).update({"waitlist_batch_id": latest_batch})
            
    db.add(template)
    db.query(CourseSchedule).filter(CourseSchedule.batch_list_id == batch_id).delete()
    db.delete(db_batch)
    db.commit()
    
    return {"message": "Batch deleted successfully"}

@app.get("/api/admin/courses/{course_id}/template", response_model=BatchTemplateResponse)
def get_batch_template(course_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Fetches the automation template rules for the settings popup"""
    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@app.put("/api/admin/courses/{course_id}/template", response_model=BatchTemplateResponse)
def update_batch_template(course_id: int, template_update: BatchTemplateUpdate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Saves the new settings from the popup"""
    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = template_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
        
    db.commit()
    db.refresh(template)
    return template

@app.get("/batches/{batch_id}/participants", response_model=List[BatchParticipantResponse])
def get_batch_participants(batch_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    waitlist_entries = db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == batch.course_id,
        CourseWaitlist.waitlist_batch_id == batch.assigned_to
    ).all()

    user_ids = [w.user_id for w in waitlist_entries]
    if not user_ids:
        return []

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u for u in users}

    return [
        {
            "user_id": w.user_id,
            "user_name": user_map[w.user_id].firstname if w.user_id in user_map else "Unknown",
            "email": user_map[w.user_id].email if w.user_id in user_map else "",
            "waitlist_batch_id": w.waitlist_batch_id,
            "created_at": w.created_at,
        }
        for w in waitlist_entries
    ]

@app.get("/users/search", response_model=List[UserSearchResult])
def search_users(q: str, current_admin: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    query = q.strip()

    if query.startswith("@"):
        users = db.query(User).filter(User.UserID.ilike(f"{query[1:]}%")).limit(8).all()
    else:
        users = db.query(User).filter(User.email.ilike(f"{query}%")).limit(8).all()

    return users

@app.post("/batches/{batch_id}/participants")
def add_batch_participant(
    batch_id: int,
    payload: AddParticipantRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    existing = db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == batch.course_id,
        CourseWaitlist.waitlist_batch_id == batch.assigned_to,
        CourseWaitlist.user_id == payload.user_id
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="User is already a participant of this batch")

    new_entry = CourseWaitlist(
        user_id=payload.user_id,
        course_id=batch.course_id,
        waitlist_batch_id=batch.assigned_to
    )
    db.add(new_entry)
    db.commit()

    return {"message": "Participant added successfully"}

@app.delete("/batches/{batch_id}/participants/{user_id}")
def remove_batch_participant(
    batch_id: int,
    user_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    entry = db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == batch.course_id,
        CourseWaitlist.waitlist_batch_id == batch.assigned_to,
        CourseWaitlist.user_id == user_id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Participant not found in this batch")

    db.delete(entry)
    db.commit()

    return {"message": "Participant removed successfully"}

# --- 1. CREATE (POST) ---
@app.post("/add/indicator", response_model=IndicatorResponse, status_code=status.HTTP_201_CREATED)
def create_indicator(indicator: IndicatorCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Add a new indicator to the database."""
    # Convert Pydantic schema to dictionary and unpack into SQLAlchemy model
    new_indicator = Indicator(**indicator.model_dump())
    
    db.add(new_indicator)
    db.commit()
    db.refresh(new_indicator) # Grabs the newly generated ID and timestamps from DB
    
    return new_indicator

# --- 2. READ ALL (GET) ---
@app.get("/fetch/indicators", response_model=List[IndicatorResponse])
def get_all_indicators(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Fetch a list of all indicators with optional pagination."""
    indicators = db.query(Indicator).offset(skip).limit(limit).all()
    return indicators

# --- 3. READ ONE (GET) ---
@app.get("/fetch/indicator/{indicator_id}", response_model=IndicatorResponse)
def get_indicator(indicator_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Fetch details of a specific indicator by its ID."""
    indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
    
    if not indicator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")
        
    return indicator

# --- 4. UPDATE (PUT/PATCH) ---
@app.patch("/edit/indicator/{indicator_id}", response_model=IndicatorResponse)
def update_indicator(indicator_id: int, indicator_update: IndicatorUpdate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Update specific fields of an existing indicator."""
    db_indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
    
    if not db_indicator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")
    
    # Extract only the fields the user actually sent in the request
    update_data = indicator_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_indicator, key, value)
        
    db.commit()
    db.refresh(db_indicator)
    
    return db_indicator

# --- 5. DELETE (DELETE) ---
@app.delete("/delete/indicator/{indicator_id}", response_model=IndicatorDeleteResponse)
def delete_indicator(indicator_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Remove an indicator from the database."""
    db_indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
    
    if not db_indicator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")
        
    db.delete(db_indicator)
    db.commit()
    
    return {"message": f"Indicator '{db_indicator.title}' deleted successfully"}

@app.get("/indicators/{indicator_id}/users", response_model=List[IndicatorMemberResponse])
def get_indicator_users(indicator_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")

    entries = db.query(IndicatorMember).filter(
        IndicatorMember.indicator_id == indicator_id
    ).all()

    if not entries:
        return []

    user_ids = [e.user_id for e in entries]
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u for u in users}

    return [
        {
            "id": e.id,
            "user_id": e.user_id,
            "user_name": user_map[e.user_id].firstname if e.user_id in user_map else "Unknown",
            "email": user_map[e.user_id].email if e.user_id in user_map else "",
            "indicator_id": e.indicator_id,
            "expiry": e.expiry,
            "created_at": e.created_at,
        }
        for e in entries
    ]

@app.post("/indicators/{indicator_id}/users")
def add_indicator_user(
    indicator_id: int,
    payload: AddIndicatorMemberRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.tvid:
        raise HTTPException(status_code=400, detail="User does not have a TradingView username (tvid) set")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    ext_type, ext_length, expiry_date = parse_expiry_period("1M", now)

    try:
        session_id = indicator.session_id
        pine_id = indicator.pine_id
        tv_username = user.tvid

        details = tv_handler.get_access_details(tv_username, pine_id, session_id)

        tv_result = tv_handler.add_access(
            access_details=details,
            extension_type=ext_type,
            extension_length=ext_length,
            sessionid=session_id
        )

        if tv_result.get("status") != "Success":
            return JSONResponse(
                content={"success": False, "message": "Failed to grant TradingView access"},
                status_code=500
            )

    except Exception as e:
        print(f"TradingView error: {e}")
        return JSONResponse(
            content={"success": False, "message": f"TradingView error: {str(e)}"},
            status_code=500
        )

    existing = db.query(IndicatorMember).filter(
        IndicatorMember.user_id == payload.user_id,
        IndicatorMember.indicator_id == indicator_id
    ).first()

    if existing:
        existing.expiry = expiry_date
        existing.updated_at = datetime.now(timezone.utc)
        db.add(existing)
        message = "User access updated successfully"
    else:
        new_entry = IndicatorMember(
            user_id=payload.user_id,
            indicator_id=indicator_id,
            expiry=expiry_date
        )
        db.add(new_entry)
        indicator.purchased_count += 1
        db.add(indicator)
        message = "User added successfully"

    db.commit()

    return {"success": True, "message": message}

# ==========================================
# NEW: THE DEMAND-DRIVEN PURCHASE ENGINE
# ==========================================
@app.post("/purchase")
def create_purchase(
    purchase: PurchaseCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    product_section = purchase.product_section
    now = datetime.now(timezone.utc).replace(tzinfo=None) 

    # Resolve product_uuid to integer ID based on section
    if product_section == 1:
        course = db.query(Course).filter(Course.product_uuid == purchase.product_uuid).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        product_id = course.id
    elif product_section == 2:
        indicator = db.query(Indicator).filter(Indicator.indicator_id == purchase.product_uuid).first()
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found")
        product_id = indicator.id
    elif product_section == 3:
        bot = db.query(Bot).filter(Bot.bot_id == purchase.product_uuid).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        product_id = bot.id
    else:
        raise HTTPException(status_code=400, detail="Invalid product section")

    # 1. Record the Purchase (Universal)
    new_purchase = Purchase(
        product_section=product_section,
        product_id=product_id,
        user_id=current_user.id,
        cost=purchase.cost,
    )
    db.add(new_purchase)

    # ==========================================
    # BRANCH 1: COURSE PURCHASE LOGIC
    # ==========================================
    if product_section == 1:
        course_id = product_id
        
        template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
        if not template:
            raise HTTPException(status_code=400, detail="Batch template missing for this course.")

        w_id = template.current_batch if template.current_batch else 1
        
        # Check if a batch with this ID already exists
        existing_batch = db.query(BatchList).filter(
            BatchList.course_id == course_id,
            BatchList.assigned_to == w_id
        ).first()

        force_create_batch = False

        if existing_batch:
            if existing_batch.status == "enrolling":
                if existing_batch.batch_start_date < now:
                    # Enrolling but passed -> Close and Move
                    existing_batch.status = "scheduled"
                    
                    new_id = (template.latest_batch if template.latest_batch else 0) + 1
                    template.latest_batch = new_id
                    template.current_batch = new_id
                    w_id = new_id
                    
                    force_create_batch = True
                # Else: Enrolling and future -> Do nothing, just join waitlist
            elif existing_batch.status == "scheduled":
                # Already scheduled -> Move to next
                new_id = (template.latest_batch if template.latest_batch else 0) + 1
                template.latest_batch = new_id
                template.current_batch = new_id
                w_id = new_id
                
                force_create_batch = True

        # 3. Add User to the Waitlist
        new_waitlist_entry = CourseWaitlist(
            user_id=current_user.id,
            course_id=course_id,
            waitlist_batch_id=w_id
        )
        db.add(new_waitlist_entry)
        
        # INCREMENT THE COURSE PURCHASE COUNT
        course_to_update = db.query(Course).filter(Course.id == course_id).first()
        if course_to_update:
            course_to_update.purchased_count += 1
            db.add(course_to_update)

        db.flush()

        # 5. BATCH CREATION LOGIC
        # Case A: We were forced to move to a new ID because the old one closed
        if force_create_batch:
            last_batch = db.query(BatchList).filter(BatchList.course_id == course_id).order_by(BatchList.batch_start_date.desc()).first()
            new_start_date = calculate_next_start_date(last_batch, now)

            new_batch = BatchList(
                course_id=course_id,
                min_enroll=template.min_enroll,
                batch_start_date=new_start_date,
                max_days=template.no_of_days,
                assigned_to=w_id,
                status="enrolling"
            )
            db.add(new_batch)
            db.flush()
            
            # Ensure template is synced
            template.current_batch = w_id
            template.latest_batch = w_id

        # Case B: No batch existed for this ID, check if we hit the threshold to create one
        elif not existing_batch:
            current_waitlist_count = db.query(CourseWaitlist).filter(
                CourseWaitlist.course_id == course_id,
                CourseWaitlist.waitlist_batch_id == w_id
            ).count()

            if current_waitlist_count == template.min_enroll:
                if template.automated_batch_creation:
                    last_batch = db.query(BatchList).filter(BatchList.course_id == course_id).order_by(BatchList.batch_start_date.desc()).first()
                    new_start_date = calculate_next_start_date(last_batch, now)

                    new_batch = BatchList(
                        course_id=course_id,
                        min_enroll=template.min_enroll,
                        batch_start_date=new_start_date,
                        max_days=template.no_of_days,
                        assigned_to=w_id,
                        status="enrolling"
                    )
                    db.add(new_batch)
                    db.flush()

                    template.current_batch = w_id
                    template.latest_batch = w_id

    # ==========================================
    # BRANCH 2: INDICATOR PURCHASE LOGIC
    # ==========================================
    elif product_section == 2:
        indicator_id = product_id
        
        # 1. Fetch Indicator Details
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found.")

        # 2. Validation: Does the user have a TradingView ID set?
        if not current_user.tvid:
            raise HTTPException(
                status_code=400, 
                detail="TradingView Username (tvid) missing in your profile. Please update it before purchasing."
            )

        # 3. Increment Buyers Count
        indicator.purchased_count += 1
        db.add(indicator)

        # 4. TRADINGVIEW ACCESS INTEGRATION
        ext_type, ext_length, expiry_date = parse_expiry_period("1M", now)

        try:
            # We use the session_id and pine_id stored in the Indicator table
            session_id = indicator.session_id 
            pine_id = indicator.pine_id
            tv_username = current_user.tvid

            # Step A: Get current access status
            details = tv_handler.get_access_details(tv_username, pine_id, session_id)

            # Step B: Add/Extend access using indicator's expiry_period
            tv_result = tv_handler.add_access(
                access_details=details,
                extension_type=ext_type,
                extension_length=ext_length,
                sessionid=session_id
            )

            if tv_result.get('status') != 'Success':
                print(f"TV Error: {tv_result}")
                raise HTTPException(status_code=500, detail="Purchase recorded, but failed to grant TradingView access.")

        except Exception as e:
            print(f"TradingView Integration Error: {e}")
            raise HTTPException(status_code=500, detail=f"Internal error granting TV access: {str(e)}")

        # 5. Add/Update IndicatorMember entry with calculated expiry
        existing_entry = db.query(IndicatorMember).filter(
            IndicatorMember.user_id == current_user.id,
            IndicatorMember.indicator_id == indicator_id
        ).first()

        if existing_entry:
            existing_entry.expiry = expiry_date
            existing_entry.updated_at = datetime.now(timezone.utc)
            db.add(existing_entry)
        else:
            new_entry = IndicatorMember(
                user_id=current_user.id,
                indicator_id=indicator_id,
                expiry=expiry_date
            )
            db.add(new_entry)

    # ==========================================
    # BRANCH 3: BOT PURCHASE LOGIC
    # ==========================================
    elif product_section == 3:
        bot_id = product_id
        bot = db.query(Bot).filter(Bot.id == bot_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found.")

        model = get_bot_model(bot.token_env)
        if not model:
            raise HTTPException(status_code=400, detail="Unknown bot model.")

        # Generate a unique API key for the user
        api_key = generate_api_key()

        # Default expiry: 30 days from now (same as Purchase model default)
        expiry_date = (now + timedelta(days=30)).date()
        far_future = date(2099, 12, 31)

        # Upsert into signal_users (MySQL)
        connection = get_db_connection()
        if connection is None:
            raise HTTPException(status_code=500, detail="Database connection error")

        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(f"SELECT id, user_key FROM {DB_TABLE_USERS} WHERE user = %s", (current_user.UserID,))
            existing = cursor.fetchone()

            if existing:
                # Update existing record: enable model access and set expiry
                # Keep existing user_key if already present
                update_sql = f"""
                    UPDATE {DB_TABLE_USERS}
                    SET {model}_Access = TRUE,
                        {model}_Expiry = %s,
                        user_key = COALESCE(user_key, %s)
                    WHERE user = %s
                """
                cursor.execute(update_sql, (expiry_date, api_key, current_user.UserID))
            else:
                # Insert new record with all required NOT NULL columns
                # Evergreen_Expiry and Legacy_Expiry are NOT NULL
                # Alpha_Expiry is DEFAULT NULL
                evergreen_exp = expiry_date if model == "Evergreen" else far_future
                legacy_exp = expiry_date if model == "Legacy" else far_future
                alpha_exp = expiry_date if model == "Alpha" else None

                cursor.execute(f"""
                    INSERT INTO {DB_TABLE_USERS} (
                        user, telegram_id, user_key,
                        Evergreen_Expiry, Legacy_Expiry, Alpha_Expiry,
                        Evergreen_Access, Legacy_Access, Alpha_Access
                    ) VALUES (%s, '', %s, %s, %s, %s, %s, %s, %s)
                """, (
                    current_user.UserID, api_key,
                    evergreen_exp, legacy_exp, alpha_exp,
                    model == "Evergreen", model == "Legacy", model == "Alpha"
                ))

            connection.commit()
        except Exception as e:
            connection.rollback()
            print(f"Error upserting signal_users for bot purchase: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to add user to signal_users: {str(e)}")
        finally:
            cursor.close()
            connection.close()

    else:
        raise HTTPException(status_code=400, detail="Invalid product_section provided.")

    db.commit() 
    return {"message": "Purchase successful and TradingView access granted!"}
    





@app.get("/my-purchases")
def get_my_purchases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    purchases = db.query(Purchase).filter(Purchase.user_id == current_user.id).all()
    
    course_ids = [p.product_id for p in purchases if p.product_section == 1]
    indicator_ids = [p.product_id for p in purchases if p.product_section == 2]
    
    courses = db.query(Course).filter(Course.id.in_(course_ids)).all() if course_ids else []
    indicators = db.query(Indicator).filter(Indicator.id.in_(indicator_ids)).all() if indicator_ids else []
    
    # Bots: derive from signal_users instead of purchases
    bot_uuids = []
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE user = %s", (current_user.UserID,))
            row = cursor.fetchone()
            if row:
                today = date.today()
                all_bots = db.query(Bot).filter(Bot.status == "active").all()
                for b in all_bots:
                    model = get_bot_model(b.token_env)
                    if model:
                        access = row.get(f"{model}_Access")
                        expiry = row.get(f"{model}_Expiry")
                        if access and expiry and expiry >= today:
                            bot_uuids.append(b.bot_id)
        finally:
            cursor.close()
            connection.close()
    
    return {
        "courses": [c.product_uuid for c in courses],
        "indicators": [i.indicator_id for i in indicators],
        "bots": bot_uuids
    }

@app.get("/api/enrollment-status/{course_uuid}")
def get_enrollment_status(course_uuid: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns enrollment status for a specific course."""
    course = db.query(Course).filter(Course.product_uuid == course_uuid).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course_id = course.id

    is_purchased = db.query(Purchase).filter(
        Purchase.user_id == current_user.id,
        Purchase.product_id == course_id,
        Purchase.product_section == 1
    ).first() is not None

    if not is_purchased:
        return {"is_purchased": False, "batch_assigned": False, "schedule_assigned": False, "schedule": None}

    # Check if user is in waitlist with a batch assignment
    waitlist_entry = db.query(CourseWaitlist).filter(
        CourseWaitlist.user_id == current_user.id,
        CourseWaitlist.course_id == course_id
    ).first()

    batch_assigned = False
    schedule_assigned = False
    schedule_info = None

    if waitlist_entry and waitlist_entry.waitlist_batch_id:
        # Check if a batch exists with this assigned_to value
        batch = db.query(BatchList).filter(
            BatchList.course_id == course_id,
            BatchList.assigned_to == waitlist_entry.waitlist_batch_id
        ).first()

        if batch:
            batch_assigned = True
            now = datetime.now()

            # Find the next upcoming schedule
            next_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.batch_list_id == batch.id,
                CourseSchedule.scheduled_at > now
            ).order_by(CourseSchedule.scheduled_at.asc()).first()

            # Find the previous schedule (just before now)
            prev_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.batch_list_id == batch.id,
                CourseSchedule.scheduled_at <= now
            ).order_by(CourseSchedule.scheduled_at.desc()).first()

            is_ongoing = False
            schedule_info = None
            next_chapter_title = None
            next_chapter_index = None

            if prev_schedule:
                # Parse duration
                dur_hours = 2
                if prev_schedule.estimated_duration:
                    d = prev_schedule.estimated_duration.lower().replace('hours','').replace('hour','').strip()
                    try: dur_hours = float(d)
                    except: pass
                end_time = prev_schedule.scheduled_at + timedelta(hours=dur_hours)
                if end_time > now:
                    is_ongoing = True
                    # Use the previous (ongoing) schedule as the active one
                    prev_chapter = db.query(Lesson).filter(
                        Lesson.id == prev_schedule.lesson_id
                    ).first() if prev_schedule.lesson_id else None
                    schedule_info = {
                        "scheduled_at": prev_schedule.scheduled_at.isoformat() if prev_schedule.scheduled_at else None,
                        "estimated_duration": prev_schedule.estimated_duration,
                        "join_link": prev_schedule.join_link,
                        "session_type": prev_schedule.session_type,
                    }
                    next_chapter_title = prev_chapter.title if prev_chapter else (prev_schedule.custom_chapter_name or None)
                    next_chapter_index = prev_chapter.chapter_index if prev_chapter else None
                    schedule_assigned = True

            if not is_ongoing and next_schedule:
                schedule_assigned = True
                next_chapter = db.query(Lesson).filter(
                    Lesson.id == next_schedule.lesson_id
                ).first() if next_schedule.lesson_id else None
                schedule_info = {
                    "scheduled_at": next_schedule.scheduled_at.isoformat() if next_schedule.scheduled_at else None,
                    "estimated_duration": next_schedule.estimated_duration,
                    "join_link": next_schedule.join_link,
                    "session_type": next_schedule.session_type,
                }
                next_chapter_title = next_chapter.title if next_chapter else (next_schedule.custom_chapter_name or None)
                next_chapter_index = next_chapter.chapter_index if next_chapter else None

            # Fallback: no ongoing and no future schedule → show first unscheduled chapter
            if not is_ongoing and not next_schedule:
                scheduled_lesson_ids = {
                    s.lesson_id for s in db.query(CourseSchedule.lesson_id).filter(
                        CourseSchedule.batch_list_id == batch.id,
                        CourseSchedule.lesson_id.isnot(None)
                    ).all()
                }
                unscheduled_chapter = db.query(Lesson).filter(
                    Lesson.course_id == course_id,
                    Lesson.id.notin_(scheduled_lesson_ids)
                ).order_by(Lesson.chapter_index.asc()).first()
                if unscheduled_chapter:
                    next_chapter_title = unscheduled_chapter.title
                    next_chapter_index = unscheduled_chapter.chapter_index

    # Fetch chapters for the course
    course_chapters = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).order_by(Lesson.chapter_index).all()

    # Fetch chapter → schedule mapping
    chapter_schedule_map = {}
    if batch:
        batch_schedules = db.query(CourseSchedule).filter(
            CourseSchedule.batch_list_id == batch.id
        ).all()
        for bs in batch_schedules:
            if bs.lesson_id:
                dur_h = 2
                d = (bs.estimated_duration or '').lower().replace('hours','').replace('hour','').strip()
                try: dur_h = float(d)
                except: pass
                end_time = bs.scheduled_at + timedelta(hours=dur_h) if bs.scheduled_at else None
                chapter_schedule_map[bs.lesson_id] = {
                    "scheduled_at": bs.scheduled_at.isoformat() if bs.scheduled_at else None,
                    "is_past": end_time < now if end_time else (bs.scheduled_at < now if bs.scheduled_at else False),
                    "is_ongoing": bs.scheduled_at < now and end_time and end_time >= now if bs.scheduled_at else False,
                }

    chapters_data = []
    for ch in course_chapters:
        sch = chapter_schedule_map.get(ch.id, {})
        chapters_data.append({
            "id": ch.id,
            "chapter_index": ch.chapter_index,
            "title": ch.title,
            "scheduled_at": sch.get("scheduled_at"),
            "is_past": sch.get("is_past", False),
            "is_ongoing": sch.get("is_ongoing", False),
        })

    # Calculate progress based on completed chapters (past or ongoing) out of total chapters
    total_chapters = len(chapters_data)
    if total_chapters > 0:
        completed_count = sum(1 for ch in chapters_data if ch["is_past"] or ch["is_ongoing"])
        progress = round((completed_count / total_chapters) * 100)
    else:
        progress = 0

    return {
        "is_purchased": True,
        "batch_assigned": batch_assigned,
        "schedule_assigned": schedule_assigned,
        "schedule": schedule_info,
        "is_ongoing": is_ongoing,
        "next_chapter_title": next_chapter_title,
        "next_chapter_index": next_chapter_index,
        "chapters": chapters_data,
        "progress": progress,
    }

@app.get("/my-library")
def get_my_library(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the current user's purchased courses, indicators, and bots."""
    purchases = db.query(Purchase).filter(Purchase.user_id == current_user.id).all()

    course_ids = [p.product_id for p in purchases if p.product_section == 1]
    indicator_ids = [p.product_id for p in purchases if p.product_section == 2]
    bot_ids = [p.product_id for p in purchases if p.product_section == 3]

    # Courses with schedule info, sorted by scheduled_at (unscheduled at bottom)
    courses = []
    if course_ids:
        course_objs = db.query(Course).filter(Course.id.in_(course_ids)).all()
        for c in course_objs:
            now = datetime.now()
            next_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.scheduled_at > now
            ).order_by(CourseSchedule.scheduled_at.asc()).first()

            prev_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.scheduled_at <= now
            ).order_by(CourseSchedule.scheduled_at.desc()).first()

            is_ongoing = False
            active_schedule = next_schedule

            if prev_schedule:
                dur_hours = 2
                if prev_schedule.estimated_duration:
                    d = prev_schedule.estimated_duration.lower().replace('hours','').replace('hour','').strip()
                    try: dur_hours = float(d)
                    except: pass
                end_time = prev_schedule.scheduled_at + timedelta(hours=dur_hours)
                if end_time > now:
                    is_ongoing = True
                    active_schedule = prev_schedule

            schedule_chapter_title = None
            schedule_chapter_index = None
            if active_schedule:
                ch = active_schedule.chapter
                schedule_chapter_title = ch.title if ch else (active_schedule.custom_chapter_name or None)
                schedule_chapter_index = ch.chapter_index if ch else None

            courses.append({
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "thumbnail": c.course_thumbnail,
                "scheduled_at": active_schedule.scheduled_at.isoformat() if active_schedule and active_schedule.scheduled_at else None,
                "estimated_duration": active_schedule.estimated_duration if active_schedule else None,
                "course_link": active_schedule.join_link if active_schedule else None,
                "is_ongoing": is_ongoing,
                "next_chapter_title": schedule_chapter_title,
                "next_chapter_index": schedule_chapter_index,
            })
        # Sort: scheduled first (ascending), unscheduled at bottom
        courses.sort(key=lambda x: (x['scheduled_at'] is None, x['scheduled_at'] or ''))

    indicators = []
    if indicator_ids:
        ind_objs = db.query(Indicator).filter(Indicator.id.in_(indicator_ids)).all()
        for ind in ind_objs:
            indicators.append({
                "id": ind.id,
                "name": ind.title,
                "description": ind.description,
                "thumbnail": ind.image,
            })

    # Bots: derive from signal_users instead of purchases
    bots = []
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE user = %s", (current_user.UserID,))
            row = cursor.fetchone()
            if row:
                today = date.today()
                all_bots = db.query(Bot).filter(Bot.status == "active").all()
                for b in all_bots:
                    model = get_bot_model(b.token_env)
                    if model:
                        access = row.get(f"{model}_Access")
                        expiry = row.get(f"{model}_Expiry")
                        if access and expiry and expiry >= today:
                            bots.append({
                                "id": b.id,
                                "name": b.title,
                                "description": b.description,
                                "thumbnail": b.image,
                                "expiry": expiry.isoformat(),
                            })
        finally:
            cursor.close()
            connection.close()

    return {"courses": courses, "indicators": indicators, "bots": bots}

# ==========================================
# BOTS API
# ==========================================
@app.get("/clientrequest/bots", response_model=List[BotPublicResponse])
def get_bots(db: Session = Depends(get_db)):
    return db.query(Bot).filter(Bot.status == "Running").all()

def _build_bot_response(bot: Bot, current_user: Optional[User], db: Session):
    is_purchased = False
    expiry = None
    if current_user:
        member = db.query(BotMember).filter(
            BotMember.username == current_user.UserID,
            BotMember.bot_id == bot.bot_id,
        ).first()
        if member:
            is_purchased = True
            expiry = member.bot_expiry.isoformat() if member.bot_expiry else None
    return {
        "bot_id": bot.bot_id,
        "title": bot.title,
        "description": bot.description,
        "price": bot.price,
        "image": bot.image,
        "category": bot.category,
        "features": bot.features,
        "exchange": bot.exchange,
        "apy": bot.apy,
        "status": bot.status,
        "token_env": bot.token_env,
        "is_purchased": is_purchased,
        "expiry": expiry,
    }

@app.get("/public/bots", response_model=List[BotPublicResponse])
def get_public_bots(
    skip: int = 0,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    bots = db.query(Bot).filter(Bot.status == "Running").offset(skip).limit(limit).all()
    return [_build_bot_response(b, current_user, db) for b in bots]

@app.get("/public/bots/{bot_id}", response_model=BotPublicResponse)
def get_public_bot(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    bot = db.query(Bot).filter(Bot.bot_id == bot_id, Bot.status == "Running").first()
    if not bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    return _build_bot_response(bot, current_user, db)

@app.get("/api/admin/bots", response_model=List[BotResponse])
def get_all_bots(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    return db.query(Bot).all()

@app.get("/api/admin/fetch/bot/{bot_id}", response_model=BotResponse)
def get_bot(bot_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    return bot

@app.patch("/api/admin/edit/bot/{bot_id}", response_model=BotResponse)
def update_bot(bot_id: int, bot_update: BotUpdate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    update_data = bot_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bot, key, value)
    db.commit()
    db.refresh(db_bot)
    return db_bot

@app.delete("/api/admin/delete/bot/{bot_id}")
def delete_bot(bot_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    db.delete(db_bot)
    db.commit()
    return {"message": f"Bot '{db_bot.title}' deleted successfully"}


# ==========================================
# SEARCH API
# ==========================================
class SearchResult(BaseModel):
    id: int
    section: str
    title: str
    description: Optional[str] = None
    price: float
    thumbnail: Optional[str] = None
    # Course-specific extras
    scheduled_at: Optional[str] = None
    estimated_duration: Optional[str] = None
    course_link: Optional[str] = None

@app.get("/search", response_model=List[SearchResult])
def search_all(q: str = "", db: Session = Depends(get_db)):
    """Unified search across courses, indicators, and bots."""
    if not q or not q.strip():
        return []
    
    search_term = f"%{q.strip()}%"
    results = []
    seen_ids = set()
    
    # Search courses
    courses = db.query(Course).filter(
        or_(
            Course.title.ilike(search_term),
            Course.description.ilike(search_term)
        )
    ).all()
    
    for c in courses:
        key = f"course_{c.id}"
        if key not in seen_ids:
            seen_ids.add(key)
            # Find next upcoming schedule (skip past ones)
            now = datetime.now()
            next_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.scheduled_at > now
            ).order_by(CourseSchedule.scheduled_at.asc()).first()
            
            results.append({
                "id": c.id,
                "section": "course",
                "title": c.title,
                "description": c.description,
                "price": c.price,
                "thumbnail": c.course_thumbnail,
                "scheduled_at": next_schedule.scheduled_at.isoformat() if next_schedule and next_schedule.scheduled_at else None,
                "estimated_duration": next_schedule.estimated_duration if next_schedule else None,
                "course_link": next_schedule.join_link if next_schedule else None,
            })
    
    # Search indicators
    indicators = db.query(Indicator).filter(
        or_(
            Indicator.title.ilike(search_term),
            Indicator.description.ilike(search_term)
        )
    ).all()
    
    for ind in indicators:
        key = f"indicator_{ind.id}"
        if key not in seen_ids:
            seen_ids.add(key)
            results.append({
                "id": ind.indicator_id,
                "indicator_id": ind.indicator_id,
                "section": "indicator",
                "title": ind.title,
                "description": ind.description,
                "price": ind.price,
                "thumbnail": ind.image,
            })
    
    # Search bots
    bots = db.query(Bot).filter(
        or_(
            Bot.title.ilike(search_term),
            Bot.description.ilike(search_term)
        )
    ).all()
    
    for b in bots:
        key = f"bot_{b.id}"
        if key not in seen_ids:
            seen_ids.add(key)
            results.append({
                "id": b.bot_id,
                "bot_id": b.bot_id,
                "section": "bot",
                "title": b.title,
                "description": b.description,
                "price": b.price,
                "thumbnail": b.image,
            })
    
    return results


# ==========================================
# USER PROFILE API
# ==========================================
class UserProfileUpdate(BaseModel):
    firstname: Optional[str] = None
    tvid: Optional[str] = None

@app.put("/users/me", response_model=UserResponse)
def update_my_profile(
    update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update the current user's profile (name and TradingView username)."""
    if update.firstname is not None:
        current_user.firstname = update.firstname
    if update.tvid is not None:
        current_user.tvid = update.tvid
    db.commit()
    db.refresh(current_user)
    return current_user

@app.put("/users/me/password")
def change_my_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change the current user's password after verifying the current one."""
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.get("/settings", response_class=FileResponse)
def serve_settings_page():
    return FileResponse("main.html")


# ==========================================
# DASHBOARD AGGREGATION ENDPOINTS
# ==========================================

def _month_bounds(now: datetime):
    """Return (start_of_this_month, start_of_next_month, start_of_prev_month)."""
    start_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_day = calendar.monthrange(start_this.year, start_this.month)[1]
    start_next = start_this.replace(day=1) + timedelta(days=last_day)
    start_prev = (start_this - timedelta(days=1)).replace(day=1)
    return start_this, start_next, start_prev


@app.get("/api/admin/dashboard/overview")
def dashboard_overview(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Aggregated KPI counts for the 4 top cards (current vs previous month)."""
    now = datetime.now(timezone.utc)
    start_this, start_next, start_prev = _month_bounds(now)

    new_signups_this = db.query(User).filter(User.created_at >= start_this, User.created_at < start_next).count()
    new_signups_prev = db.query(User).filter(User.created_at >= start_prev, User.created_at < start_this).count()

    active_users_this = 0
    active_users_prev = 0
    try:
        active_users_this = db.query(User).filter(User.last_login != None, User.last_login >= start_this, User.last_login < start_next).count()
        active_users_prev = db.query(User).filter(User.last_login != None, User.last_login >= start_prev, User.last_login < start_this).count()
    except Exception as exc:
        print(f"Warning: failed to compute active_users (is users.last_login present?): {exc}")

    products_this_rows = (
        db.query(Purchase.product_section)
        .filter(Purchase.purchased_at >= start_this, Purchase.purchased_at < start_next)
        .all()
    )
    products_prev_rows = (
        db.query(Purchase.product_section)
        .filter(Purchase.purchased_at >= start_prev, Purchase.purchased_at < start_this)
        .all()
    )

    section_labels = {1: "courses", 2: "indicators", 3: "bots"}

    def _breakdown(rows):
        counts: Dict[str, int] = {"courses": 0, "indicators": 0, "bots": 0}
        for (sec,) in rows:
            label = section_labels.get(sec)
            if label:
                counts[label] += 1
        return counts

    breakdown_this = _breakdown(products_this_rows)
    breakdown_prev = _breakdown(products_prev_rows)

    products_sold_this = sum(breakdown_this.values())
    products_sold_prev = sum(breakdown_prev.values())

    progress_user_rows_this = (
        db.query(CourseProgress.user_id, CourseProgress.course_id)
        .filter(CourseProgress.completed_at != None, CourseProgress.completed_at >= start_this, CourseProgress.completed_at < start_next)
        .all()
    )
    progress_user_rows_prev = (
        db.query(CourseProgress.user_id, CourseProgress.course_id)
        .filter(CourseProgress.completed_at != None, CourseProgress.completed_at >= start_prev, CourseProgress.completed_at < start_this)
        .all()
    )

    waitlist_user_rows_this = (
        db.query(CourseWaitlist.user_id, CourseWaitlist.course_id)
        .filter(CourseWaitlist.created_at >= start_this, CourseWaitlist.created_at < start_next)
        .all()
    )
    waitlist_user_rows_prev = (
        db.query(CourseWaitlist.user_id, CourseWaitlist.course_id)
        .filter(CourseWaitlist.created_at >= start_prev, CourseWaitlist.created_at < start_this)
        .all()
    )

    def _participation(rows):
        course_user_pairs = {(cid, uid) for (uid, cid) in rows}
        distinct_users = {uid for (_, uid) in rows}
        per_course: Dict[int, set] = {}
        for (uid, cid) in rows:
            per_course.setdefault(cid, set()).add(uid)
        breakdown = [
            {"course_id": cid, "course_title": None, "participants": len(uids)}
            for cid, uids in per_course.items()
        ]
        return {
            "total_users": len(distinct_users),
            "courses": breakdown,
            "course_user_pairs": course_user_pairs,
        }

    progress_this = _participation(progress_user_rows_this)
    progress_prev = _participation(progress_user_rows_prev)
    waitlist_this = _participation(waitlist_user_rows_this)
    waitlist_prev = _participation(waitlist_user_rows_prev)

    combined_this_pairs = progress_this["course_user_pairs"] | waitlist_this["course_user_pairs"]
    combined_prev_pairs = progress_prev["course_user_pairs"] | waitlist_prev["course_user_pairs"]
    combined_this_users = {uid for (_, uid) in combined_this_pairs}
    combined_prev_users = {uid for (_, uid) in combined_prev_pairs}

    def _combined_breakdown(this_pairs, prev_pairs):
        per_course_this: Dict[int, set] = {}
        for (uid, cid) in this_pairs:
            per_course_this.setdefault(cid, set()).add(uid)
        per_course_prev: Dict[int, set] = {}
        for (uid, cid) in prev_pairs:
            per_course_prev.setdefault(cid, set()).add(uid)
        all_cids = set(per_course_this.keys()) | set(per_course_prev.keys())
        return [
            {
                "course_id": cid,
                "course_title": None,
                "this_month": len(per_course_this.get(cid, set())),
                "prev_month": len(per_course_prev.get(cid, set())),
            }
            for cid in all_cids
        ]

    participated_breakdown = _combined_breakdown(combined_this_pairs, combined_prev_pairs)

    course_ids = {row["course_id"] for row in participated_breakdown}
    if course_ids:
        course_titles = {
            c.id: c.title
            for c in db.query(Course).filter(Course.id.in_(course_ids)).all()
        }
        for row in participated_breakdown:
            row["course_title"] = course_titles.get(row["course_id"], f"Course #{row['course_id']}")

    return {
        "new_signups": {
            "this_month": new_signups_this,
            "prev_month": new_signups_prev,
        },
        "active_users": {
            "this_month": active_users_this,
            "prev_month": active_users_prev,
        },
        "products_sold": {
            "this_month": products_sold_this,
            "prev_month": products_sold_prev,
            "breakdown_this_month": breakdown_this,
            "breakdown_prev_month": breakdown_prev,
        },
        "participated_users": {
            "this_month": len(combined_this_users),
            "prev_month": len(combined_prev_users),
            "breakdown": sorted(
                participated_breakdown,
                key=lambda r: (r["this_month"] + r["prev_month"]),
                reverse=True,
            ),
        },
        "month_label": start_this.strftime("%B %Y"),
        "prev_month_label": start_prev.strftime("%B %Y"),
    }


@app.get("/api/admin/dashboard/enrolling-courses")
def dashboard_enrolling_courses(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """For each course, find the next batch (enrolling) and count participants enrolled to it."""
    now = datetime.now(timezone.utc)
    courses = db.query(Course).all()
    result = []

    templates_by_course = {
        t.course_id: t for t in db.query(BatchTemplate).all()
    }

    for course in courses:
        template = templates_by_course.get(course.id)
        target_batch_id = template.current_batch if (template and template.current_batch) else None

        next_batch = None
        if target_batch_id is not None:
            next_batch = (
                db.query(BatchList)
                .filter(
                    BatchList.course_id == course.id,
                    BatchList.assigned_to == target_batch_id,
                )
                .first()
            )

        if next_batch is None:
            next_batch = (
                db.query(BatchList)
                .filter(BatchList.course_id == course.id)
                .filter((BatchList.batch_start_date == None) | (BatchList.batch_start_date >= now))
                .order_by(BatchList.assigned_to.desc())
                .first()
            )

        if next_batch:
            participant_count = (
                db.query(CourseWaitlist)
                .filter(
                    CourseWaitlist.course_id == course.id,
                    CourseWaitlist.waitlist_batch_id == next_batch.assigned_to,
                )
                .count()
            )
            batch_label = (
                f"Batch #{next_batch.assigned_to}" + (f" — starts {next_batch.batch_start_date.strftime('%b %d, %Y')}" if next_batch.batch_start_date else " — future batch")
            )
            batch_id = next_batch.id
        else:
            if target_batch_id is not None:
                participant_count = (
                    db.query(CourseWaitlist)
                    .filter(
                        CourseWaitlist.course_id == course.id,
                        CourseWaitlist.waitlist_batch_id == target_batch_id,
                    )
                    .count()
                )
            else:
                max_batch = (
                    db.query(func.max(CourseWaitlist.waitlist_batch_id))
                    .filter(CourseWaitlist.course_id == course.id)
                    .scalar()
                )
                if max_batch is not None:
                    participant_count = (
                        db.query(CourseWaitlist)
                        .filter(
                            CourseWaitlist.course_id == course.id,
                            CourseWaitlist.waitlist_batch_id == max_batch,
                        )
                        .count()
                    )
                else:
                    participant_count = 0
            batch_label = "not created"
            batch_id = None

        if next_batch is None and participant_count == 0:
            continue

        result.append({
            "course_id": course.id,
            "course_title": course.title,
            "batch_label": batch_label,
            "batch_id": batch_id,
            "participants": participant_count,
        })

    result.sort(key=lambda r: r["participants"], reverse=True)
    return {"courses": result}


@app.get("/api/admin/dashboard/upcoming-sessions")
def dashboard_upcoming_sessions(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Sessions scheduled in the future, sorted by start time ascending."""
    now = datetime.now(timezone.utc)
    rows = (
        db.query(CourseSchedule, Course.title, Lesson.title, BatchList.assigned_to)
        .outerjoin(Course, CourseSchedule.course_id == Course.id)
        .outerjoin(Lesson, CourseSchedule.lesson_id == Lesson.id)
        .outerjoin(BatchList, CourseSchedule.batch_list_id == BatchList.id)
        .filter(CourseSchedule.scheduled_at != None, CourseSchedule.scheduled_at >= now)
        .order_by(CourseSchedule.scheduled_at.asc())
        .all()
    )

    sessions = []
    for schedule, course_title, chapter_title, batch_assigned_to in rows:
        chapter_name = chapter_title or schedule.custom_chapter_name or "Untitled session"
        sessions.append({
            "schedule_id": schedule.id,
            "course_id": schedule.course_id,
            "course_title": course_title or f"Course #{schedule.course_id}",
            "chapter_title": chapter_name,
            "session_type": schedule.session_type,
            "scheduled_at": schedule.scheduled_at.isoformat() if schedule.scheduled_at else None,
            "batch_label": f"Batch #{batch_assigned_to}" if batch_assigned_to is not None else None,
            "join_link": schedule.join_link,
        })
    return {"sessions": sessions}


# ==========================================
# AUTH PAGES (Static HTML)
# ==========================================
@app.get("/auth/login", response_class=FileResponse)
def serve_auth_login():
    return FileResponse("auth/login.html")

@app.get("/auth/signup", response_class=FileResponse)
def serve_auth_signup():
    return FileResponse("auth/signup.html")

@app.get("/auth/connect", response_class=FileResponse)
def serve_auth_connect():
    return FileResponse("auth/connect.html")

# ==========================================
# MINI APP ROUTE (must be BEFORE catch-all)
# ==========================================
@app.get("/miniapp")
@app.get("/miniapp/")
def serve_miniapp():
    return FileResponse("miniapp/miniapp.html")


# ==========================================
# MINI APP HELPERS
# ==========================================

def validate_init_data(init_data: str):
    """
    Validates Telegram WebApp initData using HMAC against all three bot tokens.
    Returns {'user': user_data, 'model': model} or None.
    """
    try:
        init_data = unquote(init_data)
        pairs = init_data.split('&')
        data_dict = {}
        for pair in pairs:
            if '=' in pair:
                k, v = pair.split('=', 1)
                data_dict[k] = v
        
        received_hash = data_dict.pop('hash', None)
        if not received_hash:
            return None
        
        data_check_string = '\n'.join(f"{k}={data_dict[k]}" for k in sorted(data_dict))
        
        tokens = {
            'Evergreen': EVERGREEN_BOT_TOKEN,
            'Legacy': LEGACY_BOT_TOKEN,
            'Alpha': ALPHA_BOT_TOKEN
        }
        
        for model, token in tokens.items():
            if not token:
                continue
            try:
                secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
                calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
                
                if calculated_hash == received_hash:
                    user_str = data_dict.get('user')
                    if user_str:
                        user_data = json.loads(user_str)
                        return {'user': user_data, 'model': model}
            except Exception:
                continue
        
        return None
    except Exception:
        return None


# ==========================================
# MINI APP ROUTES
# ==========================================

@app.post("/api/miniapp/auth")
async def miniapp_auth(request: Request):
    data = await request.json()
    init_data = data.get('initData')
    if not init_data:
        return JSONResponse({'success': False, 'status': 'invalid'})
    
    validated = validate_init_data(init_data)
    if not validated:
        return JSONResponse({'success': False, 'status': 'invalid'})
    
    user_data = validated['user']
    model = validated.get('model', 'Evergreen')
    
    telegram_id = str(user_data.get('id'))
    if not telegram_id:
        return JSONResponse({'success': False, 'status': 'invalid'})
    
    connection = get_db_connection()
    if connection is None:
        return JSONResponse({'success': False, 'status': 'error'})
    
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE telegram_id = %s", (telegram_id,))
        user = cursor.fetchone()
    finally:
        cursor.close()
        connection.close()
    
    if not user:
        return JSONResponse({'success': False, 'status': 'not_found', 'model': model})
    
    prefix = "Evergreen"
    if model == "Legacy":
        prefix = "Legacy"
    elif model == "Alpha":
        prefix = "Alpha"
    
    expiry_col = f"{prefix}_Expiry"
    access_col = f"{prefix}_Access"
    
    if user.get(expiry_col) and user[expiry_col] < date.today():
        return JSONResponse({'success': False, 'status': 'expired', 'model': model})
    
    if not user.get(access_col):
        return JSONResponse({'success': False, 'status': 'no_access', 'model': model})
    
    def get_val(simple_col):
        if simple_col == 'CR':
            return user.get(f"{prefix}_CR", False)
        if simple_col in ['BRK', 'CISD', 'CISD_PCL', 'LCY', 'LCY_Sweep']:
            return user.get(simple_col, False)
        if any(simple_col.startswith(entry) for entry in ['BRK_', 'CISD_', 'LCY_']):
            return user.get(simple_col, False)
        db_col = f"{prefix}_{simple_col}"
        return user.get(db_col, False)
    
    currency_pairs_cols = [
        'EURUSD', 'GBPUSD', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'EURCAD', 'GBPCAD',
        'EURNZD', 'GBPNZD', 'EURAUD', 'GBPAUD', 'AUDUSD', 'NZDUSD', 'AUDJPY', 'NZDJPY',
        'AUDCHF', 'NZDCHF', 'AUDCAD', 'NZDCAD', 'USDJPY', 'USDCHF', 'USDCAD'
    ]
    
    commodity_cols = ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL']
    crypto_cols = ['BTCUSD', 'ETHUSD', 'BTCUSDT', 'ETHUSDT']
    indices_cols = ['NAS100', 'SPX500', 'US30', 'DXY', 'BANKNIFTY', 'NIFTY']
    futures_cols = [
        'YM', 'NQ', 'MYM', 'MNQ', 'MCL', 'MRB', 'MES', 'CL', 'RB',
        'GC', 'SI', '6E', '6B', '6A', '6N', 'BTC', 'ETH', 'ES'
    ]
    
    cr_cols = ['CR', 'CR_OP', 'CR_First_Class']
    
    brk_cols = [
        'BRK', 'BRK_OP', 'BRK_Swing_SMT', 'BRK_Mitigation_SMT',
        'BRK_Swing_Strong_SMT_BUY', 'BRK_Swing_Weak_SMT_SELL',
        'BRK_Mitigation_Strong_SMT_BUY', 'BRK_Mitigation_Weak_SMT_SELL'
    ]
    
    cisd_cols = [
        'CISD', 'CISD_OP', 'CISD_Swing_SMT', 'CISD_Mitigation_SMT',
        'CISD_Swing_Strong_SMT_BUY', 'CISD_Swing_Weak_SMT_SELL',
        'CISD_Mitigation_Strong_SMT_BUY', 'CISD_Mitigation_Weak_SMT_SELL'
    ]
    
    cisd_pcl_cols = [
        'CISD_PCL', 'CISD_PCL_OP', 'CISD_PCL_Swing_SMT', 'CISD_PCL_Mitigation_SMT',
        'CISD_PCL_Swing_Strong_SMT_BUY', 'CISD_PCL_Swing_Weak_SMT_SELL',
        'CISD_PCL_Mitigation_Strong_SMT_BUY', 'CISD_PCL_Mitigation_Weak_SMT_SELL'
    ]
    
    lcy_cols = [
        'LCY', 'LCY_OP', 'LCY_Swing_SMT', 'LCY_Mitigation_SMT',
        'LCY_Swing_Strong_SMT_BUY', 'LCY_Swing_Weak_SMT_SELL',
        'LCY_Mitigation_Strong_SMT_BUY', 'LCY_Mitigation_Weak_SMT_SELL',
        'LCY_First_Class'
    ]
    
    lcy_sweep_cols = [
        'LCY_Sweep', 'LCY_Sweep_OP', 'LCY_Sweep_Swing_SMT', 'LCY_Sweep_Mitigation_SMT',
        'LCY_Sweep_Swing_Strong_SMT_BUY', 'LCY_Sweep_Swing_Weak_SMT_SELL',
        'LCY_Sweep_Mitigation_Strong_SMT_BUY', 'LCY_Sweep_Mitigation_Weak_SMT_SELL',
        'LCY_Sweep_First_Class'
    ]
    
    events_data = {}
    if model == "Evergreen":
        events_data['CR'] = [col for col in cr_cols if get_val(col)]
        events_data['BRK'] = [col for col in brk_cols if get_val(col)]
        events_data['CISD'] = [col for col in cisd_cols if get_val(col)]
        events_data['CISD_PCL'] = [col for col in cisd_pcl_cols if get_val(col)]
    elif model == "Legacy":
        legacy_cr_map = {
            'CR': 'Legacy_CR',
            'CR_OP': 'Legacy_CR_OP',
            'CR_First_Class': 'Legacy_CR_First_Class'
        }
        active_cr = []
        for key, db_col_suffix in legacy_cr_map.items():
            if user.get(db_col_suffix):
                active_cr.append(key)
        events_data['CR'] = active_cr
        events_data['LCY'] = [col for col in lcy_cols if get_val(col)]
        events_data['LCY_Sweep'] = [col for col in lcy_sweep_cols if get_val(col)]
    elif model == "Alpha":
        events_data['CR'] = [col for col in cr_cols if get_val(col)]
        events_data['BRK'] = [col for col in brk_cols if get_val(col)]
        events_data['CISD'] = [col for col in cisd_cols if get_val(col)]
        events_data['CISD_PCL'] = [col for col in cisd_pcl_cols if get_val(col)]
    
    filters = {
        'currency_pairs': [col for col in currency_pairs_cols if get_val(col)],
        'commodity': [col for col in commodity_cols if get_val(col)],
        'crypto': [col for col in crypto_cols if get_val(col)],
        'indices': [col for col in indices_cols if get_val(col)],
        'futures': [col for col in futures_cols if get_val(col)],
        'timeframes': [col for col in ['1M', '5M', '15M', '1H', '4H', '1D'] if get_val(col)],
        'events': events_data,
        'directions': [col for col in ['Bull', 'Bear'] if get_val(col)],
        'zone': [col for col in ['Zone'] if get_val(col)]
    }
    
    return JSONResponse({'success': True, 'user': {'id': user['id']}, 'filters': filters, 'model': model})


@app.get("/api/miniapp/filters")
def miniapp_filter_lists(model: str = "Evergreen"):
    def obj(label, value):
        return {'label': label, 'value': value}
    
    cr_options = [obj('CR', 'CR')]
    
    events_filters = {}
    events_filters['CR'] = {
        'Entry': cr_options,
        'Filters': [obj('OP', 'CR_OP')] if model != "Legacy" else [obj('First Class', 'CR_First_Class'), obj('OP', 'CR_OP')],
        'SMT': []
    }
    
    if model == "Evergreen":
        events_filters.update({
            'BRK': {
                'Entry': [obj('BRK', 'BRK')],
                'Filters': [obj('OP', 'BRK_OP')],
                'SMT': [
                    obj('Swing', 'BRK_Swing_SMT'),
                    obj('Strong SMT', 'BRK_Swing_Strong_SMT_BUY'),
                    obj('Weak SMT', 'BRK_Swing_Weak_SMT_SELL'),
                    obj('Mitigation', 'BRK_Mitigation_SMT'),
                    obj('Strong SMT', 'BRK_Mitigation_Strong_SMT_BUY'),
                    obj('Weak SMT', 'BRK_Mitigation_Weak_SMT_SELL')
                ]
            },
            'CISD': {
                'Entry': [obj('CISD', 'CISD')],
                'Filters': [obj('OP', 'CISD_OP')],
                'SMT': [
                    obj('Swing', 'CISD_Swing_SMT'),
                    obj('Strong SMT', 'CISD_Swing_Strong_SMT_BUY'),
                    obj('Weak SMT', 'CISD_Swing_Weak_SMT_SELL'),
                    obj('Mitigation', 'CISD_Mitigation_SMT'),
                    obj('Strong SMT', 'CISD_Mitigation_Strong_SMT_BUY'),
                    obj('Weak SMT', 'CISD_Mitigation_Weak_SMT_SELL')
                ]
            },
            'CISD_PCL': {
                'Entry': [obj('CISD PCL', 'CISD_PCL')],
                'Filters': [obj('OP', 'CISD_PCL_OP')],
                'SMT': [
                    obj('Swing', 'CISD_PCL_Swing_SMT'),
                    obj('Strong SMT', 'CISD_PCL_Swing_Strong_SMT_BUY'),
                    obj('Weak SMT', 'CISD_PCL_Swing_Weak_SMT_SELL'),
                    obj('Mitigation', 'CISD_PCL_Mitigation_SMT'),
                    obj('Strong SMT', 'CISD_PCL_Mitigation_Strong_SMT_BUY'),
                    obj('Weak SMT', 'CISD_PCL_Mitigation_Weak_SMT_SELL')
                ]
            }
        })
    elif model == "Legacy":
        events_filters.update({
            'LCY': {
                'Entry': [obj('LCY', 'LCY')],
                'Filters': [obj('OP', 'LCY_OP'), obj('First Class', 'LCY_First_Class')],
                'SMT': [
                    obj('Swing', 'LCY_Swing_SMT'),
                    obj('Strong SMT', 'LCY_Swing_Strong_SMT_BUY'),
                    obj('Weak SMT', 'LCY_Swing_Weak_SMT_SELL'),
                    obj('Mitigation', 'LCY_Mitigation_SMT'),
                    obj('Strong SMT', 'LCY_Mitigation_Strong_SMT_BUY'),
                    obj('Weak SMT', 'LCY_Mitigation_Weak_SMT_SELL')
                ]
            },
            'LCY_Sweep': {
                'Entry': [obj('LCY Sweep', 'LCY_Sweep')],
                'Filters': [obj('OP', 'LCY_Sweep_OP'), obj('First Class', 'LCY_Sweep_First_Class')],
                'SMT': [
                    obj('Swing', 'LCY_Sweep_Swing_SMT'),
                    obj('Strong SMT', 'LCY_Sweep_Swing_Strong_SMT_BUY'),
                    obj('Weak SMT', 'LCY_Sweep_Swing_Weak_SMT_SELL'),
                    obj('Mitigation', 'LCY_Sweep_Mitigation_SMT'),
                    obj('Strong SMT', 'LCY_Sweep_Mitigation_Strong_SMT_BUY'),
                    obj('Weak SMT', 'LCY_Sweep_Mitigation_Weak_SMT_SELL')
                ]
            }
        })
    elif model == "Alpha":
        events_filters.update({
            'BRK': {
                'Entry': [obj('BRK', 'BRK')],
                'Filters': [obj('OP', 'BRK_OP')],
                'SMT': [
                    obj('Swing', 'BRK_Swing_SMT'),
                    obj('Strong SMT', 'BRK_Swing_Strong_SMT_BUY'),
                    obj('Weak SMT', 'BRK_Swing_Weak_SMT_SELL'),
                    obj('Mitigation', 'BRK_Mitigation_SMT'),
                    obj('Strong SMT', 'BRK_Mitigation_Strong_SMT_BUY'),
                    obj('Weak SMT', 'BRK_Mitigation_Weak_SMT_SELL')
                ]
            },
            'CISD': {
                'Entry': [obj('CISD', 'CISD')],
                'Filters': [obj('OP', 'CISD_OP')],
                'SMT': [
                    obj('Swing', 'CISD_Swing_SMT'),
                    obj('Strong SMT', 'CISD_Swing_Strong_SMT_BUY'),
                    obj('Weak SMT', 'CISD_Swing_Weak_SMT_SELL'),
                    obj('Mitigation', 'CISD_Mitigation_SMT'),
                    obj('Strong SMT', 'CISD_Mitigation_Strong_SMT_BUY'),
                    obj('Weak SMT', 'CISD_Mitigation_Weak_SMT_SELL')
                ]
            },
            'CISD_PCL': {
                'Entry': [obj('CISD PCL', 'CISD_PCL')],
                'Filters': [obj('OP', 'CISD_PCL_OP')],
                'SMT': [
                    obj('Swing', 'CISD_PCL_Swing_SMT'),
                    obj('Strong SMT', 'CISD_PCL_Swing_Strong_SMT_BUY'),
                    obj('Weak SMT', 'CISD_PCL_Swing_Weak_SMT_SELL'),
                    obj('Mitigation', 'CISD_PCL_Mitigation_SMT'),
                    obj('Strong SMT', 'CISD_PCL_Mitigation_Strong_SMT_BUY'),
                    obj('Weak SMT', 'CISD_PCL_Mitigation_Weak_SMT_SELL')
                ]
            }
        })
    
    return JSONResponse({
        'currency_pairs': [
            'EURUSD', 'GBPUSD', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'EURCAD', 'GBPCAD',
            'EURNZD', 'GBPNZD', 'EURAUD', 'GBPAUD', 'AUDUSD', 'NZDUSD', 'AUDJPY', 'NZDJPY',
            'AUDCHF', 'NZDCHF', 'AUDCAD', 'NZDCAD', 'USDJPY', 'USDCHF', 'USDCAD'
        ],
        'commodity': ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL'],
        'crypto': ['BTCUSD', 'ETHUSD', 'BTCUSDT', 'ETHUSDT'],
        'indices': ['NAS100', 'SPX500', 'US30', 'DXY', 'BANKNIFTY', 'NIFTY'],
        'futures': [
            'YM', 'NQ', 'MYM', 'MNQ', 'MCL', 'MRB', 'MES', 'CL', 'RB',
            'GC', 'SI', '6E', '6B', '6A', '6N', 'BTC', 'ETH', 'ES'
        ],
        'timeframes': ['1M', '5M', '15M', '1H', '4H', '1D'],
        'events': events_filters,
        'directions': ['Bull', 'Bear'],
        'zone': ['Zone']
    })


@app.post("/api/miniapp/filters/{user_id}/{filter_type}")
async def miniapp_update_filter(user_id: int, filter_type: str, request: Request):
    data = await request.json()
    filter_name = data.get('filter')
    enabled = data.get('enabled')
    model = data.get('model', 'Evergreen')
    
    if filter_name is None or enabled is None:
        return JSONResponse({'success': False})
    
    connection = get_db_connection()
    if connection is None:
        return JSONResponse({'success': False})
    
    cursor = connection.cursor()
    try:
        prefix = "Evergreen"
        if model == "Legacy":
            prefix = "Legacy"
        elif model == "Alpha":
            prefix = "Alpha"
        
        expiry_col = f"{prefix}_Expiry"
        access_col = f"{prefix}_Access"
        
        cursor.execute(
            f"SELECT id FROM {DB_TABLE_USERS} WHERE id = %s AND {expiry_col} >= CURDATE() AND {access_col} = TRUE",
            (user_id,)
        )
        if not cursor.fetchone():
            return JSONResponse({'success': False, 'message': 'Invalid user, expired, or no access'})
        
        db_col = filter_name
        needs_prefix = True
        
        if filter_name in ['BRK', 'CISD', 'CISD_PCL', 'LCY', 'LCY_Sweep']:
            needs_prefix = False
        elif any(filter_name.startswith(entry) for entry in ['BRK_', 'CISD_', 'LCY_']):
            needs_prefix = False
        
        if filter_name == 'CR':
            db_col = f"{prefix}_CR"
            needs_prefix = False
        elif filter_name in ['OP', 'CR_OP']:
            db_col = f"{prefix}_CR_OP"
            needs_prefix = False
        elif filter_name in ['First Class', 'CR_First_Class']:
            db_col = f"{prefix}_CR_First_Class"
            needs_prefix = False
        
        if needs_prefix:
            db_col = f"{prefix}_{filter_name}"
        
        cursor.execute(f"UPDATE {DB_TABLE_USERS} SET `{db_col}` = %s WHERE id = %s", (enabled, user_id))
        connection.commit()
        return JSONResponse({'success': True})
    except mysql.connector.Error as err:
        print(f"Error updating filter: {err}")
        return JSONResponse({'success': False})
    finally:
        cursor.close()
        connection.close()


@app.post("/api/miniapp/filters/batch_update/{user_id}")
async def miniapp_batch_update(user_id: int, request: Request):
    data = await request.json()
    changes = data.get('changes')
    model = data.get('model', 'Evergreen')
    
    if not isinstance(changes, list):
        return JSONResponse({'success': False, 'message': 'Invalid data format.'})
    
    connection = get_db_connection()
    if connection is None:
        return JSONResponse({'success': False, 'message': 'Database connection error.'})
    
    cursor = connection.cursor()
    try:
        prefix = "Evergreen"
        if model == "Legacy":
            prefix = "Legacy"
        elif model == "Alpha":
            prefix = "Alpha"
        
        expiry_col = f"{prefix}_Expiry"
        access_col = f"{prefix}_Access"
        
        cursor.execute(
            f"SELECT id FROM {DB_TABLE_USERS} WHERE id = %s AND {expiry_col} >= CURDATE() AND {access_col} = TRUE",
            (user_id,)
        )
        if not cursor.fetchone():
            return JSONResponse({'success': False, 'message': 'User not found, expired, or no access.'})
        
        for change in changes:
            filter_name = change.get('filterName')
            enabled = bool(change.get('enabled'))
            
            if not filter_name:
                continue
            
            db_col = filter_name
            needs_prefix = True
            
            if filter_name in ['BRK', 'CISD', 'CISD_PCL', 'LCY', 'LCY_Sweep']:
                needs_prefix = False
            elif any(filter_name.startswith(entry) for entry in ['BRK_', 'CISD_', 'LCY_']):
                needs_prefix = False
            
            if filter_name == 'CR':
                db_col = f"{prefix}_CR"
                needs_prefix = False
            elif filter_name in ['OP', 'CR_OP']:
                db_col = f"{prefix}_CR_OP"
                needs_prefix = False
            elif filter_name in ['First Class', 'CR_First_Class']:
                db_col = f"{prefix}_CR_First_Class"
                needs_prefix = False
            
            if needs_prefix:
                db_col = f"{prefix}_{filter_name}"
            
            try:
                cursor.execute(f"UPDATE {DB_TABLE_USERS} SET `{db_col}` = %s WHERE id = %s", (enabled, user_id))
            except mysql.connector.Error as err:
                connection.rollback()
                print(f"Batch DB Error on column {db_col}: {err}")
                return JSONResponse({'success': False, 'message': f'Failed on {db_col}'})
        
        connection.commit()
        return JSONResponse({'success': True})
    except Exception as err:
        print(f"Batch update error: {err}")
        return JSONResponse({'success': False, 'message': str(err)})
    finally:
        cursor.close()
        connection.close()


# ==========================================
# MINI APP BOT INTEGRATION
# ==========================================

@app.post("/api/bot/set-menu-button")
async def set_bot_menu_button(
    request: Request,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Set the bot's menu button to open the Mini App.
    Call this once per bot after ngrok starts or domain changes.
    """
    data = await request.json()
    bot_token_env = data.get('bot_token_env', 'EVERGREEN_BOT_TOKEN')
    miniapp_url = data.get('miniapp_url')
    
    if not miniapp_url:
        raise HTTPException(status_code=400, detail="miniapp_url is required")
    
    bot_token = os.getenv(bot_token_env)
    if not bot_token:
        raise HTTPException(status_code=400, detail=f"{bot_token_env} not set")
    
    # Set the menu button for the bot
    url = f"https://api.telegram.org/bot{bot_token}/setChatMenuButton"
    payload = {
        "menu_button": {
            "type": "web_app",
            "text": "Manage Filters",
            "web_app": {"url": miniapp_url}
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            result = response.json()
            if result.get('ok'):
                return {"success": True, "message": "Menu button set", "bot": bot_token_env}
            else:
                return JSONResponse(
                    {"success": False, "message": result.get('description', 'Unknown error')},
                    status_code=400
                )
    except Exception as e:
        return JSONResponse({"success": False, "message": str(e)}, status_code=500)


@app.post("/api/bot/send-webapp-button")
async def send_webapp_button(
    request: Request,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Send a message with an inline button that opens the Mini App.
    """
    data = await request.json()
    chat_id = data.get('chat_id')
    bot_token_env = data.get('bot_token_env', 'EVERGREEN_BOT_TOKEN')
    miniapp_url = data.get('miniapp_url')
    text = data.get('text', 'Click below to open the app:')
    button_text = data.get('button_text', 'Open Mini App')
    
    if not chat_id or not miniapp_url:
        raise HTTPException(status_code=400, detail="chat_id and miniapp_url are required")
    
    bot_token = os.getenv(bot_token_env)
    if not bot_token:
        raise HTTPException(status_code=400, detail=f"{bot_token_env} not set")
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "reply_markup": {
            "inline_keyboard": [[{
                "text": button_text,
                "web_app": {"url": miniapp_url}
            }]]
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            return response.json()
    except Exception as e:
        return JSONResponse({"success": False, "message": str(e)}, status_code=500)


# ==========================================
# SPA CATCH-ALL (must be last route)
# ==========================================
@app.get("/{full_path:path}", response_class=FileResponse)
def serve_spa_catchall(full_path: str):
    return FileResponse("main.html")


# ==========================================
# APP EXECUTION
# ==========================================
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    