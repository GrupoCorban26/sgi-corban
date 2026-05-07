"""
Router de Configuraciones del Sistema.
RBAC: Solo ADMIN y SISTEMAS pueden leer/editar.
       Endpoint público para configuraciones no sensibles (colores, logos).
"""
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.core.dependencies import require_any_role
from app.services.core.configuracion_service import ConfiguracionService
from app.schemas.core.configuracion import (
    ConfiguracionCreate,
    ConfiguracionUpdate,
    ConfiguracionResponse,
    ConfiguracionPublicResponse,
    HistorialResponse,
)

router = APIRouter(prefix="/configuraciones", tags=["Core - Configuraciones"])


# =========================================================================
# ENDPOINTS PÚBLICOS (sin autenticación)
# =========================================================================

@router.get("/publicas", response_model=List[ConfiguracionPublicResponse])
async def obtener_configuraciones_publicas(
    categoria: Optional[str] = Query(None, description="Filtrar por categoría: APARIENCIA, EMPRESAS"),
    db: AsyncSession = Depends(get_db),
):
    """
    Obtiene configuraciones NO sensibles para el frontend.
    No requiere autenticación. Ideal para colores, logos, nombres de empresa.
    """
    service = ConfiguracionService(db)
    return await service.obtener_publicas(categoria)


@router.get("/publicas/{categoria}/dict")
async def obtener_configuraciones_como_diccionario(
    categoria: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna las configuraciones de una categoría como diccionario {clave: valor}.
    Ideal para consumo directo del frontend.
    Ejemplo: GET /configuraciones/publicas/APARIENCIA/dict → {"color_primario": "#1a1a2e", ...}
    """
    service = ConfiguracionService(db)
    return await service.obtener_por_categoria_dict(categoria)


# =========================================================================
# ENDPOINTS PROTEGIDOS (ADMIN / SISTEMAS)
# =========================================================================

@router.get(
    "/",
    response_model=List[ConfiguracionResponse],
    dependencies=[Depends(require_any_role("ADMIN"))],
)
async def listar_configuraciones(
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth),
):
    """Lista todas las configuraciones (valores sensibles enmascarados)."""
    service = ConfiguracionService(db)
    return await service.listar(categoria)


# HISTORIAL debe ir ANTES de /{clave} para evitar colisión de rutas
@router.get(
    "/historial",
    response_model=List[HistorialResponse],
    dependencies=[Depends(require_any_role("ADMIN"))],
)
async def obtener_historial_configuraciones(
    clave: Optional[str] = Query(None, description="Filtrar por clave específica"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth),
):
    """Obtiene el historial de cambios de configuraciones."""
    service = ConfiguracionService(db)
    return await service.obtener_historial(clave)


@router.get(
    "/{clave}",
    response_model=ConfiguracionResponse,
    dependencies=[Depends(require_any_role("ADMIN"))],
)
async def obtener_configuracion(
    clave: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth),
):
    """Obtiene una configuración por su clave."""
    service = ConfiguracionService(db)
    return await service.obtener_por_clave(clave)


@router.post(
    "/",
    response_model=ConfiguracionResponse,
    dependencies=[Depends(require_any_role("ADMIN"))],
)
async def crear_configuracion(
    data: ConfiguracionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth),
):
    """Crea una nueva configuración."""
    user_id = int(current_user.get("sub"))
    service = ConfiguracionService(db)
    return await service.crear(data, user_id)


@router.put(
    "/{clave}",
    response_model=ConfiguracionResponse,
    dependencies=[Depends(require_any_role("ADMIN"))],
)
async def actualizar_configuracion(
    clave: str,
    data: ConfiguracionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth),
):
    """Actualiza el valor de una configuración. Se registra automáticamente en el historial."""
    user_id = int(current_user.get("sub"))
    service = ConfiguracionService(db)
    return await service.actualizar(clave, data, user_id)


@router.delete(
    "/{clave}",
    dependencies=[Depends(require_any_role("ADMIN"))],
)
async def eliminar_configuracion(
    clave: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth),
):
    """Elimina una configuración."""
    user_id = int(current_user.get("sub"))
    service = ConfiguracionService(db)
    return await service.eliminar(clave, user_id)


# =========================================================================
# UPLOAD DE IMÁGENES
# =========================================================================

@router.post(
    "/{clave}/imagen",
    response_model=ConfiguracionResponse,
    dependencies=[Depends(require_any_role("ADMIN"))],
)
async def subir_imagen_configuracion(
    clave: str,
    file: UploadFile = File(..., description="Imagen (png, jpg, svg, webp, ico)"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_active_auth),
):
    """
    Sube una imagen para una configuración de tipo IMAGE.
    La imagen se guarda en /uploads/configuraciones/ y la ruta se almacena como valor.
    """
    user_id = int(current_user.get("sub"))
    service = ConfiguracionService(db)
    return await service.subir_imagen(clave, file, user_id)
