"""Service for handling bulk payslip dispatch via email.

Coordinates:
1. Payrun & Payslip retrieval with employee records
2. Payslip PDF document rendering (fpdf2)
3. Base64 payload encoding & bulk email delivery via Resend
"""

from __future__ import annotations

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.api.payruns.repository import PayrunRepository
from app.services.payslip_pdf import generate_payslip_pdf
from app.services.email.service import send_bulk_payslip_emails

DEMO_EMAILS = [
    "rrohit2911@gmail.com",
    "rohitnirmacse@gmail.com",
    "chrishhemsworth065@gmail.com",
]


class PayrollEmailService:
    @staticmethod
    async def send_payrun_payslips(
        db: AsyncSession,
        payrun_id: int,
        use_demo_emails: bool = False,
        custom_emails: Optional[List[str]] = None,
    ) -> dict:
        """Generate PDFs and send payslips for all employees in a payrun."""
        payrun = await PayrunRepository.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise ValueError("Payrun not found.")

        if not payrun.payslips:
            raise ValueError("This payrun contains no payslips to send.")

        demo_pool = custom_emails if custom_emails and len(custom_emails) > 0 else DEMO_EMAILS

        payloads = []
        for idx, slip in enumerate(payrun.payslips):
            emp = slip.employee
            emp_name = emp.name if emp else f"Employee #{slip.employee_id}"

            # Determine destination email address
            if use_demo_emails:
                target_email = demo_pool[idx % len(demo_pool)]
            else:
                target_email = (emp.work_email if emp and emp.work_email else None) or (
                    emp.personal_email if emp and emp.personal_email else None
                )

            # Generate binary PDF
            pdf_bytes = generate_payslip_pdf(
                slip=slip,
                company_name=settings.APP_NAME,
                payrun_name=payrun.name,
            )

            safe_emp_name = "".join(c for c in emp_name if c.isalnum() or c in (" ", "_", "-")).strip()
            safe_payrun_name = "".join(c for c in payrun.name if c.isalnum() or c in (" ", "_", "-")).strip()
            filename = f"Payslip_{safe_payrun_name}_{safe_emp_name}.pdf".replace(" ", "_")

            payloads.append({
                "to": target_email,
                "name": emp_name,
                "payrun_name": payrun.name,
                "period": f"{slip.date_from} to {slip.date_to}",
                "net_salary": f"INR {float(slip.net_wage):,.2f}",
                "pdf_bytes": pdf_bytes,
                "filename": filename,
            })

        # Send via email service
        dispatch_report = await send_bulk_payslip_emails(payloads)
        dispatch_report["payrun_id"] = payrun.id
        dispatch_report["payrun_name"] = payrun.name
        return dispatch_report
