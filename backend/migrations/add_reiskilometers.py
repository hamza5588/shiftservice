"""add reiskilometers field

Revision ID: add_reiskilometers
Revises: add_shift_fields
Create Date: 2025-04-07 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_reiskilometers'
down_revision = 'add_shift_fields'
branch_labels = None
depends_on = None

def upgrade():
    # Add reiskilometers column to shifts table
    op.add_column('shifts', sa.Column('reiskilometers', sa.Float(), nullable=True))

def downgrade():
    # Remove reiskilometers column from shifts table
    op.drop_column('shifts', 'reiskilometers') 