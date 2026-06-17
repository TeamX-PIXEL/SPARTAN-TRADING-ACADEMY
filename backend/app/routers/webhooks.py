from fastapi import APIRouter, Request, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
import json
import re
import httpx
import urllib.parse
from datetime import date
from app.database import get_db, get_db_connection
from app.services.telegram import get_matching_users, send_telegram_notifications, DB_TABLE_USERS
from app.config import get_settings

settings = get_settings()

router = APIRouter(tags=["Webhooks"])


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


async def send_telegram_inline_keyboard(chat_id: str, text: str, buttons: list, bot_token: str) -> bool:
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


@router.post('/webhook')
async def webhook(request: Request, db: Session = Depends(get_db)):
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

        matching_users = get_matching_users(db, symbol, timeframe, trend, zone, entry_type, modifiers, model)

        if matching_users:
            cleaned_message = '\n'.join([line for line in message.split('\n') if not line.strip().startswith('Model')])
            target_bot_token = settings.LEGACY_BOT_TOKEN if model == "Legacy" else settings.ALPHA_BOT_TOKEN if model == "Alpha" else settings.EVERGREEN_BOT_TOKEN
            await send_telegram_notifications(cleaned_message, matching_users, target_bot_token)

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

        print(f"DEBUG: Webhook received: {data}")

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
                    await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN, "Database error")
                    return PlainTextResponse("Error", status_code=500)

                cursor = connection.cursor(dictionary=True)
                try:
                    message_id = callback_query.get('message', {}).get('message_id')

                    if action == 'connect_yes' and user_id:
                        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE id = %s", (user_id,))
                        key_user = cursor.fetchone()

                        if key_user:
                            if key_user.get('telegram_id') and str(key_user['telegram_id']) == str(chat_id):
                                await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN)
                                await send_telegram_reply(chat_id, "✅ You are already connected!", settings.EVERGREEN_BOT_TOKEN)
                            elif key_user.get('telegram_id'):
                                await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN)
                                await send_telegram_reply(chat_id, "⚠️ This account is already linked to another Telegram account. Please contact support.", settings.EVERGREEN_BOT_TOKEN)
                            else:
                                cursor.execute(f"UPDATE {DB_TABLE_USERS} SET telegram_id = %s WHERE id = %s", (str(chat_id), user_id))
                                connection.commit()
                                await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN, "✅ Connected successfully!")
                                await send_telegram_reply(chat_id, "✅ Successfully linked your account!\n\n" + get_user_status_message(key_user), settings.EVERGREEN_BOT_TOKEN)
                        else:
                            await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN, "User not found")
                    elif action == 'connect_no':
                        await answer_callback_query(cq_id, settings.EVERGREEN_BOT_TOKEN)
                        await send_telegram_reply(chat_id, "❌ Connection cancelled. You can link your account anytime by using /start with your key.", settings.EVERGREEN_BOT_TOKEN)

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

            if text_lower.startswith('/start'):
                parts = text.split()
                if len(parts) > 1:
                    api_key = parts[1]
                    if len(api_key) == 19 and api_key.replace('-', '').isalnum() and api_key.count('-') == 3:
                        cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE user_key = %s", (api_key,))
                        key_user = cursor.fetchone()

                        if not key_user:
                            reply = "❌ Invalid key. Please check your key and try again."
                            await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)
                        else:
                            if key_user.get('telegram_id') and str(key_user['telegram_id']) == str(chat_id):
                                reply = "✅ You are already connected!"
                                await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)
                            elif key_user.get('telegram_id'):
                                reply = "⚠️ This account is already linked to another Telegram account. Please contact support."
                                await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)
                            else:
                                confirm_text = "🔗 *Connect Account*\n\nWould you like to connect your bot with this Telegram account?"
                                buttons = [
                                    [
                                        {"text": "✅ Yes", "callback_data": f"connect_yes:{key_user['id']}"},
                                        {"text": "❌ No", "callback_data": f"connect_no:{key_user['id']}"}
                                    ]
                                ]
                                await send_telegram_inline_keyboard(chat_id, confirm_text, buttons, settings.EVERGREEN_BOT_TOKEN)
                    else:
                        reply = "❌ Invalid key format. Your key should look like: ABCD-EFGH-IJKL-MNOP"
                        await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)
                else:
                    if user:
                        has_active = any(
                            user.get(f'{m}_Access') and user.get(f'{m}_Expiry') and user[f'{m}_Expiry'] >= today
                            for m in ['Evergreen', 'Legacy', 'Alpha']
                        )
                        reply = get_user_status_message(user) if has_active else "⚠️ Your subscription has expired. Please contact support to renew."
                    else:
                        reply = "🔑 Welcome! Please enter your 16-digit access key to link your account."

                    await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)

            elif len(text.replace('-', '')) == 16 and text.replace('-', '').isalnum():
                cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE REPLACE(user_key, '-', '') = %s", (text.replace('-', ''),))
                key_user = cursor.fetchone()

                if not key_user:
                    reply = "❌ Invalid key. Please check your key and try again."
                    await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)
                else:
                    if key_user.get('telegram_id') and str(key_user['telegram_id']) == str(chat_id):
                        reply = "✅ You are already logged in!"
                    elif key_user.get('telegram_id'):
                        reply = "⚠️ This key is already linked to another Telegram account. Please contact support."
                    else:
                        cursor.execute(f"UPDATE {DB_TABLE_USERS} SET telegram_id = %s WHERE id = %s", (str(chat_id), key_user['id']))
                        connection.commit()

                        reply = "✅ Successfully linked your account!\n\n" + get_user_status_message(key_user)

                await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)

            elif user:
                has_active = any(
                    user.get(f'{m}_Access') and user.get(f'{m}_Expiry') and user[f'{m}_Expiry'] >= today
                    for m in ['Evergreen', 'Legacy', 'Alpha']
                )
                reply = get_user_status_message(user) if has_active else "⚠️ Your subscription has expired. Please contact support to renew."
                await send_telegram_reply(chat_id, reply, settings.EVERGREEN_BOT_TOKEN)

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
