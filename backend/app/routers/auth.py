from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import mysql.connector

from app.database import get_db, get_db_connection, SessionLocal
from app.models import User, AdminUser
from app.schemas import (
    UserCreate, UserLogin, UserResponse, VerifyEmailRequest,
    ResendVerificationRequest, AdminCreate, AdminLoginRequest
)
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user
from app.services.email import send_verification_email, generate_verification_token, get_token_expiry

router = APIRouter(tags=["Authentication"])


# ==========================================
# USER AUTH ENDPOINTS (original paths)
# ==========================================

@router.post("/signup", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_email = db.query(User).filter(User.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_userid = db.query(User).filter(User.UserID == user.UserID).first()
    if db_userid:
        raise HTTPException(status_code=400, detail="UserID already taken")

    hashed_password = get_password_hash(user.password)
    verification_token = generate_verification_token()
    token_expires = get_token_expiry()

    new_user = User(
        UserID=user.UserID,
        UserName=user.UserName,
        email=user.email,
        password=hashed_password,
        tvid=user.tvid,
        is_verified=False,
        verification_token=verification_token,
        token_expires_at=token_expires
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email inline (not BackgroundTasks)
    email_sent = send_verification_email(user.email, verification_token, 'user')
    if not email_sent:
        print(f"Warning: Failed to send verification email to {user.email}")

    return new_user


@router.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    # Check if email is verified
    if not db_user.is_verified:
        # Check if token expired and allow resend
        if db_user.token_expires_at and db_user.token_expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            # Generate new token
            new_token = generate_verification_token()
            new_expiry = get_token_expiry()
            db_user.verification_token = new_token
            db_user.token_expires_at = new_expiry
            db.commit()
            send_verification_email(user.email, new_token, 'user')

        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please check your inbox and verify your email before logging in."
        )

    try:
        db_user.last_login = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"Warning: failed to record last_login for user {db_user.id}: {exc}")

    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"message": "Login successful", "access_token": access_token, "UserUUID": db_user.UserUUID}


@router.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


# ==========================================
# EMAIL VERIFICATION ROUTES (original paths)
# ==========================================

@router.get("/verify-email")
def verify_email(token: str, type: str = "user"):
    """Verify email address using the token sent via email."""
    now = datetime.now(timezone.utc)

    if type == "admin":
        # Verify admin email (raw MySQL table)
        connection = get_db_connection()
        if connection is None:
            raise HTTPException(status_code=500, detail="Database connection error")

        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM admin_users WHERE verification_token = %s AND token_expires_at > NOW()",
                (token,)
            )
            admin = cursor.fetchone()

            if not admin:
                raise HTTPException(status_code=400, detail="Invalid or expired verification token")

            cursor.execute(
                "UPDATE admin_users SET is_verified = TRUE, verification_token = NULL, token_expires_at = NULL WHERE id = %s",
                (admin['id'],)
            )
            connection.commit()

            return {"success": True, "message": "Email verified successfully! You can now log in."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()
            connection.close()
    else:
        # Verify user email (SQLAlchemy table)
        db = SessionLocal()
        try:
            user = db.query(User).filter(
                User.verification_token == token,
                User.token_expires_at > now.replace(tzinfo=None)
            ).first()

            if not user:
                raise HTTPException(status_code=400, detail="Invalid or expired verification token")

            user.is_verified = True
            user.verification_token = None
            user.token_expires_at = None
            db.commit()

            return {"success": True, "message": "Email verified successfully! You can now log in."}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()


@router.post("/resend-verification")
def resend_verification(request: ResendVerificationRequest):
    """Resend verification email."""
    if request.type == "admin":
        connection = get_db_connection()
        if connection is None:
            raise HTTPException(status_code=500, detail="Database connection error")

        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM admin_users WHERE email = %s", (request.email,))
            admin = cursor.fetchone()

            if not admin:
                raise HTTPException(status_code=404, detail="Admin not found")

            if admin['is_verified']:
                return {"success": True, "message": "Email is already verified"}

            new_token = generate_verification_token()
            new_expiry = get_token_expiry()

            cursor.execute(
                "UPDATE admin_users SET verification_token = %s, token_expires_at = %s WHERE id = %s",
                (new_token, new_expiry, admin['id'])
            )
            connection.commit()

            email_sent = send_verification_email(request.email, new_token, 'admin')
            if not email_sent:
                raise HTTPException(status_code=500, detail="Failed to send verification email")

            return {"success": True, "message": "Verification email sent! Please check your inbox."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()
            connection.close()
    else:
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == request.email).first()

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            if user.is_verified:
                return {"success": True, "message": "Email is already verified"}

            new_token = generate_verification_token()
            new_expiry = get_token_expiry()

            user.verification_token = new_token
            user.token_expires_at = new_expiry
            db.commit()

            email_sent = send_verification_email(request.email, new_token, 'user')
            if not email_sent:
                raise HTTPException(status_code=500, detail="Failed to send verification email")

            return {"success": True, "message": "Verification email sent! Please check your inbox."}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()


# ==========================================
# ADMIN AUTH ENDPOINTS (original /api/admin/*)
# ==========================================

@router.post("/api/admin/login")
async def admin_login(credentials: AdminLoginRequest):
    """Authenticates an admin and returns a JWT token"""
    connection = get_db_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection error")

    cursor = connection.cursor(dictionary=True)
    try:
        # Fetch the admin user
        cursor.execute("SELECT * FROM admin_users WHERE username = %s", (credentials.username,))
        admin = cursor.fetchone()

        # Verify user exists and password matches
        if not admin or not verify_password(credentials.password, admin['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        # Check if email is verified
        if not admin.get('is_verified'):
            # Check if token expired and allow resend
            if admin.get('token_expires_at') and admin['token_expires_at'].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                # Generate new token
                new_token = generate_verification_token()
                new_expiry = get_token_expiry()
                cursor.execute(
                    "UPDATE admin_users SET verification_token = %s, token_expires_at = %s WHERE id = %s",
                    (new_token, new_expiry, admin['id'])
                )
                connection.commit()
                send_verification_email(admin['email'], new_token, 'admin')

            raise HTTPException(
                status_code=403,
                detail="Email not verified. Please check your inbox and verify your email before logging in."
            )

        # Generate the JWT Access Token (Expires in 2 hours)
        access_token = create_access_token(
            data={"sub": str(admin['id']), "role": "admin", "username": admin['username']}
        )

        return {"access_token": access_token, "token_type": "bearer"}

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        connection.close()


@router.post("/api/admin/register")
async def admin_register(request: AdminCreate):
    """Register a new admin with email verification."""
    connection = get_db_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection error")

    cursor = connection.cursor(dictionary=True)
    try:
        # Check if username or email already exists
        cursor.execute("SELECT * FROM admin_users WHERE username = %s OR email = %s", (request.username, request.email))
        existing = cursor.fetchone()

        if existing:
            raise HTTPException(status_code=409, detail="Username or email already exists")

        # Hash password using werkzeug
        hashed_password = get_password_hash(request.password)

        # Generate verification token
        verification_token = generate_verification_token()
        token_expires = get_token_expiry()

        # Insert new admin
        cursor.execute(
            """
            INSERT INTO admin_users (username, email, password_hash, is_verified, verification_token, token_expires_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (request.username, request.email, hashed_password, False, verification_token, token_expires)
        )
        connection.commit()

        # Send verification email
        email_sent = send_verification_email(request.email, verification_token, 'admin')
        if not email_sent:
            print(f"Warning: Failed to send verification email to {request.email}")

        return {
            "success": True,
            "message": "Admin registered successfully! Please check your email to verify your account before logging in."
        }

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        connection.close()


# ==========================================
# AUTH-PREFIXED ALIASES (new structure paths)
# ==========================================

@router.post("/auth/signup", response_model=UserResponse)
def auth_signup(user: UserCreate, db: Session = Depends(get_db)):
    return create_user(user, db)


@router.post("/auth/login")
def auth_login(user: UserLogin, db: Session = Depends(get_db)):
    return login_user(user, db)


@router.get("/auth/me", response_model=UserResponse)
def auth_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/auth/admin/login")
async def auth_admin_login(credentials: AdminLoginRequest):
    return await admin_login(credentials)


@router.post("/auth/admin/register")
async def auth_admin_register(request: AdminCreate):
    return await admin_register(request)
