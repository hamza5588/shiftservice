"""add notes to dienstaanvragen

Revision ID: 1a0b9c8d7e6f
Revises: 
Create Date: 2025-04-07 13:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1a0b9c8d7e6f'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add notes column to dienstaanvragen table
    op.add_column('dienstaanvragen', sa.Column('notes', sa.Text(), nullable=True))

def downgrade():
    # Remove notes column from dienstaanvragen table
    op.drop_column('dienstaanvragen', 'notes') 