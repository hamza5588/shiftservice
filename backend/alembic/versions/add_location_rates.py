"""add location rates

Revision ID: add_location_rates
Revises: 
Create Date: 2024-04-19 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'add_location_rates'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create location_rates table
    op.create_table(
        'location_rates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('pass_type', sa.String(50), nullable=False),
        sa.Column('base_rate', sa.Float(), nullable=False),
        sa.Column('evening_rate', sa.Float(), nullable=False),
        sa.Column('night_rate', sa.Float(), nullable=False),
        sa.Column('weekend_rate', sa.Float(), nullable=False),
        sa.Column('holiday_rate', sa.Float(), nullable=False),
        sa.Column('new_years_eve_rate', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_location_rates_id'), 'location_rates', ['id'], unique=False)

def downgrade():
    # Drop location_rates table
    op.drop_index(op.f('ix_location_rates_id'), table_name='location_rates')
    op.drop_table('location_rates') 