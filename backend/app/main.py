import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import Base, engine
from app.routers import auth, bots, courses, users, indicators, purchases, webhooks, admin, progress, dashboard, miniapp, search, uploads, tradingview_api, static
from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")

    # 1. Auto-create SQLAlchemy tables (if not using Alembic)
    # Uncomment below if you want SQLAlchemy auto-create (not recommended if using Alembic)
    # Base.metadata.create_all(bind=engine)

    # 2. Auto-create raw MySQL tables from schema.sql if they don't exist
    await _ensure_raw_mysql_tables()

    yield
    print("Shutting down...")


async def _ensure_raw_mysql_tables():
    """Check if raw MySQL tables exist. If not, run schema.sql. If yes, skip."""
    import mysql.connector
    from app.database import get_db_connection

    connection = get_db_connection()
    if connection is None:
        print("Warning: Could not connect to raw MySQL. Skipping schema check.")
        return

    cursor = connection.cursor(dictionary=True)
    try:
        # Check if signal_users table exists
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM information_schema.tables
            WHERE table_schema = DATABASE()
            AND table_name = 'signal_users'
        """)
        signal_users_exists = cursor.fetchone()['cnt'] > 0

        # Check if admin_users table exists
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM information_schema.tables
            WHERE table_schema = DATABASE()
            AND table_name = 'admin_users'
        """)
        admin_users_exists = cursor.fetchone()['cnt'] > 0

        if signal_users_exists and admin_users_exists:
            print("Raw MySQL tables already exist (signal_users, admin_users). Skipping schema creation.")
            return

        # One or both tables are missing -> run schema.sql
        schema_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "schema.sql")
        if not os.path.exists(schema_path):
            print(f"Warning: schema.sql not found at {schema_path}. Cannot create raw MySQL tables.")
            return

        print("Raw MySQL tables missing. Running schema.sql...")
        with open(schema_path, 'r') as f:
            schema_sql = f.read()

        # Split and execute each statement (MySQL connector doesn't support multi-statement well in one execute)
        for statement in schema_sql.split(';'):
            stmt = statement.strip()
            if stmt:
                cursor.execute(stmt)
        connection.commit()
        print("schema.sql executed successfully. Raw MySQL tables created.")

    except mysql.connector.Error as err:
        print(f"Error during raw MySQL schema setup: {err}")
        connection.rollback()
    finally:
        cursor.close()
        connection.close()


app = FastAPI(
    title="Trading Platform API",
    description="Admin panel backend for trading courses, indicators, and bots",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Thumbnail uploads
THUMBNAIL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "thumbnail")
os.makedirs(THUMBNAIL_DIR, exist_ok=True)
app.mount("/thumbnail", StaticFiles(directory=THUMBNAIL_DIR), name="thumbnails")

# Auth routes - NO /api prefix (matching original: /signup, /login, /verify-email, /resend-verification)
app.include_router(auth.router)

# Bot routes - /api prefix for admin, NO prefix for public/client
app.include_router(bots.router)  # handles /api/admin/bots, /api/bot/*, /public/bots, /clientrequest/bots
app.include_router(bots.api_router)  # handles /api/admin/botusers CRUD

# Course routes - mixed: admin has /api, user-facing NO prefix
app.include_router(courses.router)  # handles /api/admin/courses, /public/courses, /courses (POST)

# User routes - NO /api prefix (matching original: /users/me, /my-purchases, /my-library, /my-progress)
app.include_router(users.router)

# Indicator routes - NO /api prefix (matching original: /add/indicator, /fetch/indicators, etc.)
app.include_router(indicators.router)

# Purchase routes - NO /api prefix (matching original: /purchase)
app.include_router(purchases.router)

# Webhook routes - NO /api prefix (matching original: /webhook, /telegram_user_webhook)
app.include_router(webhooks.router)

# Admin routes - /api prefix
app.include_router(admin.router, prefix="/api")

# Progress routes - NO /api prefix (matching original: /batches/*, /schedules/*, /progress/*, /admin/batches/*/progress)
app.include_router(progress.router)

# Dashboard - already has /api/admin/dashboard
app.include_router(dashboard.router)

# Miniapp - already has /api/miniapp
app.include_router(miniapp.router)

# Search - NO /api prefix (matching original: /search)
app.include_router(search.router)

# Uploads - already has /api/upload
app.include_router(uploads.router)

# TradingView API - NO /api prefix (matching original: /tv-status, /validate, /access)
app.include_router(tradingview_api.router)

# Static router must be LAST because it contains the SPA catch-all `/{full_path:path}`
app.include_router(static.router)


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)