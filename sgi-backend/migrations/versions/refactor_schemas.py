"""refactor schemas

Revision ID: 1a2b3c4d5e6f
Revises: 
Create Date: 2026-02-09 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1a2b3c4d5e6f'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # 1. Rename table 'conductores' to 'asignacion_vehiculos'
    op.rename_table('conductores', 'asignacion_vehiculos', schema='logistica')
    
    # 2. Drop table 'lead_feedback' (if it exists)
    # Using raw SQL to be safe if table doesn't exist, though typically we'd check
    op.execute("DROP TABLE IF EXISTS comercial.lead_feedback")


def downgrade():
    # 1. Rename back
    op.rename_table('asignacion_vehiculos', 'conductores', schema='logistica')
    
    # 2. Re-create lead_feedback (simplified structure for rollback)
    op.create_table('lead_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('comercial_id', sa.Integer(), nullable=False),
        sa.Column('estado_llamada', sa.String(length=30), nullable=False),
        sa.Column('fecha_contacto', sa.DateTime(timezone=True), nullable=False),
        sa.Column('proxima_fecha_contacto', sa.Date(), nullable=True),
        sa.Column('comentario', sa.String(length=500), nullable=True),
        sa.Column('cliente_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['cliente_id'], ['comercial.clientes.id'], ),
        sa.ForeignKeyConstraint(['comercial_id'], ['seg.usuarios.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='comercial'
    )
