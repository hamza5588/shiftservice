"""add hour increase requests

Revision ID: add_hour_increase_requests
Revises: 8c9ac963ed29
Create Date: 2025-04-07 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_hour_increase_requests'
down_revision = '8c9ac963ed29'
branch_labels = None
depends_on = None

def upgrade():
    # Create shift_hour_increase_requests table
    op.create_table(
        'shift_hour_increase_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('shift_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.String(50), nullable=False),
        sa.Column('requested_end_time', sa.String(5), nullable=False),
        sa.Column('original_end_time', sa.String(5), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('request_date', sa.DateTime(), nullable=False),
        sa.Column('response_date', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['employee_id'], ['users.username'], ),
        sa.ForeignKeyConstraint(['shift_id'], ['shifts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_shift_hour_increase_requests_id'), 'shift_hour_increase_requests', ['id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_shift_hour_increase_requests_id'), table_name='shift_hour_increase_requests')
    op.drop_table('shift_hour_increase_requests') 