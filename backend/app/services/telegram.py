import urllib.parse
import asyncio
import httpx
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models import User as SignalUser

settings = get_settings()

DB_TABLE_USERS = settings.DB_TABLE_USERS


def get_matching_users(db: Session, symbol: str, timeframe: str, trend: str, zone: bool, entry_type: str, modifiers: dict, model: str):
    """Get active users matches based on signal criteria using SQLAlchemy."""
    if model == "Evergreen":
        prefix = "Evergreen"
    elif model == "Legacy":
        prefix = "Legacy"
    elif model == "Alpha":
        prefix = "Alpha"
    else:
        print(f"Unknown model: {model}")
        return []

    clean_symbol = symbol.rstrip('1!') if symbol and symbol.endswith('1!') else (symbol or "")
    if not clean_symbol:
        print("Warning: Missing symbol in payload")

    trend_col = f"{prefix}_Bull" if trend == "Bullish" else f"{prefix}_Bear" if trend == "Bearish" else None
    if trend_col is None:
        print(f"Unknown trend: {trend}")
        return []

    query = db.query(SignalUser).filter(
        SignalUser.telegram_id.isnot(None),
        SignalUser.telegram_id != '',
        getattr(SignalUser, f"{prefix}_Expiry") >= datetime.now().date(),
        getattr(SignalUser, f"{prefix}_Access") == True,
        getattr(SignalUser, f"{prefix}_{clean_symbol}") == True,
        getattr(SignalUser, f"{prefix}_{timeframe}") == True,
        getattr(SignalUser, trend_col) == True,
    )

    if entry_type:
        if model == "Evergreen" and entry_type in ["LCY", "LCY_Sweep", "Legacy_CR"]:
            return []
        elif model == "Legacy" and entry_type in ["BRK", "CISD", "CISD_PCL", "Evergreen_CR"]:
            return []
        elif model == "Alpha" and entry_type in ["Legacy_CR"]:
            return []

        query = query.filter(getattr(SignalUser, entry_type) == True)

    if not zone:
        query = query.filter(getattr(SignalUser, f"{prefix}_Zone") == False)

    if entry_type in ["Evergreen_CR", "Legacy_CR"]:
        if not modifiers.get('has_op'):
            query = query.filter(getattr(SignalUser, f"{entry_type}_OP") == False)
        if model == "Legacy":
            if not modifiers.get('has_first_class'):
                query = query.filter(getattr(SignalUser, f"{entry_type}_First_Class") == False)
            if not modifiers.get('has_tpr'):
                query = query.filter(getattr(SignalUser, f"{entry_type}_TPR") == False)

    if entry_type and entry_type not in ["Evergreen_CR", "Legacy_CR"]:
        entry_prefix = entry_type
        if not modifiers.get('has_op'):
            query = query.filter(getattr(SignalUser, f"{entry_prefix}_OP") == False)
        if not modifiers.get('has_swing_smt'):
            query = query.filter(getattr(SignalUser, f"{entry_prefix}_Swing_SMT") == False)

        strength = modifiers.get('swing_strength')
        is_swing_strong = strength == 'Strong'
        is_swing_weak = strength == 'Weak'
        query = query.filter(
            ((is_swing_strong & (getattr(SignalUser, f"{entry_prefix}_Swing_Strong_SMT_BUY") == True)) |
             (is_swing_weak & (getattr(SignalUser, f"{entry_prefix}_Swing_Weak_SMT_SELL") == True)) |
             ((getattr(SignalUser, f"{entry_prefix}_Swing_Strong_SMT_BUY") == False) &
              (getattr(SignalUser, f"{entry_prefix}_Swing_Weak_SMT_SELL") == False)))
        )

        if not modifiers.get('has_mitigation_smt'):
            query = query.filter(getattr(SignalUser, f"{entry_prefix}_Mitigation_SMT") == False)

        mit_strength = modifiers.get('mitigation_strength')
        is_mit_strong = mit_strength == 'Strong'
        is_mit_weak = mit_strength == 'Weak'
        query = query.filter(
            ((is_mit_strong & (getattr(SignalUser, f"{entry_prefix}_Mitigation_Strong_SMT_BUY") == True)) |
             (is_mit_weak & (getattr(SignalUser, f"{entry_prefix}_Mitigation_Weak_SMT_SELL") == True)) |
             ((getattr(SignalUser, f"{entry_prefix}_Mitigation_Strong_SMT_BUY") == False) &
              (getattr(SignalUser, f"{entry_prefix}_Mitigation_Weak_SMT_SELL") == False)))
        )

        if model == "Legacy" and entry_prefix in ["LCY", "LCY_Sweep"]:
            if not modifiers.get('has_first_class'):
                query = query.filter(getattr(SignalUser, f"{entry_prefix}_First_Class") == False)
            if not modifiers.get('has_tpr'):
                query = query.filter(getattr(SignalUser, f"{entry_prefix}_TPR") == False)

    return query.all()


async def send_telegram_notifications(message: str, matching_users: list, bot_token: str):
    """A background job to send alerts with batch-level retries."""
    encoded_message = urllib.parse.quote(message)

    async with httpx.AsyncClient(timeout=10.0) as client:
        current_batch = matching_users.copy()
        batch_number = 1

        while batch_number <= 3 and current_batch:
            tasks = []
            for user in current_batch:
                chat_id = user.telegram_id
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
                    print(f"Batch {batch_number}: Failed for {user.user} ({user.telegram_id}) - {error_msg}")

            current_batch = next_batch
            batch_number += 1

            if current_batch and batch_number <= 3:
                await asyncio.sleep(1)