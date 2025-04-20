"""add priority hours to auto approvals

Revision ID: 58827378aa99
Revises: 3b2a1c0d9e8f
Create Date: 2025-04-12 21:51:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '58827378aa99'
down_revision = '3b2a1c0d9e8f'
branch_labels = None
depends_on = None

def upgrade():
    # Add priority_hours column to auto_approvals table
    op.add_column('auto_approvals', sa.Column('priority_hours', sa.Integer(), nullable=True))

def downgrade():
    # Remove priority_hours column from auto_approvals table
    op.drop_column('auto_approvals', 'priority_hours') 