"""add opdrachtgever columns

Revision ID: 20250418075623
Revises: 
Create Date: 2025-04-18 07:56:23.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250418075623'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add new columns to opdrachtgevers table
    op.add_column('opdrachtgevers', sa.Column('bedrijfsnaam', sa.String(100), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('kvk_nummer', sa.String(20), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('adres', sa.String(200), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('postcode', sa.String(10), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('stad', sa.String(100), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('telefoon', sa.String(20), nullable=True))

def downgrade() -> None:
    # Remove the columns in reverse order
    op.drop_column('opdrachtgevers', 'telefoon')
    op.drop_column('opdrachtgevers', 'stad')
    op.drop_column('opdrachtgevers', 'postcode')
    op.drop_column('opdrachtgevers', 'adres')
    op.drop_column('opdrachtgevers', 'kvk_nummer')
    op.drop_column('opdrachtgevers', 'bedrijfsnaam') 