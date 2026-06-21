from fastapi import APIRouter, Request, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
import json
import re
import httpx
import urllib.parse
from datetime import date
from app.database import get_db, get_db_connection
from app.services.telegram import get_matching_users, send_telegram_notifications, DB_TABLE_EVERGREEN, DB_TABLE_LEGACY
from app.config import get_settings

settings = get_settings()

router = APIRouter(tags=["Webhooks"])


async def send_telegram_reply(chat_id: str, text: str, bot_token: str) -> bool:
    encoded_text = urllib.parse.quote(text)
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage?chat_id={chat_id}&text={encoded_text}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            return response.status_code == 200
    except Exception as e:
        print(f"Error sending reply: {e}")
        return False


async def send_telegram_inline_keyboard(chat_id: str, text: str, buttons: list, bot_token: str) -> bool:
    payload = {
        "chat_id": chat_id,
        "text": text,
        "reply_markup": {"inline_keyboard": buttons},
    }
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            return response.status_code == 200
    except Exception as e:
        print(f"Error sending inline keyboard: {e}")
        return False


async def answer_callback_query(callback_query_id: str, bot_token: str, text: str = None) -> bool:
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
    url = f"https://api.telegram.org/bot{bot_token}/deleteMessage"
    payload = {"chat_id": chat_id, "message_id": message_id}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            return response.status_code == 200
    except Exception as e:
        print(f"Error deleting message: {e}")
        return False


def _get_user_bot_access(username: str) -> dict:
    """Check which bots a user has active access to via bot_members expiry."""
    today = date.today()
    result = {"Evergreen": False, "Legacy": False}

    conn = get_db_connection()
    if not conn:
        return result

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT bot_id, expiry FROM bot_members WHERE username = %s",
            (username,)
        )
        for row in cursor.fetchall():
            bot_id = row.get("bot_id", "")
            expiry = row.get("expiry")
            if bot_id == "evergreen" and expiry and expiry.date() >= today:
                result["Evergreen"] = True
            elif bot_id == "legacy" and expiry and expiry.date() >= today:
                result["Legacy"] = True
    finally:
        cursor.close()
        conn.close()

    return result


def get_user_status_message(username: str) -> str:
    access = _get_user_bot_access(username)
    msg = "📊 *Your Subscription Status*\n\n"
    for model, has_access in access.items():
        if has_access:
            msg += f"✅ *{model}* - Active\n"
        else:
            msg += f"❌ *{model}* - Not Active\n"
    msg += "\n🌐 Manage filters: https://spartantradingacademy.com/miniapp"
    return msg


def _resolve_telegram_id(username: str) -> str | None:
    """Look up a user's telegram_user_id from the users table."""
    conn = get_db_connection()
    if not conn:
        return None
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT telegram_user_id FROM users WHERE username = %s", (username,))
        row = cursor.fetchone()
        return row.get("telegram_user_id") if row else None
    finally:
        cursor.close()
        conn.close()


def _resolve_username_by_telegram(telegram_id: str) -> str | None:
    """Look up a username by telegram_user_id from the users table."""
    conn = get_db_connection()
    if not conn:
        return None
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT username FROM users WHERE telegram_user_id = %s", (telegram_id,))
        row = cursor.fetchone()
        return row.get("username") if row else None
    finally:
        cursor.close()
        conn.close()


@router.post('/webhook')
async def webhook(request: Request, db: Session = Depends(get_db)):
    try:
        content_type = request.headers.get('content-type', '')
        if not (content_type.startswith('application/json') or content_type.startswith('text/plain')):
            return PlainTextResponse("Error: Content-Type must be application/json or text/plain", status_code=415)

        raw_data = await request.body()
        if not raw_data:
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
            target_bot_token = settings.LEGACY_BOT_TOKEN if model == "Legacy" else settings.EVERGREEN_BOT_TOKEN

            # Resolve telegram_user_ids from usernames
            users_with_telegram = []
            for u in matching_users:
                username = u.get('user', '')
                if username:
                    telegram_id = _resolve_telegram_id(username)
                    if telegram_id:
                        users_with_telegram.append({'user': username, 'telegram_id': telegram_id})

            if users_with_telegram:
                await send_telegram_notifications(cleaned_message, users_with_telegram, target_bot_token)

        return PlainTextResponse("Success", status_code=200)

    except Exception as e:
        print(f"Error: {e}")
        return PlainTextResponse("Error", status_code=500)


@router.post('/telegram_user_webhook')
async def telegram_user_webhook(request: Request):
    try:
        data = await request.json()
        if not data:
            return PlainTextResponse("Error: No data", status_code=400)

        callback_query = data.get('callback_query')
        if callback_query:
            cq_id = callback_query.get('id')
            cq_data = callback_query.get('data', '')
            chat_id = callback_query.get('message', {}).get('chat', {}).get('id')

            if cq_data.startswith('connect_yes:') or cq_data.startswith('connect_no:'):
                parts = cq_data.split(':')
                action = parts[0]
                target_username = parts[1] if len(parts) > 1 else None

                connection = get_db_connection()
                if not connection:
                    await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN, "Database error")
                    return PlainTextResponse("Error", status_code=500)

                cursor = connection.cursor(dictionary=True)
                try:
                    message_id = callback_query.get('message', {}).get('message_id')

                    if action == 'connect_yes' and target_username:
                        # Update users table with telegram_user_id
                        cursor.execute("SELECT username, telegram_user_id FROM users WHERE username = %s", (target_username,))
                        user_row = cursor.fetchone()

                        if user_row:
                            if user_row.get('telegram_user_id') and str(user_row['telegram_user_id']) == str(chat_id):
                                await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN)
                                await send_telegram_reply(chat_id, "✅ You are already connected!", settings.EVERGREEN_BOT_TOKEN)
                            elif user_row.get('telegram_user_id'):
                                await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN)
                                await send_telegram_reply(chat_id, "⚠️ This account is already linked to another Telegram account. Please contact support.", settings.EVERGREEN_BOT_TOKEN)
                            else:
                                cursor.execute("UPDATE users SET telegram_user_id = %s WHERE username = %s", (str(chat_id), target_username))
                                connection.commit()
                                await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN, "✅ Connected successfully!")
                                await send_telegram_reply(chat_id, "✅ Successfully linked your account!\n\n" + get_user_status_message(target_username), settings.EVERGREEN_BOT_TOKEN)
                        else:
                            await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN, "User not found")
                    elif action == 'connect_no':
                        await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN)
                        await send_telegram_reply(chat_id, "❌ Connection cancelled.", settings.EVERGREEN_BOT_TOKEN)

                    if message_id:
                        await delete_telegram_message(str(chat_id), message_id, settings.EVERGREEN_BOT_TOKEN)
                except Exception as e:
                    print(f"Error handling callback query: {e}")
                    await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN, "An error occurred")
                finally:
                    cursor.close()
                    connection.close()

                return PlainTextResponse("OK", status_code=200)

        message = data.get('message') or data.get('edited_message')
        if not message:
            return PlainTextResponse("OK", status_code=200)

        chat_id = message.get('chat', {}).get('id')
        text = message.get('text', '').strip()

        if not chat_id or not text:
            return PlainTextResponse("OK", status_code=200)

        # Look up username by telegram_user_id
        username = _resolve_username_by_telegram(str(chat_id))

        text_lower = text.lower()

        if text_lower.startswith('/start'):
            if username:
                access = _get_user_bot_access(username)
                has_active = any(access.values())
                reply = get_user_status_message(username) if has_active else "⚠️ Your subscription has expired. Please contact support to renew."
            else:
                reply = "🔑 Welcome! Please contact support to link your account."

            await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)

        elif username:
            access = _get_user_bot_access(username)
            has_active = any(access.values())
            reply = get_user_status_message(username) if has_active else "⚠️ Your subscription has expired. Please contact support to renew."
            await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)

        return PlainTextResponse("OK", status_code=200)

    except Exception as e:
        print(f"Error: {e}")
        return PlainTextResponse("Error", status_code=500)
