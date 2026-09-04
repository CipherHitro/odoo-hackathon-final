"""High level email functions - one per email the app sends.

Each function renders its HTML template and hands the result to the Resend
transport in resend.py.
"""

from app.core.config import settings
from app.services.email.resend import send_email
from app.services.email.templates import render_template


async def send_welcome_email(to: str, name: str) -> dict:
    """Send the welcome email (used after a successful registration)."""
    response = await send_email(
        to=to,
        subject=f"Welcome to {settings.APP_NAME} 🎉",
        html=render_template(
            "welcome.html",
            name=name,
            app_name=settings.APP_NAME,
        ),
    )
    return response


async def send_password_reset_otp(
    to: str,
    name: str,
    otp: str,
    expires_minutes: int | None = None,
) -> dict:
    """Email the 6 character OTP a user needs to reset their password."""
    if expires_minutes is None:
        expires_minutes = settings.OTP_EXPIRE_MINUTES

    response = await send_email(
        to=to,
        subject=f"{settings.APP_NAME} password reset code: {otp}",
        html=render_template(
            "password_reset.html",
            name=name,
            otp=otp,
            expires_minutes=expires_minutes,
            app_name=settings.APP_NAME,
        ),
    )
    return response