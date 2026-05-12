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


def require_any_role(*roles_requeridos: str):
    """
    Factory de dependencias para verificar roles.
    Uso: @router.get("/", dependencies=[Depends(require_any_role("ADMIN", "GERENCIA"))])
    SISTEMAS tiene bypass implícito (Super-Admin).
    """
    def role_checker(current_user: dict = Depends(security.get_current_active_auth)):
        roles = current_user.get("roles", [])

        # SISTEMAS tiene acceso total implícito
        if "SISTEMAS" in roles:
            return True

        if not any(r in roles for r in roles_requeridos):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere uno de los siguientes roles: {', '.join(roles_requeridos)}"
            )
        return True

    return role_checker

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
    
    # JEFE_COMERCIAL: ve lo suyo + subordinados recursivos (cadena completa)
    if "JEFE_COMERCIAL" in roles:
        # 1. Obtener el empleado_id del jefe
        stmt_jefe = select(Usuario.empleado_id).where(Usuario.id == user_id)
        empleado_id_jefe = (await db.execute(stmt_jefe)).scalar()
        
        if not empleado_id_jefe:
            return [user_id]  # Sin empleado asociado, solo ve lo suyo
        
        # 2. Buscar subordinados recursivamente (todos los niveles)
        todos_empleado_ids = await _get_subordinados_recursivo(db, empleado_id_jefe)
        
        # 3. Obtener los usuario_ids de esos empleados
        if todos_empleado_ids:
            stmt_usuarios = select(Usuario.id).where(
                Usuario.empleado_id.in_(todos_empleado_ids),
                Usuario.is_active == True
            )
            usuario_ids_subordinados = (await db.execute(stmt_usuarios)).scalars().all()
            return [user_id] + list(usuario_ids_subordinados)
        
        return [user_id]
    
    # COMERCIAL u otro rol: solo ve lo propio
    return [user_id]


async def _get_subordinados_recursivo(
    db: AsyncSession, 
    jefe_empleado_id: int, 
    visitados: set = None
) -> List[int]:
    """
    Obtiene todos los empleado_ids subordinados recursivamente.
    Evita ciclos con el set de visitados.
    """
    if visitados is None:
        visitados = set()
    
    if jefe_empleado_id in visitados:
        return []
    visitados.add(jefe_empleado_id)
    
    stmt = select(Empleado.id).where(
        Empleado.jefe_id == jefe_empleado_id,
        Empleado.is_active == True
    )
    directos = (await db.execute(stmt)).scalars().all()
    
    todos = list(directos)
    for sub_id in directos:
        sub_subordinados = await _get_subordinados_recursivo(db, sub_id, visitados)
        todos.extend(sub_subordinados)
    
    return todos


async def get_jefes_subordinados(
    db: AsyncSession,
    empleado_id_jefe: int
) -> List[dict]:
    """
    Obtiene los jefes comerciales que son subordinados directos.
    Solo devuelve empleados que a su vez tienen subordinados propios (son jefes).
    Usado para el dropdown 'Equipo de:' en el frontend.
    """
    # Subordinados directos del jefe actual
    stmt_directos = select(Empleado).where(
        Empleado.jefe_id == empleado_id_jefe,
        Empleado.is_active == True
    )
    directos = (await db.execute(stmt_directos)).scalars().all()
    
    jefes = []
    for emp in directos:
        # Verificar si este subordinado tiene subordinados propios (es jefe)
        stmt_tiene_sub = select(Empleado.id).where(
            Empleado.jefe_id == emp.id,
            Empleado.is_active == True
        ).limit(1)
        tiene_subordinados = (await db.execute(stmt_tiene_sub)).scalar()
        
        if tiene_subordinados:
            jefes.append({
                "empleado_id": emp.id,
                "nombre": f"{emp.nombres} {emp.apellido_paterno}",
            })
    
    return jefes
