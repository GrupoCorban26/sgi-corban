"""add_empresa_column_manual

Revision ID: 1213d297b549
Revises: 1a2b3c4d5e6f
Create Date: 2026-02-16 10:11:06.798861

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1213d297b549'
down_revision: Union[str, Sequence[str], None] = '1a2b3c4d5e6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('empleados', sa.Column('empresa', sa.String(length=50), nullable=False, server_default='Corban Trans Logistic'), schema='adm')


def downgrade() -> None:
    op.drop_column('empleados', 'empresa', schema='adm')
