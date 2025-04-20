"""create alembic_version table

Revision ID: 0a0a0a0a0a0a
Revises: 
Create Date: 2025-04-18 07:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0a0a0a0a0a0a'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create alembic_version table
    op.create_table(
        'alembic_version',
        sa.Column('version_num', sa.String(32), nullable=False),
        sa.PrimaryKeyConstraint('version_num')
    )

def downgrade():
    # Drop alembic_version table
    op.drop_table('alembic_version') 