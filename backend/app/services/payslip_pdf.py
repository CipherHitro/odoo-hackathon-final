"""Generate a PDF payslip for a single employee.

Uses fpdf2 (pure-Python, no OS-level dependencies).
Returns raw PDF bytes that can be base64-encoded for email attachment.
"""

from __future__ import annotations

import io
from decimal import Decimal
from fpdf import FPDF

from app.models.payroll import Payslip


def _fmt(amount: Decimal | float | int) -> str:
    """Format a monetary amount with commas and two decimal places."""
    return f"INR {float(amount):,.2f}"


def generate_payslip_pdf(
    slip: Payslip,
    company_name: str = "PeoplePay360",
    payrun_name: str = "",
) -> bytes:
    """Return the raw bytes of a single-page payslip PDF."""

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # ── colours ──────────────────────────────────────────────
    HEADER_BG = (99, 102, 241)  # indigo-500
    HEADER_FG = (255, 255, 255)
    SECTION_BG = (243, 244, 246)  # gray-100
    BORDER_CLR = (229, 231, 235)  # gray-200
    TEXT_DARK = (17, 24, 39)
    TEXT_MUTED = (107, 114, 128)

    w = pdf.w - 20  # usable width (10mm margins each side)

    # ── header band ──────────────────────────────────────────
    pdf.set_fill_color(*HEADER_BG)
    pdf.set_text_color(*HEADER_FG)
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(w, 14, company_name, new_x="LMARGIN", new_y="NEXT", fill=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(w, 8, "Salary Slip", new_x="LMARGIN", new_y="NEXT", fill=True, align="C")

    pdf.ln(6)

    # ── employee details ─────────────────────────────────────
    pdf.set_text_color(*TEXT_DARK)
    half = w / 2

    def _row(label: str, value: str) -> None:
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, label, new_x="RIGHT")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(half - 30, 6, str(value), new_x="RIGHT")

    emp_name = slip.employee.name if slip.employee else f"Employee #{slip.employee_id}"
    emp_email = slip.employee.work_email if slip.employee and slip.employee.work_email else "-"

    _row("Employee:", emp_name)
    _row("Period:", f"{slip.date_from} to {slip.date_to}")
    pdf.ln()
    _row("Email:", emp_email)
    _row("Payrun:", payrun_name or "-")
    pdf.ln()
    _row("Worked Days:", str(slip.worked_days))
    _row("Status:", slip.status.upper())
    pdf.ln(8)

    # ── lines table ──────────────────────────────────────────
    col_code = 25
    col_name = w - 25 - 25 - 35  # remaining
    col_cat = 25
    col_amt = 35

    # table header
    pdf.set_fill_color(*SECTION_BG)
    pdf.set_draw_color(*BORDER_CLR)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*TEXT_DARK)

    pdf.cell(col_code, 7, "Code", border=1, fill=True, align="C")
    pdf.cell(col_name, 7, "Description", border=1, fill=True)
    pdf.cell(col_cat, 7, "Category", border=1, fill=True, align="C")
    pdf.cell(col_amt, 7, "Amount", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    # table rows
    pdf.set_font("Helvetica", "", 9)
    lines = sorted(slip.lines, key=lambda l: l.sequence)
    for line in lines:
        pdf.set_text_color(*TEXT_DARK)
        pdf.cell(col_code, 6, line.code, border="LR", align="C")
        pdf.cell(col_name, 6, line.rule_name, border="LR")
        cat_label = line.category.replace("_", " ").title()
        pdf.set_text_color(*TEXT_MUTED)
        pdf.cell(col_cat, 6, cat_label, border="LR", align="C")
        # colour-code amounts
        amt = float(line.amount)
        if line.category.lower() == "deduction":
            pdf.set_text_color(220, 38, 38)  # red
        else:
            pdf.set_text_color(22, 163, 74)  # green
        pdf.cell(col_amt, 6, _fmt(line.amount), border="LR", align="R", new_x="LMARGIN", new_y="NEXT")

    # close bottom border
    pdf.cell(w, 0, "", border="T")
    pdf.ln(6)

    # ── totals ───────────────────────────────────────────────
    pdf.set_fill_color(*SECTION_BG)
    pdf.set_text_color(*TEXT_DARK)

    def _total_row(label: str, value, bold: bool = False) -> None:
        style = "B" if bold else ""
        pdf.set_font("Helvetica", style, 10)
        pdf.cell(w - col_amt, 7, label, border=1, fill=True, align="R")
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(col_amt, 7, _fmt(value), border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    _total_row("Basic Wage", slip.basic_wage)
    _total_row("Gross Wage", slip.gross_wage)
    _total_row("Net Wage", slip.net_wage, bold=True)

    pdf.ln(10)

    # ── footer ───────────────────────────────────────────────
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*TEXT_MUTED)
    pdf.cell(w, 5, "This is a system-generated payslip. No signature is required.", align="C")

    # ── return bytes ─────────────────────────────────────────
    return bytes(pdf.output())
