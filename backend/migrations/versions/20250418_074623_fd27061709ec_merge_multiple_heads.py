"""merge multiple heads

Revision ID: fd27061709ec
Revises: 0a0a0a0a0a0a, fe8bc4a7911b
Create Date: 2025-04-18 07:46:23.077134+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fd27061709ec'
down_revision = ('0a0a0a0a0a0a', 'fe8bc4a7911b')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 