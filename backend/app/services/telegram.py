import urllib.parse
import asyncio
import httpx
from app.config import get_settings
from app.database import get_db_connection

settings = get_settings()

DB_TABLE_EVERGREEN = settings.DB_TABLE_EVERGREEN
DB_TABLE_LEGACY = settings.DB_TABLE_LEGACY

MODEL_TO_TABLE = {
    "Evergreen": DB_TABLE_EVERGREEN,
    "Legacy": DB_TABLE_LEGACY,
}

MODEL_TO_PREFIX = {
    "Evergreen": "Evergreen",
    "Legacy": "Legacy",
}


def get_matching_users(symbol: str, timeframe: str, trend: str, zone: bool, entry_type: str, modifiers: dict, model: str):
    """Get active users matching signal criteria using raw SQL."""
    table = MODEL_TO_TABLE.get(model)
    prefix = MODEL_TO_PREFIX.get(model)
    if not table or not prefix:
        print(f"Unknown model: {model}")
        return []

    clean_symbol = symbol.rstrip('1!') if symbol and symbol.endswith('1!') else (symbol or "")
    if not clean_symbol:
        print("Warning: Missing symbol in payload")
        return []

    trend_col = f"{prefix}_Bull" if trend == "Bullish" else f"{prefix}_Bear" if trend == "Bearish" else None
    if trend_col is None:
        print(f"Unknown trend: {trend}")
        return []

    conn = get_db_connection()
    if not conn:
        print("Database connection error")
        return []

    cursor = conn.cursor(dictionary=True)
    try:
        conditions = [
            f"{prefix}_{clean_symbol} = TRUE",
            f"{prefix}_{timeframe} = TRUE",
            f"{trend_col} = TRUE",
            f"{prefix}_Access = TRUE",
        ]

        if not zone:
            conditions.append(f"{prefix}_Zone = FALSE")

        if entry_type:
            if model == "Evergreen" and entry_type in ["LCY", "LCY_Sweep", "Legacy_CR"]:
                return []
            elif model == "Legacy" and entry_type in ["BRK", "CISD", "CISD_PCL", "Evergreen_CR"]:
                return []

            if entry_type in ["Evergreen_CR", "Legacy_CR"]:
                conditions.append(f"{entry_type} = TRUE")
                if not modifiers.get('has_op'):
                    conditions.append(f"{entry_type}_OP = FALSE")
                if model == "Legacy":
                    if not modifiers.get('has_first_class'):
                        conditions.append(f"{entry_type}_First_Class = FALSE")
                    if not modifiers.get('has_tpr'):
                        conditions.append(f"{entry_type}_TPR = FALSE")
            else:
                conditions.append(f"{entry_type} = TRUE")
                entry_prefix = entry_type
                if not modifiers.get('has_op'):
                    conditions.append(f"{entry_prefix}_OP = FALSE")
                if not modifiers.get('has_swing_smt'):
                    conditions.append(f"{entry_prefix}_Swing_SMT = FALSE")

                strength = modifiers.get('swing_strength')
                if strength == 'Strong':
                    conditions.append(f"{entry_prefix}_Swing_Strong_SMT_BUY = TRUE")
                elif strength == 'Weak':
                    conditions.append(f"{entry_prefix}_Swing_Weak_SMT_SELL = TRUE")
                else:
                    conditions.append(f"{entry_prefix}_Swing_Strong_SMT_BUY = FALSE")
                    conditions.append(f"{entry_prefix}_Swing_Weak_SMT_SELL = FALSE")

                if not modifiers.get('has_mitigation_smt'):
                    conditions.append(f"{entry_prefix}_Mitigation_SMT = FALSE")

                mit_strength = modifiers.get('mitigation_strength')
                if mit_strength == 'Strong':
                    conditions.append(f"{entry_prefix}_Mitigation_Strong_SMT_BUY = TRUE")
                elif mit_strength == 'Weak':
                    conditions.append(f"{entry_prefix}_Mitigation_Weak_SMT_SELL = TRUE")
                else:
                    conditions.append(f"{entry_prefix}_Mitigation_Strong_SMT_BUY = FALSE")
                    conditions.append(f"{entry_prefix}_Mitigation_Weak_SMT_SELL = FALSE")

                if model == "Legacy" and entry_prefix in ["LCY", "LCY_Sweep"]:
                    if not modifiers.get('has_first_class'):
                        conditions.append(f"{entry_prefix}_First_Class = FALSE")
                    if not modifiers.get('has_tpr'):
                        conditions.append(f"{entry_prefix}_TPR = FALSE")

        where_clause = " AND ".join(conditions)
        query = f"SELECT * FROM {table} WHERE {where_clause}"

        cursor.execute(query)
        return cursor.fetchall()

    except Exception as e:
        print(f"Error in get_matching_users: {e}")
        return []
    finally:
        cursor.close()
        conn.close()


async def send_telegram_notifications(message: str, matching_users: list, bot_token: str):
    """A background job to send alerts with batch-level retries."""
    encoded_message = urllib.parse.quote(message)

    async with httpx.AsyncClient(timeout=10.0) as client:
        current_batch = matching_users.copy()
        batch_number = 1

        while batch_number <= 3 and current_batch:
            tasks = []
            for user in current_batch:
                chat_id = user.get('user', '')
                if not chat_id:
                    continue
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage?chat_id={chat_id}&text={encoded_message}"
                tasks.append(client.get(url))

            responses = await asyncio.gather(*tasks, return_exceptions=True)

            next_batch = []
            for i, response in enumerate(responses):
                user = current_batch[i]
                if isinstance(response, httpx.Response) and response.status_code == 200:
                    pass
                else:
                    next_batch.append(user)
                    error_msg = f"status {response.status_code}" if isinstance(response, httpx.Response) else str(response)
                    print(f"Batch {batch_number}: Failed for {user.get('user')} - {error_msg}")

            current_batch = next_batch
            batch_number += 1

            if current_batch and batch_number <= 3:
                await asyncio.sleep(1)
