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
    send_payslip_email,
)
from app.services.payslip_pdf import generate_payslip_pdf  # noqa: E402
from unittest.mock import MagicMock  # noqa: E402
from decimal import Decimal  # noqa: E402

DEFAULT_RECIPIENT = "rrohit2911@gmail.com"


async def test_welcome(recipient: str) -> None:
    print(f"--- welcome email -> {recipient}")
    response = await send_welcome_email(to=recipient, name="Rohit")
    print(f"sent! resend id: {response.get('id', response)}")


async def test_password_reset(recipient: str) -> None:
    otp = generate_otp()
    print(f"--- password reset email -> {recipient} (otp: {otp})")
    response = await send_password_reset_otp(to=recipient, name="Rohit", otp=otp)
    print(f"sent! resend id: {response.get('id', response)}")


async def test_payslip(recipient: str) -> None:
    print(f"--- payslip PDF email -> {recipient}")
    mock_slip = MagicMock()
    mock_slip.employee_id = 1
    mock_slip.employee.name = "Rohit"
    mock_slip.employee.work_email = recipient
    mock_slip.date_from = "2026-02-01"
    mock_slip.date_to = "2026-02-28"
    mock_slip.worked_days = 22
    mock_slip.status = "done"
    mock_slip.basic_wage = Decimal("50000.00")
    mock_slip.gross_wage = Decimal("65000.00")
    mock_slip.net_wage = Decimal("58000.00")

    mock_line1 = MagicMock()
    mock_line1.sequence = 1
    mock_line1.code = "BASIC"
    mock_line1.rule_name = "Basic Wage"
    mock_line1.category = "basic"
    mock_line1.amount = Decimal("50000.00")

    mock_line2 = MagicMock()
    mock_line2.sequence = 2
    mock_line2.code = "HRA"
    mock_line2.rule_name = "House Rent Allowance"
    mock_line2.category = "allowance"
    mock_line2.amount = Decimal("15000.00")

    mock_line3 = MagicMock()
    mock_line3.sequence = 3
    mock_line3.code = "PF"
    mock_line3.rule_name = "Provident Fund"
    mock_line3.category = "deduction"
    mock_line3.amount = Decimal("7000.00")

    mock_slip.lines = [mock_line1, mock_line2, mock_line3]

    pdf_bytes = generate_payslip_pdf(
        mock_slip,
        company_name="PeoplePay360",
        payrun_name="February 2026",
    )

    response = await send_payslip_email(
        to=recipient,
        name="Rohit",
        payrun_name="February 2026",
        period="2026-02-01 to 2026-02-28",
        net_salary="INR 58,000.00",
        pdf_bytes=pdf_bytes,
        filename="Payslip_February_2026_Rohit.pdf",
    )
    print(f"sent! resend id: {response.get('id', response)}")


async def main() -> None:
    args = sys.argv[1:]
    which = args[0] if args else "all"
    recipient = args[1] if len(args) > 1 else DEFAULT_RECIPIENT

    if which in ("all", "welcome"):
        await test_welcome(recipient)
    if which in ("all", "reset", "password_reset"):
        await test_password_reset(recipient)
    if which in ("all", "payslip"):
        await test_payslip(recipient)


if __name__ == "__main__":
    asyncio.run(main())