from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter(tags=["Static Files"])

NO_CACHE = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}


@router.get("/", response_class=FileResponse)
def serve_frontend():
    return FileResponse("main.html", headers=NO_CACHE)

@router.get("/courses", response_class=FileResponse)
def serve_courses_page():
    return FileResponse("main.html", headers=NO_CACHE)

@router.get("/dashboard", response_class=FileResponse)
def serve_dashboard():
    return FileResponse("dashboard.html", headers=NO_CACHE)


@router.get("/indicators", response_class=FileResponse)
def serve_indicators_page():
    return FileResponse("main.html", headers=NO_CACHE)


@router.get("/alerts", response_class=FileResponse)
def serve_alerts_page():
    return FileResponse("main.html", headers=NO_CACHE)


@router.get("/settings", response_class=FileResponse)
def serve_settings_page():
    return FileResponse("main.html", headers=NO_CACHE)


@router.get("/auth/login", response_class=FileResponse)
def serve_auth_login():
    return FileResponse("auth/login.html", headers=NO_CACHE)


@router.get("/auth/signup", response_class=FileResponse)
def serve_auth_signup():
    return FileResponse("auth/signup.html", headers=NO_CACHE)


@router.get("/auth/connect", response_class=FileResponse)
def serve_auth_connect():
    return FileResponse("auth/connect.html", headers=NO_CACHE)


@router.get("/auth/verify.html", response_class=FileResponse)
def serve_auth_verify():
    return FileResponse("auth/verify.html", headers=NO_CACHE)


@router.get("/miniapp")
@router.get("/miniapp/")
def serve_miniapp():
    return FileResponse("miniapp/miniapp.html", headers=NO_CACHE)


# This must be registered LAST in main.py to avoid catching API routes
@router.get("/{full_path:path}", response_class=FileResponse)
def serve_spa_catchall(full_path: str):
    return FileResponse("main.html", headers=NO_CACHE)
