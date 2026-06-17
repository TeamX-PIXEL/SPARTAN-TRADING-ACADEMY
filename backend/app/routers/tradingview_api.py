from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.tradingview import tradingview
from app.services.tradingview_helper import get_access_extension
from app.services.tradingview_config import urls

router = APIRouter(tags=["TradingView Direct API"])


class PineIDList(BaseModel):
    pine_ids: List[str]


class AccessRequest(BaseModel):
    pine_ids: List[str]
    duration: Optional[str] = None


def resolve_pine_id(pine_id_or_alias: str) -> str:
    """Placeholder to match original main.py behavior."""
    return pine_id_or_alias


@router.get("/tv-status")
def read_tv_root():
    """Renamed from '/' to avoid conflicting with the frontend root."""
    return {"message": "TradingView Access Management API is running"}


@router.get("/validate/{username}")
def validate_user(username: str):
    return tradingview.validate_username(username)


@router.post("/access/check/{username}")
def check_access(username: str, payload: PineIDList):
    results = []
    for raw_id in payload.pine_ids:
        pine_id = resolve_pine_id(raw_id)
        details = tradingview.get_access_details(username, pine_id, None)
        results.append(details)
    return results


@router.post("/access/add/{username}")
def add_access(username: str, payload: AccessRequest):
    if not payload.duration:
        raise HTTPException(status_code=400, detail="Duration is required")

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
        details = tradingview.get_access_details(username, pine_id, None)
        result = tradingview.add_access(details, extension_type, extension_length, None)
        results.append(result)
    return results


@router.post("/access/remove/{username}")
def remove_access(username: str, payload: PineIDList):
    results = []
    for raw_id in payload.pine_ids:
        pine_id = resolve_pine_id(raw_id)
        details = {'pine_id': pine_id, 'username': username}
        tradingview.remove_access(details, None)
        results.append(details)
    return results
