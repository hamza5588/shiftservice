"""add employee fields

Revision ID: add_employee_fields
Revises: 
Create Date: 2024-03-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_employee_fields'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to medewerkers table
    op.add_column('medewerkers', sa.Column('voornaam', sa.String(100), nullable=True))
    op.add_column('medewerkers', sa.Column('tussenvoegsel', sa.String(50), nullable=True))
    op.add_column('medewerkers', sa.Column('achternaam', sa.String(100), nullable=True))
    op.add_column('medewerkers', sa.Column('initialen', sa.String(20), nullable=True))
    op.add_column('medewerkers', sa.Column('huisnummer', sa.String(10), nullable=True))
    op.add_column('medewerkers', sa.Column('huisnummer_toevoeging', sa.String(10), nullable=True))
    op.add_column('medewerkers', sa.Column('postcode', sa.String(10), nullable=True))
    op.add_column('medewerkers', sa.Column('stad', sa.String(100), nullable=True))
    op.add_column('medewerkers', sa.Column('geboorteplaats', sa.String(100), nullable=True))
    op.add_column('medewerkers', sa.Column('geslacht', sa.String(20), nullable=True))
    op.add_column('medewerkers', sa.Column('burgerlijke_staat', sa.String(50), nullable=True))
    op.add_column('medewerkers', sa.Column('bsn', sa.String(9), nullable=True))
    op.add_column('medewerkers', sa.Column('nationaliteit', sa.String(100), nullable=True))
    op.add_column('medewerkers', sa.Column('pas_nummer', sa.String(50), nullable=True))
    op.add_column('medewerkers', sa.Column('pas_foto_voorzijde', sa.String(200), nullable=True))
    op.add_column('medewerkers', sa.Column('pas_foto_achterzijde', sa.String(200), nullable=True))
    op.add_column('medewerkers', sa.Column('contract_type', sa.String(50), nullable=True))
    op.add_column('medewerkers', sa.Column('contract_uren', sa.Integer(), nullable=True))
    op.add_column('medewerkers', sa.Column('contract_vervaldatum', sa.DateTime(), nullable=True))
    op.add_column('medewerkers', sa.Column('contract_bestand', sa.String(200), nullable=True))

    # Create index for BSN number
    op.create_index('ix_medewerkers_bsn', 'medewerkers', ['bsn'], unique=True)

def downgrade():
    # Drop the new columns
    op.drop_column('medewerkers', 'voornaam')
    op.drop_column('medewerkers', 'tussenvoegsel')
    op.drop_column('medewerkers', 'achternaam')
    op.drop_column('medewerkers', 'initialen')
    op.drop_column('medewerkers', 'huisnummer')
    op.drop_column('medewerkers', 'huisnummer_toevoeging')
    op.drop_column('medewerkers', 'postcode')
    op.drop_column('medewerkers', 'stad')
    op.drop_column('medewerkers', 'geboorteplaats')
    op.drop_column('medewerkers', 'geslacht')
    op.drop_column('medewerkers', 'burgerlijke_staat')
    op.drop_column('medewerkers', 'bsn')
    op.drop_column('medewerkers', 'nationaliteit')
    op.drop_column('medewerkers', 'pas_nummer')
    op.drop_column('medewerkers', 'pas_foto_voorzijde')
    op.drop_column('medewerkers', 'pas_foto_achterzijde')
    op.drop_column('medewerkers', 'contract_type')
    op.drop_column('medewerkers', 'contract_uren')
    op.drop_column('medewerkers', 'contract_vervaldatum')
    op.drop_column('medewerkers', 'contract_bestand')

    # Drop the BSN index
    op.drop_index('ix_medewerkers_bsn', table_name='medewerkers') 