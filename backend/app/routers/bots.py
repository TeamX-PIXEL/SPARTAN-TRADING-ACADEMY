import os
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import httpx
import jwt

from app.database import get_db, get_db_connection
from app.models import Bot, User
from app.schemas import BotResponse, BotPublicResponse, BotUpdate
from app.core.deps import get_current_user, get_current_admin
from app.core.security import SECRET_KEY, ALGORITHM
from app.services.telegram import DB_TABLE_USERS

router = APIRouter(prefix="", tags=["Bots"])

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# ==========================================
# HELPERS
# ==========================================
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


def _build_bot_response(bot: Bot, current_user: Optional[User], db: Session):
    is_purchased = False
    expiry = None
    api_key = None
    user_telegram_id = None
    if current_user:
        model = get_bot_model(bot.token_env)
        if model:
            is_purchased, expiry_date = get_user_signal_access(current_user.UserID, model)
            if expiry_date:
                expiry = expiry_date.isoformat()
            # Fetch the API key and telegram_id from signal_users for purchased bots
            if is_purchased:
                connection = get_db_connection()
                if connection:
                    cursor = connection.cursor(dictionary=True)
                    try:
                        cursor.execute(
                            f"SELECT user_key, telegram_id FROM {DB_TABLE_USERS} WHERE user = %s",
                            (current_user.UserID,)
                        )
                        row = cursor.fetchone()
                        if row:
                            api_key = row.get("user_key")
                            user_telegram_id = row.get("telegram_id")
                    finally:
                        cursor.close()
                        connection.close()
    return {
        "bot_name": bot.bot_name,
        "display_name": bot.display_name,
        "description": bot.description,
        "price": bot.price,
        "thumbnail": bot.thumbnail,
        "token_env": bot.token_env,
        "telegram_id": bot.telegram_id,
        "status": bot.status,
        "product_uuid": bot.product_uuid,
        "is_purchased": is_purchased,
        "expiry": expiry,
        "api_key": api_key,
        "user_telegram_id": user_telegram_id,
    }


# ==========================================
# PUBLIC / CLIENT ENDPOINTS
# ==========================================
@router.get("/clientrequest/bots", response_model=List[BotPublicResponse])
def get_bots(db: Session = Depends(get_db)):
    return db.query(Bot).filter(Bot.status == "active").all()


@router.get("/public/bots", response_model=List[BotPublicResponse])
def get_public_bots(
    skip: int = 0,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Public endpoint to fetch available bots with pagination."""
    bots = db.query(Bot).filter(Bot.status == "active").offset(skip).limit(limit).all()
    return [_build_bot_response(b, current_user, db) for b in bots]


@router.get("/public/bots/{product_uuid}", response_model=BotPublicResponse)
def get_public_bot(
    product_uuid: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    bot = db.query(Bot).filter(Bot.product_uuid == product_uuid, Bot.status == "active").first()
    if not bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    return _build_bot_response(bot, current_user, db)


@router.get("/api/bot/start-link/{bot_id}")
def get_bot_start_link(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns a Telegram deep link so the user can start the bot with their API key.
    Format: https://t.me/<bot_username>?start=<api_key>
    """
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.status == "active").first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    if not bot.telegram_id:
        raise HTTPException(status_code=400, detail="Bot has no Telegram ID configured")

    # Find the user's API key from signal_users
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection error")

    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            f"SELECT user_key FROM {DB_TABLE_USERS} WHERE user = %s",
            (current_user.UserID,)
        )
        row = cursor.fetchone()
        if not row or not row.get("user_key"):
            raise HTTPException(status_code=404, detail="No API key found for this user. Please purchase a bot first.")
        api_key = row["user_key"]
    finally:
        cursor.close()
        connection.close()

    # Build the deep link
    deep_link = f"https://t.me/{bot.telegram_id}?start={api_key}"
    return {"start_link": deep_link, "bot_name": bot.display_name, "api_key": api_key}


# ==========================================
# ADMIN ENDPOINTS
# ==========================================
@router.get("/api/admin/bots", response_model=List[BotResponse])
def get_all_bots(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    return db.query(Bot).all()


@router.get("/api/admin/fetch/bot/{bot_id}", response_model=BotResponse)
def get_bot(bot_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    return bot


@router.patch("/api/admin/edit/bot/{bot_id}", response_model=BotResponse)
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


@router.delete("/api/admin/delete/bot/{bot_id}")
def delete_bot(bot_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    db_bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    db.delete(db_bot)
    db.commit()
    return {"message": f"Bot '{db_bot.bot_name}' deleted successfully"}


# ==========================================
# TELEGRAM BOT API ENDPOINTS
# ==========================================
@router.post("/api/bot/set-menu-button")
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


@router.post("/api/bot/send-webapp-button")
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


# ---------------------------------------------------------------------------
# Router for raw MySQL signal_users CRUD (exact original logic)
# ---------------------------------------------------------------------------
api_router = APIRouter(prefix="", tags=["Signal Users API"])


@api_router.get("/api/admin/botusers")
async def get_users_api(current_admin=Depends(get_current_admin)):
    """Get all users from raw signal_users table (Admin Only)."""
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS}")
        users = cursor.fetchall()
        from fastapi.encoders import jsonable_encoder
        encoded_users = jsonable_encoder(users)
        return JSONResponse(content={"success": True, "count": len(users), "users": encoded_users})
    except mysql.connector.Error as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@api_router.get("/api/admin/botusers/{user_id}")
async def get_single_user_api(user_id: int, current_admin=Depends(get_current_admin)):
    """Fetch a single raw signal user's data."""
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()

        if user_data is None:
            raise HTTPException(status_code=404, detail="User not found")

        from fastapi.encoders import jsonable_encoder
        encoded_user_data = jsonable_encoder(user_data)
        return JSONResponse(content={"success": True, "user": encoded_user_data}, status_code=200)
    except mysql.connector.Error as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@api_router.post("/api/admin/botusers")
async def add_user_api(request: Request, current_admin=Depends(get_current_admin)):
    """Add a new user to raw signal_users table (supports all fields)."""
    import mysql.connector
    from fastapi.encoders import jsonable_encoder

    data = await request.json()
    if not data:
        return JSONResponse(content={"success": False, "message": "No data provided"}, status_code=400)

    user = data.get("user") or None
    telegram_id = data.get("telegram_id") or None
    user_key = data.get("user_key", "")

    evergreen_expiry = data.get("evergreen_expiry", "2099-12-31")
    legacy_expiry = data.get("legacy_expiry", "2099-12-31")
    alpha_expiry = data.get("alpha_expiry", "2099-12-31")

    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor()
    try:
        if telegram_id:
            cursor.execute(f"SELECT COUNT(*) FROM {DB_TABLE_USERS} WHERE telegram_id = %s", (telegram_id,))
            if cursor.fetchone()[0] > 0:
                return JSONResponse(content={"success": False, "message": "Telegram ID already exists"}, status_code=409)

        symbols = [
            "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURCHF", "GBPCHF", "EURCAD", "GBPCAD",
            "EURNZD", "GBPNZD", "EURAUD", "GBPAUD", "AUDUSD", "NZDUSD", "AUDJPY", "NZDJPY", "AUDCHF",
            "NZDCHF", "AUDCAD", "NZDCAD", "USDCHF", "USDCAD", "XAUUSD", "XAGUSD", "USOIL", "UKOIL",
            "BTCUSD", "ETHUSD", "BTCUSDT", "ETHUSDT", "NAS100", "SPX500", "US30", "DXY", "BANKNIFTY",
            "NIFTY", "YM", "NQ", "MYM", "MNQ", "MCL", "MRB", "MES", "CL", "RB", "GC", "SI", "6E", "6B",
            "6A", "6N", "BTC", "ETH", "ES"
        ]

        timeframes = ["1M", "5M", "15M", "1H", "4H", "1D"]

        columns = [
            "user_key", "user", "telegram_id", "Evergreen_Expiry", "Legacy_Expiry", "Alpha_Expiry",
            "Evergreen_Access", "Legacy_Access", "Alpha_Access"
        ]
        values = [
            user_key, user, telegram_id, evergreen_expiry, legacy_expiry, alpha_expiry,
            data.get("evergreen_access", 1), data.get("legacy_access", 0), data.get("alpha_access", 0)
        ]
        placeholders = ["%s"] * len(columns)

        user_symbols = data.get("symbols", {})
        user_timeframes = data.get("timeframes", {})
        user_trends = data.get("trends", {})
        user_entries = data.get("entries", [])

        for symbol in symbols:
            for prefix in ["Evergreen", "Legacy", "Alpha"]:
                col_name = f"{prefix}_{symbol}"
                columns.append(col_name)
                enabled = symbol in user_symbols.get(prefix.lower(), []) if prefix.lower() in user_symbols else 0
                values.append(1 if enabled else 0)
                placeholders.append("%s")

        for tf in timeframes:
            for prefix in ["Evergreen", "Legacy", "Alpha"]:
                col_name = f"{prefix}_{tf}"
                columns.append(col_name)
                enabled = tf in user_timeframes.get(prefix.lower(), []) if prefix.lower() in user_timeframes else 0
                values.append(1 if enabled else 0)
                placeholders.append("%s")

        for prefix in ["Evergreen", "Legacy", "Alpha"]:
            prefix_lower = prefix.lower()
            columns.extend([f"{prefix}_Bull", f"{prefix}_Bear", f"{prefix}_Zone"])
            trend_data = user_trends.get(prefix_lower, {})
            values.extend([
                1 if trend_data.get("bull", False) else 0,
                1 if trend_data.get("bear", False) else 0,
                1 if trend_data.get("zone", False) else 0
            ])
            placeholders.extend(["%s", "%s", "%s"])

        entry_types = ["CR", "BRK", "CISD", "CISD_PCL", "LCY", "LCY_Sweep"]
        for entry in entry_types:
            if entry in ["CR"]:
                for pf in ["Evergreen", "Legacy"]:
                    col_name = f"{pf}_CR"
                    columns.append(col_name)
                    values.append(1 if entry in user_entries else 0)
                    placeholders.append("%s")
            else:
                columns.append(entry)
                values.append(1 if entry in user_entries else 0)
                placeholders.append("%s")

        query = f"INSERT INTO {DB_TABLE_USERS} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
        cursor.execute(query, values)
        connection.commit()

        return JSONResponse(content={"success": True, "message": "User added successfully", "user_id": cursor.lastrowid}, status_code=201)
    except mysql.connector.Error as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@api_router.get("/api/admin/botuser/{user_id}/details")
async def get_user_details_api(request: Request, user_id: int, current_admin=Depends(get_current_admin)):
    """Get detailed raw signal user information."""
    from fastapi.encoders import jsonable_encoder

    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database error"}, status_code=500)

    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        symbol_count = sum(
            1 for key in user.keys()
            if key.startswith("Evergreen_")
            and key not in ["Evergreen_Access", "Evergreen_Expiry", "Evergreen_Bull", "Evergreen_Bear", "Evergreen_Zone"]
            and not any(tf in key for tf in ["_1M", "_5M", "_15M", "_1H", "_4H", "_1D"])
            and user[key]
        )
        user["symbol_count"] = symbol_count
        encoded_user = jsonable_encoder(user)
        return JSONResponse(content={"success": True, "user": encoded_user})
    except Exception as e:
        return JSONResponse(content={"success": False, "message": str(e)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@api_router.put("/api/admin/botusers/{user_id}")
async def edit_user_api(user_id: int, request: Request, current_admin=Depends(get_current_admin)):
    """Update an existing raw signal user in database (supports all fields)."""
    import mysql.connector

    data = await request.json()
    if not data:
        return JSONResponse(content={"success": False, "message": "No data provided"}, status_code=400)

    user = data.get("user")
    telegram_id = data.get("telegram_id")
    user_key = data.get("user_key", "")

    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor()
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {DB_TABLE_USERS} WHERE telegram_id = %s AND id != %s", (telegram_id, user_id))
        if cursor.fetchone()[0] > 0:
            return JSONResponse(content={"success": False, "message": "Telegram ID already exists for another user"}, status_code=409)

        update_fields = [
            "user_key = %s", "user = %s", "telegram_id = %s",
            "Evergreen_Expiry = %s", "Legacy_Expiry = %s", "Alpha_Expiry = %s",
            "Evergreen_Access = %s", "Legacy_Access = %s", "Alpha_Access = %s"
        ]
        values = [
            user_key, user, telegram_id,
            data.get("evergreen_expiry", "2099-12-31"), data.get("legacy_expiry", "2099-12-31"), data.get("alpha_expiry", "2099-12-31"),
            data.get("evergreen_access", 1), data.get("legacy_access", 0), data.get("alpha_access", 0)
        ]

        user_symbols = data.get("symbols", {})
        user_timeframes = data.get("timeframes", {})
        user_trends = data.get("trends", {})
        user_entries = data.get("entries", [])

        symbols = [
            "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURCHF", "GBPCHF", "EURCAD", "GBPCAD",
            "EURNZD", "GBPNZD", "EURAUD", "GBPAUD", "AUDUSD", "NZDUSD", "AUDJPY", "NZDJPY", "AUDCHF",
            "NZDCHF", "AUDCAD", "NZDCAD", "USDCHF", "USDCAD", "XAUUSD", "XAGUSD", "USOIL", "UKOIL",
            "BTCUSD", "ETHUSD", "BTCUSDT", "ETHUSDT", "NAS100", "SPX500", "US30", "DXY", "BANKNIFTY",
            "NIFTY", "YM", "NQ", "MYM", "MNQ", "MCL", "MRB", "MES", "CL", "RB", "GC", "SI", "6E", "6B",
            "6A", "6N", "BTC", "ETH", "ES"
        ]

        for symbol in symbols:
            for prefix in ["Evergreen", "Legacy", "Alpha"]:
                col_name = f"{prefix}_{symbol}"
                update_fields.append(f"{col_name} = %s")
                enabled = symbol in user_symbols.get(prefix.lower(), []) if prefix.lower() in user_symbols else 0
                values.append(1 if enabled else 0)

        timeframes = ["1M", "5M", "15M", "1H", "4H", "1D"]
        for tf in timeframes:
            for prefix in ["Evergreen", "Legacy", "Alpha"]:
                col_name = f"{prefix}_{tf}"
                update_fields.append(f"{col_name} = %s")
                enabled = tf in user_timeframes.get(prefix.lower(), []) if prefix.lower() in user_timeframes else 0
                values.append(1 if enabled else 0)

        for prefix in ["Evergreen", "Legacy", "Alpha"]:
            prefix_lower = prefix.lower()
            update_fields.extend([f"{prefix}_Bull = %s", f"{prefix}_Bear = %s", f"{prefix}_Zone = %s"])
            trend_data = user_trends.get(prefix_lower, {})
            values.extend([
                1 if trend_data.get("bull", False) else 0,
                1 if trend_data.get("bear", False) else 0,
                1 if trend_data.get("zone", False) else 0
            ])

        entry_types = ["CR", "BRK", "CISD", "CISD_PCL", "LCY", "LCY_Sweep"]
        for entry in entry_types:
            if entry == "CR":
                for pf in ["Evergreen", "Legacy"]:
                    col_name = f"{pf}_CR"
                    update_fields.append(f"{col_name} = %s")
                    values.append(1 if entry in user_entries else 0)
            else:
                update_fields.append(f"{entry} = %s")
                values.append(1 if entry in user_entries else 0)

        modifier_cols = [
            "Evergreen_CR_OP", "Legacy_CR_OP", "Legacy_CR_First_Class", "Legacy_CR_TPR",
            "BRK_OP", "BRK_Swing_SMT", "BRK_Mitigation_SMT", "BRK_Swing_Strong_SMT_BUY", "BRK_Swing_Weak_SMT_SELL",
            "BRK_Mitigation_Strong_SMT_BUY", "BRK_Mitigation_Weak_SMT_SELL",
            "CISD_OP", "CISD_Swing_SMT", "CISD_Mitigation_SMT", "CISD_Swing_Strong_SMT_BUY", "CISD_Swing_Weak_SMT_SELL",
            "CISD_Mitigation_Strong_SMT_BUY", "CISD_Mitigation_Weak_SMT_SELL",
            "CISD_PCL_OP", "CISD_PCL_Swing_SMT", "CISD_PCL_Mitigation_SMT",
            "CISD_PCL_Swing_Strong_SMT_BUY", "CISD_PCL_Swing_Weak_SMT_SELL",
            "CISD_PCL_Mitigation_Strong_SMT_BUY", "CISD_PCL_Mitigation_Weak_SMT_SELL",
            "LCY_OP", "LCY_Swing_SMT", "LCY_Mitigation_SMT", "LCY_Swing_Strong_SMT_BUY", "LCY_Swing_Weak_SMT_SELL",
            "LCY_Mitigation_Strong_SMT_BUY", "LCY_Mitigation_Weak_SMT_SELL", "LCY_First_Class", "LCY_TPR",
            "LCY_Sweep_OP", "LCY_Sweep_Swing_SMT", "LCY_Sweep_Mitigation_SMT",
            "LCY_Sweep_Swing_Strong_SMT_BUY", "LCY_Sweep_Swing_Weak_SMT_SELL",
            "LCY_Sweep_Mitigation_Strong_SMT_BUY", "LCY_Sweep_Mitigation_Weak_SMT_SELL",
            "LCY_Sweep_First_Class", "LCY_Sweep_TPR"
        ]

        for col in modifier_cols:
            update_fields.append(f"{col} = %s")
            is_enabled = (
                ("mod_OP" in user_entries and "OP" in col) or
                ("mod_FirstClass" in user_entries and "First_Class" in col) or
                ("mod_TPR" in user_entries and "TPR" in col) or
                ("mod_SwingSMT" in user_entries and "Swing_SMT" in col) or
                ("mod_MitigationSMT" in user_entries and "Mitigation_SMT" in col) or
                ("Strong" in col and "mod_SwingSMT" in user_entries) or
                ("Weak" in col and "mod_SwingSMT" in user_entries)
            )
            values.append(1 if is_enabled else 0)

        values.append(user_id)
        query = f"UPDATE {DB_TABLE_USERS} SET {', '.join(update_fields)} WHERE id = %s"

        cursor.execute(query, values)
        connection.commit()
        return JSONResponse(content={"success": True, "message": "User updated successfully"}, status_code=200)
    except mysql.connector.Error as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@api_router.delete("/api/admin/botusers/{user_id}")
async def delete_user_api(request: Request, user_id: int, current_admin=Depends(get_current_admin)):
    """Delete a raw signal user."""
    import mysql.connector

    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor()
    try:
        cursor.execute(f"DELETE FROM {DB_TABLE_USERS} WHERE id = %s", (user_id,))
        connection.commit()

        if cursor.rowcount > 0:
            return JSONResponse(content={"success": True, "message": "User deleted successfully"})
        else:
            return JSONResponse(content={"success": False, "message": "User not found"}, status_code=404)
    except mysql.connector.Error as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()
