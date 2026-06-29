from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import mysql.connector
import secrets
import hashlib

from app.database import get_db, get_db_connection, SessionLocal
from app.models import User, AdminUser
from app.schemas import (
    UserCreate, UserLogin, UserResponse, VerifyEmailRequest,
    ResendVerificationRequest, AdminCreate, AdminLoginRequest,
    SendOTPRequest, VerifyOTPRequest, CompleteRegistrationRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user
from app.core.rate_limit import rate_limit_auth, rate_limit_otp
from app.services.email import (
    send_verification_email, generate_verification_token, get_token_expiry,
    send_otp_email,
)

router = APIRouter(tags=["Authentication"])

# In-memory OTP store: { email: { otp_hash, expires_at, step1_data } }
_otp_store: dict = {}

OTP_EXPIRY_MINUTES = 10


# ==========================================
# USER AUTH ENDPOINTS (original paths)
# ==========================================

# ------------------------------------------
# OTP-BASED REGISTRATION (Step 1 & 2)
# ------------------------------------------

@router.post("/send-otp")
def send_otp(payload: SendOTPRequest, db: Session = Depends(get_db), request: Request = None):
    """Step 1: Validate basic info, send 6-digit OTP to email, store step1 data."""
    if request:
        rate_limit_otp(request)
    """Step 1: Validate basic info, send 6-digit OTP to email, store step1 data."""
    # Check duplicate email
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check duplicate username
    if db.query(User).filter(User.UserID == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Generate 6-digit OTP
    otp_code = f"{secrets.randbelow(1000000):06d}"
    otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    # Store in memory
    _otp_store[payload.email.lower()] = {
        "otp_hash": otp_hash,
        "expires_at": expires_at,
        "step1_data": {
            "username": payload.username,
            "firstname": payload.firstname,
            "lastname": payload.lastname,
            "email": payload.email,
            "phone_number": payload.phone_number,
        },
    }

    # Send OTP email
    email_sent = send_otp_email(payload.email, otp_code, payload.firstname)
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

    return {"message": "OTP sent to your email", "email": payload.email}


@router.post("/verify-otp")
def verify_otp(payload: VerifyOTPRequest, request: Request = None):
    """Step 2: Verify OTP, return a short-lived registration token."""
    if request:
        rate_limit_otp(request)
    """Step 2: Verify OTP, return a short-lived registration token."""
    record = _otp_store.get(payload.email.lower())
    if not record:
        raise HTTPException(status_code=400, detail="No OTP request found. Please request a new code.")

    if datetime.now(timezone.utc) > record["expires_at"]:
        del _otp_store[payload.email.lower()]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")

    otp_hash = hashlib.sha256(payload.otp.encode()).hexdigest()
    if otp_hash != record["otp_hash"]:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check and try again.")

    # Generate a registration token (JWT with short expiry)
    reg_token = create_access_token(data={
        "sub": "registration",
        "email": payload.email,
        "step1": record["step1_data"],
    })

    # Clean up OTP store
    del _otp_store[payload.email.lower()]

    return {"message": "OTP verified", "registration_token": reg_token, "email": payload.email}


@router.post("/complete-registration", response_model=UserResponse)
def complete_registration(payload: CompleteRegistrationRequest, db: Session = Depends(get_db), request: Request = None):
    """Step 3: Use registration token + address details to create user."""
    if request:
        rate_limit_auth(request)
    from app.core.security import SECRET_KEY, ALGORITHM
    import jwt

    try:
        decoded = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired registration token.")

    if decoded.get("sub") != "registration":
        raise HTTPException(status_code=400, detail="Invalid registration token.")

    step1_data = decoded.get("step1")
    if not step1_data:
        raise HTTPException(status_code=400, detail="Invalid registration token data.")

    # Final duplicate checks
    if db.query(User).filter(User.email == step1_data["email"]).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.UserID == step1_data["username"]).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_password = get_password_hash(payload.password)
    verification_token = generate_verification_token()
    token_expires = get_token_expiry()

    new_user = User(
        UserID=step1_data["username"],
        firstname=step1_data["firstname"],
        lastname=step1_data["lastname"],
        email=step1_data["email"],
        password=hashed_password,
        phone_number=step1_data["phone_number"],
        address=payload.address,
        country=payload.country,
        pincode=payload.pincode,
        is_verified=True,
        verification_token=verification_token,
        token_expires_at=token_expires,
    )
    new_user.client_name = f"{step1_data['firstname']} {step1_data['lastname']}"
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

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
        firstname=user.firstname,
        lastname=user.lastname,
        email=user.email,
        password=hashed_password,
        tvid=user.tvid,
        phone_number=user.phone_number,
        is_verified=False,
        verification_token=verification_token,
        token_expires_at=token_expires
    )
    new_user.client_name = f"{user.firstname} {user.lastname}"
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email inline (not BackgroundTasks)
    email_sent = send_verification_email(user.email, verification_token, 'user')
    if not email_sent:
        print(f"Warning: Failed to send verification email to {user.email}")

    return new_user


@router.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db), request: Request = None):
    if request:
        rate_limit_auth(request)
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

    token_expiry = timedelta(days=30) if user.remember else None
    access_token = create_access_token(data={"sub": str(db_user.id)}, expires_delta=token_expiry)
    return {"message": "Login successful", "access_token": access_token, "user_id": db_user.id, "username": db_user.UserID}


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


# ==========================================
# FORGOT PASSWORD FLOW
# ==========================================

_forgot_otp_store: dict = {}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db), request: Request = None):
    """Step 1: Accept email, send 6-digit OTP for password reset."""
    if request:
        rate_limit_otp(request)

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    otp_code = f"{secrets.randbelow(1000000):06d}"
    otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    _forgot_otp_store[payload.email.lower()] = {
        "otp_hash": otp_hash,
        "expires_at": expires_at,
    }

    from app.services.email import send_forgot_password_otp_email
    email_sent = send_forgot_password_otp_email(payload.email, otp_code, user.firstname or "")
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

    return {"message": "OTP sent to your email", "email": payload.email}


@router.post("/verify-forgot-otp")
def verify_forgot_otp(payload: VerifyOTPRequest, request: Request = None):
    """Step 2: Verify OTP, return a short-lived reset token."""
    if request:
        rate_limit_otp(request)

    record = _forgot_otp_store.get(payload.email.lower())
    if not record:
        raise HTTPException(status_code=400, detail="No OTP request found. Please request a new code.")

    if datetime.now(timezone.utc) > record["expires_at"]:
        del _forgot_otp_store[payload.email.lower()]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")

    otp_hash = hashlib.sha256(payload.otp.encode()).hexdigest()
    if otp_hash != record["otp_hash"]:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check and try again.")

    reset_token = create_access_token(data={
        "sub": "password_reset",
        "email": payload.email,
    }, expires_delta=timedelta(minutes=15))

    del _forgot_otp_store[payload.email.lower()]

    return {"message": "OTP verified", "reset_token": reset_token, "email": payload.email}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Step 3: Use reset token + new password to update user password."""
    from app.core.security import SECRET_KEY, ALGORITHM
    import jwt as pyjwt

    try:
        decoded = pyjwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if decoded.get("sub") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    email = decoded.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Invalid reset token data.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    hashed_password = get_password_hash(payload.password)
    user.password = hashed_password
    db.commit()

    return {"message": "Password reset successful. You can now log in."}
