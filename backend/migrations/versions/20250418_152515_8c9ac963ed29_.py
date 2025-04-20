"""empty message

Revision ID: 8c9ac963ed29
Revises: a6b6d12ccdfb, add_invoice_columns
Create Date: 2025-04-18 15:25:15.525210+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8c9ac963ed29'
down_revision = ('a6b6d12ccdfb', 'add_invoice_columns')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 