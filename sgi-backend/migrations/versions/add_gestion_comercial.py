"""
Migración: Módulos de Gestión Comercial
- Agrega columna inbox_origen_id a comercial.clientes
- Crea tabla comercial.cliente_gestiones
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'add_gestion_comercial'
down_revision = '9061da630a96'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Nueva columna en clientes para trazabilidad Inbox → Cliente
    op.add_column(
        'clientes',
        sa.Column('inbox_origen_id', sa.Integer(), sa.ForeignKey('comercial.inbox.id'), nullable=True),
        schema='comercial'
    )

    # 2. Nueva tabla de gestiones
    op.create_table(
        'cliente_gestiones',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('cliente_id', sa.Integer(), sa.ForeignKey('comercial.clientes.id'), nullable=False),
        sa.Column('comercial_id', sa.Integer(), sa.ForeignKey('seg.usuarios.id'), nullable=False),
        sa.Column('tipo', sa.String(20), nullable=False),
        sa.Column('resultado', sa.String(30), nullable=False),
        sa.Column('comentario', sa.Text(), nullable=True),
        sa.Column('proxima_fecha_contacto', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema='comercial'
    )

    # 3. Índice para consultas frecuentes
    op.create_index(
        'ix_cliente_gestiones_cliente_id',
        'cliente_gestiones',
        ['cliente_id'],
        schema='comercial'
    )
    op.create_index(
        'ix_cliente_gestiones_comercial_id',
        'cliente_gestiones',
        ['comercial_id'],
        schema='comercial'
    )


def downgrade() -> None:
    op.drop_index('ix_cliente_gestiones_comercial_id', table_name='cliente_gestiones', schema='comercial')
    op.drop_index('ix_cliente_gestiones_cliente_id', table_name='cliente_gestiones', schema='comercial')
    op.drop_table('cliente_gestiones', schema='comercial')
    op.drop_column('clientes', 'inbox_origen_id', schema='comercial')
