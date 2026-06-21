from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import hmac
import hashlib
import json
from urllib.parse import unquote
from datetime import date
import mysql.connector
from app.database import get_db_connection
from app.services.telegram import DB_TABLE_EVERGREEN, DB_TABLE_LEGACY
from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/api/miniapp", tags=["MiniApp"])

MODEL_TO_TABLE = {
    "Evergreen": DB_TABLE_EVERGREEN,
    "Legacy": DB_TABLE_LEGACY,
}


def validate_init_data(init_data: str):
    """Validates Telegram WebApp initData using HMAC against bot tokens."""
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
            'Evergreen': settings.EVERGREEN_BOT_TOKEN,
            'Legacy': settings.LEGACY_BOT_TOKEN,
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


@router.post("/auth")
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

    # Resolve username from users table
    username = _resolve_username_by_telegram(telegram_id)
    if not username:
        return JSONResponse({'success': False, 'status': 'not_found', 'model': model})

    # Query the correct filter table
    table = MODEL_TO_TABLE.get(model, DB_TABLE_EVERGREEN)
    prefix = "Evergreen" if model == "Evergreen" else "Legacy"

    connection = get_db_connection()
    if connection is None:
        return JSONResponse({'success': False, 'status': 'error'})

    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {table} WHERE user = %s", (username,))
        user = cursor.fetchone()
    finally:
        cursor.close()
        connection.close()

    if not user:
        return JSONResponse({'success': False, 'status': 'not_found', 'model': model})

    # Check access via bot_members expiry
    bot_id = "evergreen" if model == "Evergreen" else "legacy"
    conn = get_db_connection()
    if conn:
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT expiry FROM bot_members WHERE username = %s AND bot_id = %s", (username, bot_id))
            member = cur.fetchone()
            if not member or not member.get('expiry') or member['expiry'].date() < date.today():
                return JSONResponse({'success': False, 'status': 'expired', 'model': model})
        finally:
            cur.close()
            conn.close()
    else:
        return JSONResponse({'success': False, 'status': 'error'})

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

    return JSONResponse({'success': True, 'user': {'id': user['id'], 'username': username}, 'filters': filters, 'model': model})


@router.get("/filters")
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


@router.post("/filters/{user_id}/{filter_type}")
async def miniapp_update_filter(user_id: int, filter_type: str, request: Request):
    data = await request.json()
    filter_name = data.get('filter')
    enabled = data.get('enabled')
    model = data.get('model', 'Evergreen')
    username = data.get('username', '')

    if filter_name is None or enabled is None:
        return JSONResponse({'success': False})

    table = MODEL_TO_TABLE.get(model, DB_TABLE_EVERGREEN)
    prefix = "Evergreen" if model == "Evergreen" else "Legacy"

    connection = get_db_connection()
    if connection is None:
        return JSONResponse({'success': False})

    cursor = connection.cursor()
    try:
        # Check access via bot_members expiry
        bot_id = "evergreen" if model == "Evergreen" else "legacy"
        cursor.execute(
            "SELECT expiry FROM bot_members WHERE username = (SELECT user FROM " + table + " WHERE id = %s) AND bot_id = %s",
            (user_id, bot_id)
        )
        member = cursor.fetchone()
        from datetime import date as _date
        if not member or not member[0] or member[0].date() < _date.today():
            return JSONResponse({'success': False, 'message': 'Invalid user or no access'})

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

        cursor.execute(f"UPDATE {table} SET `{db_col}` = %s WHERE id = %s", (enabled, user_id))
        connection.commit()
        return JSONResponse({'success': True})
    except mysql.connector.Error as err:
        print(f"Error updating filter: {err}")
        return JSONResponse({'success': False})
    finally:
        cursor.close()
        connection.close()


@router.post("/filters/batch_update/{user_id}")
async def miniapp_batch_update(user_id: int, request: Request):
    data = await request.json()
    changes = data.get('changes')
    model = data.get('model', 'Evergreen')

    if not isinstance(changes, list):
        return JSONResponse({'success': False, 'message': 'Invalid data format.'})

    table = MODEL_TO_TABLE.get(model, DB_TABLE_EVERGREEN)
    prefix = "Evergreen" if model == "Evergreen" else "Legacy"

    connection = get_db_connection()
    if connection is None:
        return JSONResponse({'success': False, 'message': 'Database connection error.'})

    cursor = connection.cursor()
    try:
        # Check access via bot_members expiry
        bot_id = "evergreen" if model == "Evergreen" else "legacy"
        cursor.execute(
            "SELECT expiry FROM bot_members WHERE username = (SELECT user FROM " + table + " WHERE id = %s) AND bot_id = %s",
            (user_id, bot_id)
        )
        member = cursor.fetchone()
        from datetime import date as _date
        if not member or not member[0] or member[0].date() < _date.today():
            return JSONResponse({'success': False, 'message': 'User not found or no access.'})

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
                cursor.execute(f"UPDATE {table} SET `{db_col}` = %s WHERE id = %s", (enabled, user_id))
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
