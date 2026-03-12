from typing import Optional, List
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core import security
from app.database.db_connection import get_db
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado


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


# Roles que ven información de TODOS los comerciales (sin restricción de equipo)
ROLES_VER_TODO = ["ADMIN", "GERENCIA", "SISTEMAS", "PRICING"]


async def resolver_comercial_ids(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(security.get_current_active_auth)
) -> Optional[List[int]]:
    """
    Resuelve qué usuario_ids comerciales puede ver el usuario actual.
    
    - ADMIN/GERENCIA/SISTEMAS → None (ve todo, sin filtro)
    - JEFE_COMERCIAL → Lista con su propio ID + IDs de sus subordinados directos
    - COMERCIAL → Lista solo con su propio ID
    
    Retorna None si no se debe aplicar filtro (rol global).
    Retorna lista de IDs si se debe filtrar.
    """
    roles = current_user.get("roles", [])
    user_id = int(current_user.get("sub"))
    
    # Roles globales: ven todo sin filtro
    if any(role in roles for role in ROLES_VER_TODO):
        return None
    
    # JEFE_COMERCIAL: ve lo suyo + lo de sus subordinados directos
    if "JEFE_COMERCIAL" in roles:
        # 1. Obtener el empleado_id del jefe
        stmt_jefe = select(Usuario.empleado_id).where(Usuario.id == user_id)
        empleado_id_jefe = (await db.execute(stmt_jefe)).scalar()
        
        if not empleado_id_jefe:
            return [user_id]  # Sin empleado asociado, solo ve lo suyo
        
        # 2. Buscar empleados subordinados (donde jefe_id = empleado_id del jefe)
        stmt_subordinados = select(Empleado.id).where(
            Empleado.jefe_id == empleado_id_jefe,
            Empleado.is_active == True
        )
        empleado_ids_subordinados = (await db.execute(stmt_subordinados)).scalars().all()
        
        # 3. Obtener los usuario_ids de esos empleados
        if empleado_ids_subordinados:
            stmt_usuarios = select(Usuario.id).where(
                Usuario.empleado_id.in_(empleado_ids_subordinados),
                Usuario.is_active == True
            )
            usuario_ids_subordinados = (await db.execute(stmt_usuarios)).scalars().all()
            return [user_id] + list(usuario_ids_subordinados)
        
        return [user_id]
    
    # COMERCIAL u otro rol: solo ve lo propio
    return [user_id]
