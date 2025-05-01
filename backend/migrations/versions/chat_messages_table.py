"""create chat messages table

Revision ID: 2024_03_21_chat_messages
Create Date: 2024-03-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '2024_03_21_chat_messages'
down_revision = None  # Starting fresh for this table
branch_labels = None
depends_on = None

def upgrade():
    # Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('receiver_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('shift_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['receiver_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['shift_id'], ['shifts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_messages_id'), 'chat_messages', ['id'], unique=False)
    op.create_index(op.f('ix_chat_messages_sender_id'), 'chat_messages', ['sender_id'], unique=False)
    op.create_index(op.f('ix_chat_messages_receiver_id'), 'chat_messages', ['receiver_id'], unique=False)
    op.create_index(op.f('ix_chat_messages_shift_id'), 'chat_messages', ['shift_id'], unique=False)

def downgrade():
    # Drop chat_messages table
    op.drop_index(op.f('ix_chat_messages_shift_id'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_receiver_id'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_sender_id'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_id'), table_name='chat_messages')
    op.drop_table('chat_messages') 