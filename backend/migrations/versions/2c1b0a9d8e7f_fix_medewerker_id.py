"""fix medewerker_id type

Revision ID: 2c1b0a9d8e7f
Revises: 1a0b9c8d7e6f
Create Date: 2025-04-07 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2c1b0a9d8e7f'
down_revision = '1a0b9c8d7e6f'
branch_labels = None
depends_on = None

def upgrade():
    # Drop the existing foreign key constraint
    op.drop_constraint('shifts_ibfk_1', 'shifts', type_='foreignkey')
    
    # Change the column type from Integer to String
    op.alter_column('shifts', 'medewerker_id',
                    existing_type=sa.Integer(),
                    type_=sa.String(50),
                    existing_nullable=True,
                    nullable=True)
    
    # Add the new foreign key constraint
    op.create_foreign_key(
        'shifts_medewerker_id_fkey',
        'shifts', 'users',
        ['medewerker_id'], ['username']
    )

def downgrade():
    # Drop the foreign key constraint
    op.drop_constraint('shifts_medewerker_id_fkey', 'shifts', type_='foreignkey')
    
    # Change the column type back to Integer
    op.alter_column('shifts', 'medewerker_id',
                    existing_type=sa.String(50),
                    type_=sa.Integer(),
                    existing_nullable=True,
                    nullable=True)
    
    # Add back the original foreign key constraint
    op.create_foreign_key(
        'shifts_ibfk_1',
        'shifts', 'users',
        ['medewerker_id'], ['id']
    ) 