"""add shift fields

Revision ID: add_shift_fields
Revises: 
Create Date: 2025-04-07 12:55:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_shift_fields'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to shifts table
    op.add_column('shifts', sa.Column('titel', sa.String(), nullable=True))
    op.add_column('shifts', sa.Column('stad', sa.String(), nullable=True))
    op.add_column('shifts', sa.Column('provincie', sa.String(), nullable=True))
    op.add_column('shifts', sa.Column('adres', sa.String(), nullable=True))
    op.add_column('shifts', sa.Column('required_profile', sa.String(), nullable=True))
    
    # Modify existing columns
    op.alter_column('shifts', 'datum',
                    existing_type=sa.DateTime(),
                    type_=sa.Date(),
                    existing_nullable=True,
                    nullable=False)
    op.alter_column('shifts', 'start_tijd',
                    existing_type=sa.String(5),
                    type_=sa.String(),
                    existing_nullable=True,
                    nullable=False)
    op.alter_column('shifts', 'eind_tijd',
                    existing_type=sa.String(5),
                    type_=sa.String(),
                    existing_nullable=True,
                    nullable=False)
    op.alter_column('shifts', 'locatie',
                    existing_type=sa.String(200),
                    type_=sa.String(),
                    existing_nullable=True,
                    nullable=False)
    op.alter_column('shifts', 'status',
                    existing_type=sa.String(50),
                    type_=sa.String(),
                    existing_nullable=True,
                    nullable=False)
    op.alter_column('shifts', 'medewerker_id',
                    existing_type=sa.Integer(),
                    type_=sa.String(),
                    existing_nullable=True,
                    nullable=True)

def downgrade():
    # Remove new columns
    op.drop_column('shifts', 'required_profile')
    op.drop_column('shifts', 'adres')
    op.drop_column('shifts', 'provincie')
    op.drop_column('shifts', 'stad')
    op.drop_column('shifts', 'titel')
    
    # Revert column modifications
    op.alter_column('shifts', 'medewerker_id',
                    existing_type=sa.String(),
                    type_=sa.Integer(),
                    existing_nullable=True,
                    nullable=True)
    op.alter_column('shifts', 'status',
                    existing_type=sa.String(),
                    type_=sa.String(50),
                    existing_nullable=False,
                    nullable=True)
    op.alter_column('shifts', 'locatie',
                    existing_type=sa.String(),
                    type_=sa.String(200),
                    existing_nullable=False,
                    nullable=True)
    op.alter_column('shifts', 'eind_tijd',
                    existing_type=sa.String(),
                    type_=sa.String(5),
                    existing_nullable=False,
                    nullable=True)
    op.alter_column('shifts', 'start_tijd',
                    existing_type=sa.String(),
                    type_=sa.String(5),
                    existing_nullable=False,
                    nullable=True)
    op.alter_column('shifts', 'datum',
                    existing_type=sa.Date(),
                    type_=sa.DateTime(),
                    existing_nullable=False,
                    nullable=True) 