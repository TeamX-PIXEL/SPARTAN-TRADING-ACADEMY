import os
import json
import requests
from urllib3 import encode_multipart_formdata
from datetime import datetime, timezone
from app.services.tradingview_helper import get_access_extension
from app.services.tradingview_config import urls


class LocalDB(dict):
    def __init__(self, filename='db.json'):
        self.filename = filename
        self.load()

    def load(self):
        if os.path.exists(self.filename):
            try:
                with open(self.filename, 'r') as f:
                    self.update(json.load(f))
            except json.JSONDecodeError:
                pass

    def save(self):
        with open(self.filename, 'w') as f:
            json.dump(self, f)

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        self.save()

    def __delitem__(self, key):
        super().__delitem__(key)
        self.save()


db = LocalDB()


class TradingView:
    def __init__(self):
        pass

    def validate_session(self, sessionid: str) -> bool:
        headers = {'cookie': 'sessionid=' + sessionid}
        try:
            test = requests.get(urls["tvcoins"], headers=headers, timeout=10)
            if test.status_code == 200:
                print("✅ SUCCESS: TradingView Session ID is valid!")
                return True
            else:
                print(f"❌ ERROR: TradingView Session ID is INVALID! (Status Code: {test.status_code})")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ ERROR: Could not connect to TradingView to verify session: {e}")
            return False

    def validate_username(self, username: str) -> dict:
        users = requests.get(urls["username_hint"] + "?s=" + username)
        usersList = users.json()
        validUser = False
        verifiedUserName = ''
        for user in usersList:
            if user['username'].lower() == username.lower():
                validUser = True
                verifiedUserName = user['username']
        return {"validuser": validUser, "verifiedUserName": verifiedUserName}

    def get_access_details(self, username: str, pine_id: str, sessionid: str) -> dict:
        user_payload = {'pine_id': pine_id, 'username': username}
        user_headers = {
            'origin': 'https://www.tradingview.com',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': 'sessionid=' + sessionid
        }
        usersResponse = requests.post(
            urls['list_users'] + '?limit=10&order_by=-created',
            headers=user_headers,
            data=user_payload
        )
        userResponseJson = usersResponse.json()
        users = userResponseJson.get('results', [])

        access_details = user_payload
        hasAccess = False
        noExpiration = False
        expiration = str(datetime.now(timezone.utc))

        for user in users:
            if user['username'].lower() == username.lower():
                hasAccess = True
                strExpiration = user.get("expiration")
                if strExpiration is not None:
                    expiration = user['expiration']
                else:
                    noExpiration = True

        access_details['hasAccess'] = hasAccess
        access_details['noExpiration'] = noExpiration
        access_details['currentExpiration'] = expiration
        return access_details

    def add_access(self, access_details: dict, extension_type: str, extension_length: int, sessionid: str) -> dict:
        noExpiration = access_details['noExpiration']
        access_details['expiration'] = access_details['currentExpiration']
        access_details['status'] = 'Not Applied'

        if not noExpiration:
            payload = {
                'pine_id': access_details['pine_id'],
                'username_recip': access_details['username']
            }
            if extension_type != 'L':
                expiration = get_access_extension(
                    access_details['currentExpiration'], extension_type, extension_length
                )
                payload['expiration'] = expiration
                access_details['expiration'] = expiration
            else:
                access_details['noExpiration'] = True

            enpoint_type = 'modify_access' if access_details['hasAccess'] else 'add_access'

            body, contentType = encode_multipart_formdata(payload)

            headers = {
                'origin': 'https://www.tradingview.com',
                'Content-Type': contentType,
                'cookie': 'sessionid=' + sessionid
            }
            add_access_response = requests.post(
                urls[enpoint_type],
                data=body,
                headers=headers
            )
            access_details['status'] = 'Success' if (
                add_access_response.status_code == 200 or add_access_response.status_code == 201
            ) else 'Failure'

        return access_details

    def remove_access(self, access_details: dict, sessionid: str) -> dict:
        payload = {
            'pine_id': access_details['pine_id'],
            'username_recip': access_details['username']
        }
        body, contentType = encode_multipart_formdata(payload)

        headers = {
            'origin': 'https://www.tradingview.com',
            'Content-Type': contentType,
            'cookie': 'sessionid=' + sessionid
        }
        remove_access_response = requests.post(
            urls['remove_access'],
            data=body,
            headers=headers
        )
        access_details['status'] = 'Success' if (remove_access_response.status_code == 200) else 'Failure'
        return access_details


tradingview = TradingView()