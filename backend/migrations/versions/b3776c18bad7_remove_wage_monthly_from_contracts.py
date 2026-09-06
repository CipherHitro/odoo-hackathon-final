"""remove_wage_monthly_from_contracts

Revision ID: b3776c18bad7
Revises: 100f1a014ed3
Create Date: 2026-09-06 07:48:14.566513

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3776c18bad7'
down_revision: Union[str, Sequence[str], None] = '100f1a014ed3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE contracts DROP CONSTRAINT IF EXISTS check_positive_contract_wage")
    op.drop_column('contracts', 'wage_monthly')
    op.create_unique_constraint('uq_payrun_employee', 'payslips', ['payrun_id', 'employee_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_payrun_employee', 'payslips', type_='unique')
    op.add_column('contracts', sa.Column('wage_monthly', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.create_check_constraint('check_positive_contract_wage', 'contracts', 'wage_monthly > 0')
