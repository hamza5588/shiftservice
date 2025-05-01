from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'alter_huisnummer_toevoeging'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Alter the huisnummer_toevoeging column to increase its length
    op.alter_column('medewerkers', 'huisnummer_toevoeging',
                    existing_type=sa.String(10),
                    type_=sa.String(200),
                    existing_nullable=True)

def downgrade():
    # Revert the change if needed
    op.alter_column('medewerkers', 'huisnummer_toevoeging',
                    existing_type=sa.String(200),
                    type_=sa.String(10),
                    existing_nullable=True) 