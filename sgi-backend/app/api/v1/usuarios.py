from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_active_auth
from app.core.dependencies import require_permission
from app.services.usuarios import UsuarioService
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioChangePassword,
    UsuarioAssignRoles
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

# ===========================================
# DROPDOWNS
# ===========================================

@router.get("/roles/dropdown")
async def get_roles_dropdown(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene lista de roles para dropdown"""
    service = UsuarioService(db)
    return await service.get_roles()


@router.get("/empleados/disponibles")
async def get_empleados_disponibles(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene empleados que no tienen usuario asignado"""
    service = UsuarioService(db)
    return await service.get_empleados_sin_usuario()


@router.get("/comerciales/dropdown")
async def get_comerciales_dropdown(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene lista de comerciales para dropdown (usuarios con rol COMERCIAL o JEFE_COMERCIAL)"""
    service = UsuarioService(db)
    return await service.get_comerciales()


# ===========================================
# CRUD USUARIOS
# ===========================================

@router.get("", dependencies=[Depends(require_permission("usuarios.listar"))])
async def listar_usuarios(
    busqueda: Optional[str] = Query(None, description="Buscar por correo o nombre"),
    is_active: Optional[bool] = Query(None, description="Filtrar por estado"),
    rol_id: Optional[int] = Query(None, description="Filtrar por rol"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista usuarios con paginación y filtros"""
    service = UsuarioService(db)
    return await service.get_all(
        busqueda=busqueda,
        is_active=is_active,
        rol_id=rol_id,
        page=page,
        page_size=page_size
    )


@router.get("/{id}", dependencies=[Depends(require_permission("usuarios.ver"))])
async def obtener_usuario(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene un usuario por ID con sus roles"""
    service = UsuarioService(db)
    usuario = await service.get_by_id(id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.post("", dependencies=[Depends(require_permission("usuarios.crear"))])
async def crear_usuario(
    usuario: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Crea un nuevo usuario vinculado a un empleado"""
    service = UsuarioService(db)
    result = await service.create(usuario, created_by=current_user_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.put("/{id}", dependencies=[Depends(require_permission("usuarios.editar"))])
async def actualizar_usuario(
    id: int,
    usuario: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Actualiza un usuario existente"""
    service = UsuarioService(db)
    result = await service.update(id, usuario, updated_by=current_user_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.delete("/{id}", dependencies=[Depends(require_permission("usuarios.eliminar"))])
async def desactivar_usuario(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Desactiva un usuario (soft delete)"""
    service = UsuarioService(db)
    result = await service.delete(id, updated_by=current_user_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.put("/{id}/reactivar", dependencies=[Depends(require_permission("usuarios.reactivar"))])
async def reactivar_usuario(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Reactiva un usuario desactivado"""
    service = UsuarioService(db)
    result = await service.reactivate(id, updated_by=current_user_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.put("/{id}/roles", dependencies=[Depends(require_permission("usuarios.asignar_roles"))])
async def asignar_roles(
    id: int,
    data: UsuarioAssignRoles,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Asigna roles a un usuario"""
    service = UsuarioService(db)
    result = await service.assign_roles(id, data.roles, created_by=current_user_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.put("/{id}/password", dependencies=[Depends(require_permission("usuarios.cambiar_password"))])
async def cambiar_password(
    id: int,
    data: UsuarioChangePassword,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Cambia la contraseña de un usuario"""
    service = UsuarioService(db)
    result = await service.change_password(id, data.password, updated_by=current_user_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result
