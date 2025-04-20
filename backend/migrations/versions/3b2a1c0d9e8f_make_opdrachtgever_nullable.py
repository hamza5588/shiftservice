"""make opdrachtgever_id nullable

Revision ID: 3b2a1c0d9e8f
Revises: 2c1b0a9d8e7f
Create Date: 2025-04-07 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '3b2a1c0d9e8f'
down_revision = '2c1b0a9d8e7f'
branch_labels = None
depends_on = None

def upgrade():
    # Make opdrachtgever_id nullable in dienstaanvragen table
    op.alter_column('dienstaanvragen', 'opdrachtgever_id',
                    existing_type=sa.Integer(),
                    nullable=True)

def downgrade():
    # Make opdrachtgever_id non-nullable again
    op.alter_column('dienstaanvragen', 'opdrachtgever_id',
                    existing_type=sa.Integer(),
                    nullable=False) 