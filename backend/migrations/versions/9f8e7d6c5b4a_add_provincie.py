"""add provincie to locations

Revision ID: 9f8e7d6c5b4a
Revises: 3b2a1c0d9e8f
Create Date: 2024-03-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9f8e7d6c5b4a'
down_revision = '3b2a1c0d9e8f'
branch_labels = None
depends_on = None

def upgrade():
    # Add provincie column to locations table
    op.add_column('locations', sa.Column('provincie', sa.String(100), nullable=True))

def downgrade():
    # Remove provincie column from locations table
    op.drop_column('locations', 'provincie') 