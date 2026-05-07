from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database.db_connection import get_db
from app.schemas.seg.rol import RolCreate, RolUpdate, RolResponse
from app.schemas.seg.permiso import PermisoResponse
from app.services.seguridad.roles_permisos_service import RolesPermisosService
from app.core.dependencies import get_current_user_obj
from app.models.seguridad import Usuario

router = APIRouter(prefix="/seguridad", tags=["Seguridad - Roles y Permisos"])

# =========================================================================
# ENDPOINTS PERMISOS (Solo Lectura)
# =========================================================================

@router.get("/permisos", response_model=List[PermisoResponse])
async def listar_permisos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """
    Lista todos los permisos disponibles en el sistema.
    Los permisos son sincronizados automáticamente, no se pueden crear manualmente por API.
    """
    service = RolesPermisosService(db)
    return await service.get_permisos()

@router.post("/permisos/sync", status_code=status.HTTP_200_OK)
async def sincronizar_permisos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """
    Sincroniza los permisos base definidos en código con la base de datos.
    Ideal para ejecutar después de un despliegue de nueva versión.
    """
    # TODO: Validar que el usuario sea SUPERADMIN
    service = RolesPermisosService(db)
    return await service.sync_permisos_from_code()

# =========================================================================
# ENDPOINTS ROLES (CRUD)
# =========================================================================

@router.get("/roles", response_model=List[RolResponse])
async def listar_roles(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """Lista todos los roles y los permisos asignados a cada uno."""
    service = RolesPermisosService(db)
    return await service.get_roles()

@router.post("/roles", response_model=RolResponse, status_code=status.HTTP_201_CREATED)
async def crear_rol(
    rol_data: RolCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """Crea un nuevo rol y le asigna permisos."""
    service = RolesPermisosService(db)
    nuevo_rol = await service.create_rol(
        nombre=rol_data.nombre.upper(),
        descripcion=rol_data.descripcion,
        permiso_ids=rol_data.permisos_ids
    )
    if not nuevo_rol:
        raise HTTPException(status_code=400, detail="El rol ya existe")
    return nuevo_rol

@router.put("/roles/{rol_id}", response_model=RolResponse)
async def actualizar_rol(
    rol_id: int,
    rol_data: RolUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """Actualiza la información de un rol y sus permisos."""
    service = RolesPermisosService(db)
    rol_actualizado = await service.update_rol(
        rol_id=rol_id,
        nombre=rol_data.nombre.upper() if rol_data.nombre else None,
        descripcion=rol_data.descripcion,
        permiso_ids=rol_data.permisos_ids,
        is_active=rol_data.is_active
    )
    if not rol_actualizado:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return rol_actualizado
