"""merge heads

Revision ID: 20250418075723
Revises: fd27061709ec, 20250418075623
Create Date: 2025-04-18 07:57:23.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250418075723'
down_revision = ('fd27061709ec', '20250418075623')
branch_labels = None
depends_on = None

def upgrade() -> None:
    pass

def downgrade() -> None:
    pass 