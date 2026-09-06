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


async def send_payslip_email(
    to: str,
    name: str,
    payrun_name: str,
    period: str,
    net_salary: str,
    pdf_bytes: bytes,
    filename: str = "payslip.pdf",
) -> dict:
    """Send an individual payslip email with base64-encoded PDF attachment."""
    import base64

    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    html = render_template(
        "payslip.html",
        name=name,
        payrun_name=payrun_name,
        period=period,
        net_salary=net_salary,
        app_name=settings.APP_NAME,
    )

    attachments = [
        {
            "filename": filename,
            "content": pdf_base64,
        }
    ]

    response = await send_email(
        to=to,
        subject=f"Salary Slip — {payrun_name} | {settings.APP_NAME}",
        html=html,
        attachments=attachments,
    )
    return response


async def send_bulk_payslip_emails(
    payslip_payloads: list[dict],
) -> dict:
    """Send bulk payslip emails to employees with PDF attachments.
    
    Resend attachment API requires sending each message individually.
    We iterate over payloads and return aggregated delivery results.
    """
    import asyncio
    import logging

    logger = logging.getLogger(__name__)
    results = []

    for item in payslip_payloads:
        recipient = item.get("to")
        name = item.get("name", "Employee")
        if not recipient:
            results.append({
                "to": "",
                "name": name,
                "status": "skipped",
                "error": "No email address found for this employee",
            })
            continue

        try:
            res = await send_payslip_email(
                to=recipient,
                name=name,
                payrun_name=item.get("payrun_name", "Payrun"),
                period=item.get("period", ""),
                net_salary=item.get("net_salary", "0.00"),
                pdf_bytes=item["pdf_bytes"],
                filename=item.get("filename", f"payslip_{name.replace(' ', '_')}.pdf"),
            )
            res_id = res.get("id") if isinstance(res, dict) else str(res)
            results.append({
                "to": recipient,
                "name": name,
                "status": "sent",
                "resend_id": res_id,
            })
            # Small pause between sends to be kind to Resend rate limits
            await asyncio.sleep(0.3)
        except Exception as exc:
            logger.error(f"Failed to send payslip to {recipient}: {exc}")
            results.append({
                "to": recipient,
                "name": name,
                "status": "failed",
                "error": str(exc),
            })

    sent_count = sum(1 for r in results if r["status"] == "sent")
    failed_count = sum(1 for r in results if r["status"] == "failed")
    skipped_count = sum(1 for r in results if r["status"] == "skipped")

    return {
        "total": len(payslip_payloads),
        "sent": sent_count,
        "failed": failed_count,
        "skipped": skipped_count,
        "results": results,
    }