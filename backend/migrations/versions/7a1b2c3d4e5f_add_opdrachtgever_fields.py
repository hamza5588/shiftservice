"""add opdrachtgever fields

Revision ID: 7a1b2c3d4e5f
Revises: 58827378aa99
Create Date: 2024-03-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7a1b2c3d4e5f'
down_revision = '58827378aa99'
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to opdrachtgevers table
    op.add_column('opdrachtgevers', sa.Column('bedrijfsnaam', sa.String(100), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('kvk_nummer', sa.String(20), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('adres', sa.String(200), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('postcode', sa.String(10), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('stad', sa.String(100), nullable=True))
    op.add_column('opdrachtgevers', sa.Column('telefoon', sa.String(20), nullable=True))

def downgrade():
    # Remove the columns in reverse order
    op.drop_column('opdrachtgevers', 'telefoon')
    op.drop_column('opdrachtgevers', 'stad')
    op.drop_column('opdrachtgevers', 'postcode')
    op.drop_column('opdrachtgevers', 'adres')
    op.drop_column('opdrachtgevers', 'kvk_nummer')
    op.drop_column('opdrachtgevers', 'bedrijfsnaam') 