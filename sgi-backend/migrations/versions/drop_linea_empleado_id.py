"""remove empleado_id from lineas_corporativas

La columna empleado_id en lineas_corporativas es redundante.
El empleado responsable se deriva de: linea -> activo -> empleado_activo -> empleado.
Eliminamos la columna legacy para mantener un modelo device-centric limpio.

Revision ID: drop_linea_empleado_id
Revises: 1213d297b549
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'drop_linea_empleado_id'
down_revision = '1213d297b549'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Eliminar el índice
    op.drop_index('IX_lineas_corporativas_empleado', 'lineas_corporativas', schema='adm')
    # 2. Eliminar la FK constraint
    op.drop_constraint('FK__lineas_co__emple__00AA174D', 'lineas_corporativas', type_='foreignkey', schema='adm')
    # 3. Eliminar la columna
    op.drop_column('lineas_corporativas', 'empleado_id', schema='adm')


def downgrade():
    op.add_column(
        'lineas_corporativas',
        sa.Column('empleado_id', sa.Integer(), nullable=True),
        schema='adm'
    )
    op.create_foreign_key(
        'FK__lineas_co__emple__00AA174D',
        'lineas_corporativas', 'empleados',
        ['empleado_id'], ['id'],
        source_schema='adm', referent_schema='adm'
    )
    op.create_index(
        'IX_lineas_corporativas_empleado',
        'lineas_corporativas',
        ['empleado_id'],
        schema='adm'
    )
