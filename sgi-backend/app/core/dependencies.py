from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core import security
from app.database.db_connection import get_db
from app.models.seguridad import Usuario


def require_permission(permiso_requerido: str):
    """
    Factory de dependencias para verificar permisos granulares.
    Uso: @router.get("/", dependencies=[Depends(require_permission("usuarios.listar"))])
    """
    def permission_checker(current_user: dict = Depends(security.get_current_active_auth)):
        permisos_usuario = current_user.get("permisos", [])

        # SISTEMAS tiene acceso total implícito (Super-Admin bypass)
        roles = current_user.get("roles", [])
        if "SISTEMAS" in roles:
            return True

        if permiso_requerido not in permisos_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes el permiso requerido: {permiso_requerido}"
            )
        return True

    return permission_checker


async def get_current_user_obj(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(security.get_current_active_auth)
) -> Usuario:
    """
    Dependencia reutilizable que retorna el objeto Usuario completo con roles cargados.
    Centralizada aquí para evitar duplicación en routers individuales.
    """
    user_id = int(payload.get("sub"))
    result = await db.execute(
        select(Usuario)
        .options(selectinload(Usuario.roles))
        .where(Usuario.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user
