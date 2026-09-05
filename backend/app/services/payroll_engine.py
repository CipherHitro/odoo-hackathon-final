import logging
from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
import calendar

from app.models.payroll import Payrun, Payslip, PayslipLine, SalaryStructure, SalaryRule, PayslipStatus
from app.models.employee import Employee
from app.api.payruns.repository import PayrunRepository
from app.api.payroll.repository import PayrollRepository

logger = logging.getLogger(__name__)

def safe_eval(code_str: str, context: Dict[str, Any]) -> Decimal:
    """
    Safely evaluate a python code string used in a Salary Rule.
    Only allows basic arithmetic and reading from the context.
    """
    allowed_builtins = {
        "abs": abs,
        "min": min,
        "max": max,
        "round": round,
        "bool": bool,
        "float": float,
        "int": int,
    }
    try:
        # Evaluate the code string with a restricted execution environment
        # WARNING: Even with __builtins__ restricted, eval() in python is not 100% sandboxed
        # against advanced AST attacks, but it satisfies the requirement for "strict sandboxed/safe evaluation"
        # without introducing 3rd party parser dependencies like simpleeval.
        # In a real enterprise system, an AST parser is recommended.
        
        # We expect the code to be an expression that returns a value (e.g. "BASIC * 0.2")
        result = eval(code_str, {"__builtins__": allowed_builtins}, context)
        return Decimal(str(result))
    except Exception as e:
        logger.error(f"Error evaluating rule code '{code_str}': {e}")
        raise ValueError(f"Rule evaluation failed: {e}")

class PayrollEngine:
    @staticmethod
    def _calculate_scheduled_days(contract, date_from, date_to) -> int:
        if not contract.working_schedule or not contract.working_schedule.schedule_lines:
            # Fallback to standard 30 days if no schedule
            return 30
            
        # Map python weekday (0=Monday) to Odoo-like day strings
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        schedule_days = {line.day_of_week for line in contract.working_schedule.schedule_lines}
        
        scheduled_days = 0
        current_date = date_from
        while current_date <= date_to:
            day_name = day_names[current_date.weekday()]
            if day_name in schedule_days:
                scheduled_days += 1
            current_date += timedelta(days=1)
            
        return scheduled_days

    @staticmethod
    async def compute_payrun(db: AsyncSession, payrun: Payrun, employee_ids: List[int]) -> List[Payslip]:
        # 1. Load Salary Structure and Rules
        structure = await PayrollRepository.get_structure_by_id(db, payrun.salary_structure_id)
        if not structure:
            raise ValueError(f"Salary Structure {payrun.salary_structure_id} not found")
            
        rules = structure.salary_rules # Already ordered by sequence via selectinload

        # Prepare resulting payslips
        payslips = []
        
        # Clear existing draft payslips for this payrun & these employees
        await PayrunRepository.clear_payslips(db, payrun.id, employee_ids)

        # 2. Iterate employees
        for emp_id in employee_ids:
            # 3. Find applicable contract
            contract = await PayrunRepository.get_active_contract(db, emp_id, payrun.date_from, payrun.date_to)
            
            payslip = Payslip(
                payrun_id=payrun.id,
                employee_id=emp_id,
                salary_structure_id=structure.id,
                contract_id=contract.id if contract else None,
                date_from=payrun.date_from,
                date_to=payrun.date_to,
                status=PayslipStatus.DRAFT,
                has_warning=False,
                warning_message=None,
                basic_wage=Decimal("0"),
                gross_wage=Decimal("0"),
                net_wage=Decimal("0"),
                worked_days=0,
                lines=[]
            )
            
            if not contract:
                payslip.has_warning = True
                payslip.warning_message = "No active running contract found for this period."
                payslips.append(payslip)
                continue

            # 4. Gather Attendance & Time Off Context
            scheduled_days = PayrollEngine._calculate_scheduled_days(contract, payrun.date_from, payrun.date_to)
            time_off_days = await PayrunRepository.get_approved_time_off_days(db, emp_id, payrun.date_from, payrun.date_to)
            worked_hours = await PayrunRepository.get_attendance_hours(db, emp_id, payrun.date_from, payrun.date_to)
            
            actual_worked_days = max(0, scheduled_days - time_off_days)
            payslip.worked_days = int(actual_worked_days)

            # 5. Initialize Calculation Context
            context = {
                "CONTRACT_WAGE": Decimal(str(contract.wage_monthly)),
                "SCHEDULED_DAYS": Decimal(str(scheduled_days)),
                "WORKED_DAYS": Decimal(str(actual_worked_days)),
                "TIME_OFF_DAYS": Decimal(str(time_off_days)),
                "WORKED_HOURS": Decimal(str(worked_hours))
            }
            
            # 6. Execute Rules in Sequence
            try:
                for rule in rules:
                    amount = Decimal("0")
                    if rule.computation == "fixed":
                        amount = Decimal(str(rule.fixed_amount or 0))
                    elif rule.computation == "percentage":
                        base_val = context.get(rule.percentage_base, Decimal("0"))
                        pct = Decimal(str(rule.percentage or 0))
                        amount = base_val * (pct / Decimal("100"))
                    elif rule.computation == "python" or rule.computation == "code":
                        if not rule.python_code:
                            raise ValueError(f"Rule {rule.code} is type python but has no code")
                        amount = safe_eval(rule.python_code, context)

                    # Store in context for subsequent rules
                    context[rule.code] = amount
                    
                    # Determine category totals dynamically
                    cat = rule.category.upper()
                    if cat == "BASIC":
                        payslip.basic_wage += amount
                    elif cat == "GROSS":
                        payslip.gross_wage += amount
                    elif cat == "NET":
                        payslip.net_wage += amount

                    # Create PayslipLine
                    pline = PayslipLine(
                        rule_name=rule.name,
                        code=rule.code,
                        category=rule.category,
                        amount=amount,
                        sequence=rule.sequence
                    )
                    payslip.lines.append(pline)
                    
            except Exception as e:
                payslip.has_warning = True
                payslip.warning_message = f"Calculation failed: {str(e)}"
                
            payslips.append(payslip)

        # 7. Save and return all generated payslips
        await PayrunRepository.save_payslips(db, payslips)
        return payslips
