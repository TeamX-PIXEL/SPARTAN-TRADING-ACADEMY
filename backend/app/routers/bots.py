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
from app.models import Bot, BotMember, User, Transaction
from app.schemas import BotCreate, BotResponse, BotPublicResponse, BotUpdate, BotMemberResponse, BotMemberUpdate, AddBotMemberRequest
from app.core.deps import get_current_user, get_current_admin
from app.core.security import SECRET_KEY, ALGORITHM
from app.services.telegram import DB_TABLE_EVERGREEN, DB_TABLE_LEGACY

router = APIRouter(prefix="", tags=["Bots"])

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# ==========================================
# HELPERS
# ==========================================
def get_optional_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None


# ==========================================
# ADMIN ENDPOINTS — BOTS CRUD
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


@router.post("/api/admin/bots", response_model=BotResponse)
def create_bot(bot_data: BotCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    existing = db.query(Bot).filter(Bot.bot_id == bot_data.bot_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Bot '{bot_data.bot_id}' already exists")
    bot = Bot(**bot_data.model_dump())
    db.add(bot)
    db.commit()
    db.refresh(bot)
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
    if db_bot.purchased_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete bot with enrolled members")
    db.delete(db_bot)
    db.commit()
    return {"message": f"Bot '{db_bot.title}' deleted successfully"}


# ==========================================
# ADMIN ENDPOINTS — BOT MEMBERS
# ==========================================
def _build_member_response(member, user=None, access_type="free"):
    name = ""
    email = ""
    if user:
        parts = [user.firstname, user.lastname]
        name = " ".join(p for p in parts if p) or user.UserID
        email = getattr(user, "email", "") or ""
    return {
        "id": member.id,
        "username": member.username,
        "bot_id": member.bot_id,
        "expiry": member.expiry,
        "joined_at": member.joined_at,
        "name": name,
        "email": email,
        "access_type": access_type,
    }


@router.get("/api/admin/bots/{bot_id}/members")
def get_bot_members(bot_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    members = db.query(BotMember).filter(BotMember.bot_id == bot.bot_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.UserID == m.username).first()
        txn = db.query(Transaction).filter(
            Transaction.username == m.username,
            Transaction.bot_id == bot.bot_id,
            Transaction.product_section == "Bot",
        ).order_by(Transaction.created_at.desc()).first()
        access_type = "paid" if txn and txn.amount and txn.amount > 0 else "free"
        result.append(_build_member_response(m, user, access_type))
    return result


@router.post("/api/admin/bots/{bot_id}/members")
def add_bot_member(bot_id: int, req: AddBotMemberRequest, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    existing = db.query(BotMember).filter(BotMember.username == req.username, BotMember.bot_id == bot.bot_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already enrolled in this bot")
    member = BotMember(
        username=req.username,
        bot_id=bot.bot_id,
        expiry=req.expiry,
    )
    db.add(member)
    bot.purchased_count += 1
    txn = Transaction(
        username=req.username,
        product_section="Bot",
        bot_id=bot.bot_id,
        expiry=req.expiry,
        amount=req.amount,
        method=req.method or ("Free" if req.amount == 0 else None),
        status="completed",
    )
    db.add(txn)
    db.commit()
    db.refresh(member)
    user = db.query(User).filter(User.UserID == member.username).first()
    access_type = "paid" if req.amount and req.amount > 0 else "free"
    return _build_member_response(member, user, access_type)


@router.patch("/api/admin/bots/members/{member_id}")
def update_bot_member(member_id: int, body: BotMemberUpdate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    member = db.query(BotMember).filter(BotMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if body.expiry is not None:
        member.expiry = body.expiry
    db.commit()
    db.refresh(member)
    user = db.query(User).filter(User.UserID == member.username).first()
    txn = db.query(Transaction).filter(
        Transaction.username == member.username,
        Transaction.bot_id == member.bot_id,
        Transaction.product_section == "Bot",
    ).order_by(Transaction.created_at.desc()).first()
    access_type = "paid" if txn and txn.amount and txn.amount > 0 else "free"
    return _build_member_response(member, user, access_type)


# ==========================================
# PUBLIC / CLIENT ENDPOINTS
# ==========================================
@router.get("/public/bots", response_model=List[BotPublicResponse])
def get_public_bots(
    skip: int = 0,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    bots = db.query(Bot).filter(Bot.status == "Running").offset(skip).limit(limit).all()
    return bots


@router.get("/public/bots/{bot_id}", response_model=BotPublicResponse)
def get_public_bot(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    bot = db.query(Bot).filter(Bot.bot_id == bot_id, Bot.status == "Running").first()
    if not bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    return bot


# ==========================================
# TELEGRAM BOT API ENDPOINTS
# ==========================================
@router.post("/api/bot/set-menu-button")
async def set_bot_menu_button(
    request: Request,
    current_admin: dict = Depends(get_current_admin)
):
    data = await request.json()
    bot_token_env = data.get('bot_token_env', 'EVERGREEN_BOT_TOKEN')
    miniapp_url = data.get('miniapp_url')

    if not miniapp_url:
        raise HTTPException(status_code=400, detail="miniapp_url is required")

    bot_token = os.getenv(bot_token_env)
    if not bot_token:
        raise HTTPException(status_code=400, detail=f"{bot_token_env} not set")

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
# Router for raw MySQL bot alert filter CRUD
# ---------------------------------------------------------------------------
api_router = APIRouter(prefix="", tags=["Signal Users API"])

SYMBOLS = [
    "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURCHF", "GBPCHF", "EURCAD", "GBPCAD",
    "EURNZD", "GBPNZD", "EURAUD", "GBPAUD", "AUDUSD", "NZDUSD", "AUDJPY", "NZDJPY", "AUDCHF",
    "NZDCHF", "AUDCAD", "NZDCAD", "USDCHF", "USDCAD", "XAUUSD", "XAGUSD", "USOIL", "UKOIL",
    "BTCUSD", "ETHUSD", "BTCUSDT", "ETHUSDT", "NAS100", "SPX500", "US30", "DXY", "BANKNIFTY",
    "NIFTY", "YM", "NQ", "MYM", "MNQ", "MCL", "MRB", "MES", "CL", "RB", "GC", "SI", "6E", "6B",
    "6A", "6N", "BTC", "ETH", "ES"
]
TIMEFRAMES = ["1M", "5M", "15M", "1H", "4H", "1D"]

# Per-model column definitions
MODEL_CONFIG = {
    "Evergreen": {
        "table": DB_TABLE_EVERGREEN,
        "prefix": "Evergreen",
        "default_bot": "evergreen",
        "bot_model": "evergreen",
        "entry_types": ["CR", "BRK", "CISD", "CISD_PCL"],
        "modifier_cols": [
            "Evergreen_CR_OP",
            "BRK_OP", "BRK_Swing_SMT", "BRK_Mitigation_SMT",
            "BRK_Swing_Strong_SMT_BUY", "BRK_Swing_Weak_SMT_SELL",
            "BRK_Mitigation_Strong_SMT_BUY", "BRK_Mitigation_Weak_SMT_SELL",
            "CISD_OP", "CISD_Swing_SMT", "CISD_Mitigation_SMT",
            "CISD_Swing_Strong_SMT_BUY", "CISD_Swing_Weak_SMT_SELL",
            "CISD_Mitigation_Strong_SMT_BUY", "CISD_Mitigation_Weak_SMT_SELL",
            "CISD_PCL_OP", "CISD_PCL_Swing_SMT", "CISD_PCL_Mitigation_SMT",
            "CISD_PCL_Swing_Strong_SMT_BUY", "CISD_PCL_Swing_Weak_SMT_SELL",
            "CISD_PCL_Mitigation_Strong_SMT_BUY", "CISD_PCL_Mitigation_Weak_SMT_SELL",
        ],
    },
    "Legacy": {
        "table": DB_TABLE_LEGACY,
        "prefix": "Legacy",
        "default_bot": "legacy",
        "bot_model": "legacy",
        "entry_types": ["CR", "LCY", "LCY_Sweep"],
        "modifier_cols": [
            "Legacy_CR_OP", "Legacy_CR_First_Class", "Legacy_CR_TPR",
            "LCY_OP", "LCY_Swing_SMT", "LCY_Mitigation_SMT",
            "LCY_Swing_Strong_SMT_BUY", "LCY_Swing_Weak_SMT_SELL",
            "LCY_Mitigation_Strong_SMT_BUY", "LCY_Mitigation_Weak_SMT_SELL",
            "LCY_First_Class", "LCY_TPR",
            "LCY_Sweep_OP", "LCY_Sweep_Swing_SMT", "LCY_Sweep_Mitigation_SMT",
            "LCY_Sweep_Swing_Strong_SMT_BUY", "LCY_Sweep_Swing_Weak_SMT_SELL",
            "LCY_Sweep_Mitigation_Strong_SMT_BUY", "LCY_Sweep_Mitigation_Weak_SMT_SELL",
            "LCY_Sweep_First_Class", "LCY_Sweep_TPR",
        ],
    },
}


def _get_table_for_model(model: str) -> str:
    return MODEL_CONFIG.get(model, {}).get("table", DB_TABLE_EVERGREEN)


@api_router.get("/api/admin/botusers")
async def get_users_api(model: str = "Evergreen", current_admin=Depends(get_current_admin)):
    """Get all users from a model's alert filter table (Admin Only)."""
    table = _get_table_for_model(model)
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {table}")
        users = cursor.fetchall()
        from fastapi.encoders import jsonable_encoder
        encoded_users = jsonable_encoder(users)
        return JSONResponse(content={"success": True, "count": len(users), "users": encoded_users})
    except Exception as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@api_router.get("/api/admin/botusers/{user_id}")
async def get_single_user_api(user_id: int, model: str = "Evergreen", current_admin=Depends(get_current_admin)):
    """Fetch a single alert filter user's data."""
    table = _get_table_for_model(model)
    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {table} WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()

        if user_data is None:
            raise HTTPException(status_code=404, detail="User not found")

        from fastapi.encoders import jsonable_encoder
        encoded_user_data = jsonable_encoder(user_data)
        return JSONResponse(content={"success": True, "user": encoded_user_data}, status_code=200)
    except Exception as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@api_router.post("/api/admin/botusers")
async def add_user_api(request: Request, current_admin=Depends(get_current_admin)):
    """Add a new user to a model's alert filter table."""
    import mysql.connector
    from fastapi.encoders import jsonable_encoder

    data = await request.json()
    if not data:
        return JSONResponse(content={"success": False, "message": "No data provided"}, status_code=400)

    model = data.get("model", "Evergreen")
    config = MODEL_CONFIG.get(model)
    if not config:
        return JSONResponse(content={"success": False, "message": f"Invalid model: {model}"}, status_code=400)

    table = config["table"]
    prefix = config["prefix"]
    default_bot = config["default_bot"]

    user = data.get("user") or None

    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor()
    try:
        columns = ["user", "bot"]
        values = [user, default_bot]
        placeholders = ["%s"] * len(columns)

        user_symbols = data.get("symbols", {})
        user_timeframes = data.get("timeframes", {})
        user_trends = data.get("trends", {})
        user_entries = data.get("entries", [])

        for symbol in SYMBOLS:
            col_name = f"{prefix}_{symbol}"
            columns.append(col_name)
            enabled = symbol in user_symbols.get(prefix.lower(), []) if prefix.lower() in user_symbols else 0
            values.append(1 if enabled else 0)
            placeholders.append("%s")

        for tf in TIMEFRAMES:
            col_name = f"{prefix}_{tf}"
            columns.append(col_name)
            enabled = tf in user_timeframes.get(prefix.lower(), []) if prefix.lower() in user_timeframes else 0
            values.append(1 if enabled else 0)
            placeholders.append("%s")

        prefix_lower = prefix.lower()
        columns.extend([f"{prefix}_Bull", f"{prefix}_Bear", f"{prefix}_Zone"])
        trend_data = user_trends.get(prefix_lower, {})
        values.extend([
            1 if trend_data.get("bull", False) else 0,
            1 if trend_data.get("bear", False) else 0,
            1 if trend_data.get("zone", False) else 0
        ])
        placeholders.extend(["%s", "%s", "%s"])

        entry_types = config["entry_types"]
        for entry in entry_types:
            if entry == "CR":
                col_name = f"{prefix}_CR"
                columns.append(col_name)
                values.append(1 if entry in user_entries else 0)
                placeholders.append("%s")
            else:
                columns.append(entry)
                values.append(1 if entry in user_entries else 0)
                placeholders.append("%s")

        query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
        cursor.execute(query, values)
        connection.commit()

        return JSONResponse(content={"success": True, "message": "User added successfully", "user_id": cursor.lastrowid}, status_code=201)
    except Exception as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@api_router.get("/api/admin/botuser/{user_id}/details")
async def get_user_details_api(request: Request, user_id: int, model: str = "Evergreen", current_admin=Depends(get_current_admin)):
    """Get detailed alert filter user information."""
    from fastapi.encoders import jsonable_encoder

    table = _get_table_for_model(model)
    prefix = MODEL_CONFIG.get(model, {}).get("prefix", "Evergreen")

    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database error"}, status_code=500)

    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {table} WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        symbol_count = sum(
            1 for key in user.keys()
            if key.startswith(f"{prefix}_")
            and key not in [f"{prefix}_Access", f"{prefix}_Bull", f"{prefix}_Bear", f"{prefix}_Zone"]
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
    """Update an existing alert filter user."""
    import mysql.connector

    data = await request.json()
    if not data:
        return JSONResponse(content={"success": False, "message": "No data provided"}, status_code=400)

    model = data.get("model", "Evergreen")
    config = MODEL_CONFIG.get(model)
    if not config:
        return JSONResponse(content={"success": False, "message": f"Invalid model: {model}"}, status_code=400)

    table = config["table"]
    prefix = config["prefix"]

    user = data.get("user")

    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor()
    try:
        update_fields = ["user = %s"]
        values = [user]

        user_symbols = data.get("symbols", {})
        user_timeframes = data.get("timeframes", {})
        user_trends = data.get("trends", {})
        user_entries = data.get("entries", [])

        for symbol in SYMBOLS:
            col_name = f"{prefix}_{symbol}"
            update_fields.append(f"{col_name} = %s")
            enabled = symbol in user_symbols.get(prefix.lower(), []) if prefix.lower() in user_symbols else 0
            values.append(1 if enabled else 0)

        for tf in TIMEFRAMES:
            col_name = f"{prefix}_{tf}"
            update_fields.append(f"{col_name} = %s")
            enabled = tf in user_timeframes.get(prefix.lower(), []) if prefix.lower() in user_timeframes else 0
            values.append(1 if enabled else 0)

        prefix_lower = prefix.lower()
        update_fields.extend([f"{prefix}_Bull = %s", f"{prefix}_Bear = %s", f"{prefix}_Zone = %s"])
        trend_data = user_trends.get(prefix_lower, {})
        values.extend([
            1 if trend_data.get("bull", False) else 0,
            1 if trend_data.get("bear", False) else 0,
            1 if trend_data.get("zone", False) else 0
        ])

        entry_types = config["entry_types"]
        for entry in entry_types:
            if entry == "CR":
                col_name = f"{prefix}_CR"
                update_fields.append(f"{col_name} = %s")
                values.append(1 if entry in user_entries else 0)
            else:
                update_fields.append(f"{entry} = %s")
                values.append(1 if entry in user_entries else 0)

        for col in config["modifier_cols"]:
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
        query = f"UPDATE {table} SET {', '.join(update_fields)} WHERE id = %s"

        cursor.execute(query, values)
        connection.commit()
        return JSONResponse(content={"success": True, "message": "User updated successfully"}, status_code=200)
    except Exception as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()


@api_router.delete("/api/admin/botusers/{user_id}")
async def delete_user_api(request: Request, user_id: int, model: str = "Evergreen", current_admin=Depends(get_current_admin)):
    """Delete an alert filter user."""
    import mysql.connector

    table = _get_table_for_model(model)

    connection = get_db_connection()
    if connection is None:
        return JSONResponse(content={"success": False, "message": "Database connection error"}, status_code=500)

    cursor = connection.cursor()
    try:
        cursor.execute(f"DELETE FROM {table} WHERE id = %s", (user_id,))
        connection.commit()

        if cursor.rowcount > 0:
            return JSONResponse(content={"success": True, "message": "User deleted successfully"})
        else:
            return JSONResponse(content={"success": False, "message": "User not found"}, status_code=404)
    except Exception as err:
        return JSONResponse(content={"success": False, "message": str(err)}, status_code=500)
    finally:
        cursor.close()
        connection.close()
