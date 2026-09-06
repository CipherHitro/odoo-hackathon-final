import resend

from app.core.config import settings


resend.api_key = settings.RESEND_API_KEY


async def send_email(
    to: str | list[str],
    subject: str,
    html: str,
    attachments: list[dict] | None = None,
):
    if isinstance(to, str):
        to = [to]

    params: resend.Emails.SendParams = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": to,
        "subject": subject,
        "html": html,
    }

    if attachments:
        params["attachments"] = attachments

    return await resend.Emails.send_async(params)


