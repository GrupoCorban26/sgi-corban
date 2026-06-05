"""Agregar fecha_limite_documentos a seguimientos y canal a alertas

Revision ID: 20260604_fecha_limite
Revises: -
Create Date: 2026-06-04
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '20260604_fecha_limite'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar fecha_limite_documentos a seguimientos
    op.add_column(
        'seguimientos',
        sa.Column('fecha_limite_documentos', sa.Date(), nullable=True),
        schema='comercial'
    )

    # Agregar canal a seguimiento_alertas_enviadas
    op.add_column(
        'seguimiento_alertas_enviadas',
        sa.Column('canal', sa.String(10), nullable=False, server_default='EMAIL'),
        schema='comercial'
    )


def downgrade() -> None:
    op.drop_column('seguimiento_alertas_enviadas', 'canal', schema='comercial')
    op.drop_column('seguimientos', 'fecha_limite_documentos', schema='comercial')
