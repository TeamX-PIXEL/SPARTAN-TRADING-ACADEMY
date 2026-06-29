import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from app.config import get_settings

settings = get_settings()


def get_smtp_config():
    return {
        'host': settings.SMTP_HOST,
        'port': settings.SMTP_PORT,
        'username': settings.SMTP_USERNAME,
        'password': settings.SMTP_PASSWORD,
        'from_email': settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME,
        'from_name': settings.SMTP_FROM_NAME,
    }


def send_verification_email(to_email: str, token: str, user_type: str = 'user') -> bool:
    config = get_smtp_config()

    if not config['username'] or not config['password']:
        print("ERROR: SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD in .env")
        return False

    verify_url = f"{settings.BASE_URL}/auth/verify.html?token={token}&type={user_type}"
    subject = "Verify Your Email Address"

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #007bff;">Email Verification</h2>
            <p>Hello,</p>
            <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_url}" 
                   style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Verify Email
                </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 3px;">
                {verify_url}
            </p>
            <p>This link will expire in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
                If you didn't request this, please ignore this email.
            </p>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Email Verification

    Hello,

    Thank you for signing up! Please verify your email address by visiting:

    {verify_url}

    This link will expire in 24 hours.

    If you didn't request this, please ignore this email.
    """

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{config['from_name']} <{config['from_email']}>"
        msg['To'] = to_email

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(config['host'], config['port']) as server:
            server.starttls()
            server.login(config['username'], config['password'])
            server.sendmail(config['from_email'], to_email, msg.as_string())

        print(f"✅ Verification email sent to {to_email}")
        return True

    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False


def generate_verification_token() -> str:
    import secrets
    import string
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(64))


def get_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=24)


def send_otp_email(to_email: str, otp_code: str, firstname: str = "") -> bool:
    config = get_smtp_config()

    if not config['username'] or not config['password']:
        print("ERROR: SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD in .env")
        return False

    greeting = f"Hi {firstname}" if firstname else "Hello"
    subject = f"Your Verification Code: {otp_code}"

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #111827;">Verify Your Email</h2>
            <p>{greeting},</p>
            <p>Use the following code to complete your registration:</p>
            <div style="text-align: center; margin: 30px 0;">
                <div style="background: #f3f4f6; border-radius: 10px; padding: 20px; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">{otp_code}</span>
                </div>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
                If you didn't request this, please ignore this email.
            </p>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Verify Your Email

    {greeting},

    Your verification code is: {otp_code}

    This code will expire in 10 minutes.

    If you didn't request this, please ignore this email.
    """

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{config['from_name']} <{config['from_email']}>"
        msg['To'] = to_email

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(config['host'], config['port']) as server:
            server.starttls()
            server.login(config['username'], config['password'])
            server.sendmail(config['from_email'], to_email, msg.as_string())

        print(f"OTP email sent to {to_email}")
        return True

    except Exception as e:
        print(f"Failed to send OTP email to {to_email}: {e}")
        return False


def send_forgot_password_otp_email(to_email: str, otp_code: str, firstname: str = "") -> bool:
    config = get_smtp_config()

    if not config['username'] or not config['password']:
        print("ERROR: SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD in .env")
        return False

    greeting = f"Hi {firstname}" if firstname else "Hello"
    subject = f"Your Password Reset Code: {otp_code}"

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #111827;">Password Reset Request</h2>
            <p>{greeting},</p>
            <p>We received a request to reset your password. Use the following code to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
                <div style="background: #f3f4f6; border-radius: 10px; padding: 20px; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">{otp_code}</span>
                </div>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
                If you didn't request this, please ignore this email.
            </p>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Password Reset Request

    {greeting},

    Your password reset code is: {otp_code}

    This code will expire in 10 minutes.

    If you didn't request a password reset, please ignore this email.
    """

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{config['from_name']} <{config['from_email']}>"
        msg['To'] = to_email

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(config['host'], config['port']) as server:
            server.starttls()
            server.login(config['username'], config['password'])
            server.sendmail(config['from_email'], to_email, msg.as_string())

        print(f"Forgot password OTP email sent to {to_email}")
        return True

    except Exception as e:
        print(f"Failed to send forgot password OTP email to {to_email}: {e}")
        return False