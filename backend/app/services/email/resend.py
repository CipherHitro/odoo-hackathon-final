import resend

from app.core.config import settings


resend.api_key = settings.RESEND_API_KEY


async def send_email(
    to: str | list[str],
    subject: str,
    html: str,
):
    if isinstance(to, str):
        to = [to]

    params: resend.Emails.SendParams = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": to,
        "subject": subject,
        "html": html,
    }

    return await resend.Emails.send_async(params)

