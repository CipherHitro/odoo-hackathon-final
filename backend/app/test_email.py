"""Manual smoke tests for the email service (sends REAL emails via Resend).

Usage (from the backend/ folder):

    uv run python -m app.test_email                # send both emails
    uv run python -m app.test_email welcome        # welcome email only
    uv run python -m app.test_email reset          # password reset OTP only
    uv run python -m app.test_email welcome you@example.com   # custom recipient
"""

import asyncio
import sys
from pathlib import Path

# allow running as a plain script too: uv run python app/test_email.py
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.security import generate_otp  # noqa: E402
from app.services.email.service import (  # noqa: E402
    send_password_reset_otp,
    send_welcome_email,
)

DEFAULT_RECIPIENT = "example@gmail.com"


async def test_welcome(recipient: str) -> None:
    print(f"--- welcome email -> {recipient}")
    response = await send_welcome_email(to=recipient, name="Rohit")
    print(f"sent! resend id: {response.get('id', response)}")


async def test_password_reset(recipient: str) -> None:
    otp = generate_otp()
    print(f"--- password reset email -> {recipient} (otp: {otp})")
    response = await send_password_reset_otp(to=recipient, name="Rohit", otp=otp)
    print(f"sent! resend id: {response.get('id', response)}")


async def main() -> None:
    args = sys.argv[1:]
    which = args[0] if args else "all"
    recipient = args[1] if len(args) > 1 else DEFAULT_RECIPIENT

    if which in ("all", "welcome"):
        await test_welcome(recipient)
    if which in ("all", "reset", "password_reset"):
        await test_password_reset(recipient)


if __name__ == "__main__":
    asyncio.run(main())