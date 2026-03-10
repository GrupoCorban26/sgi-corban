import logging
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database.db_connection import get_db
from app.services.comercial.lead_web_service import LeadWebService, DOMINIOS_PERMITIDOS
from app.schemas.comercial.lead_web import (
    LeadWebCreate, LeadWebResponse, LeadWebPublicResponse,
    LeadWebCambiarEstado, LeadWebDescartarRequest,
    LeadWebConvertirRequest, LeadWebActualizarNotas
)
from app.core.dependencies import get_current_user_obj, resolver_comercial_ids
from app.core.settings import get_settings
from app.models.seguridad import Usuario

logger = logging.getLogger(__name__)

# =========================================================================
# ROUTER PÚBLICO (sin JWT, protegido por API Key)
# =========================================================================
router_publico = APIRouter(prefix="/publico/leads-web", tags=["leads-web-publico"])


async def verificar_api_key(x_sgi_api_key: str = Header(..., alias="X-SGI-API-Key")):
    """Verifica que la API Key sea válida."""
    settings = get_settings()
    if not settings.SGI_WEB_API_KEY:
        raise HTTPException(status_code=500, detail="API Key no configurada en el servidor")
    if x_sgi_api_key != settings.SGI_WEB_API_KEY:
        raise HTTPException(status_code=401, detail="API Key inválida")


@router_publico.post("", response_model=LeadWebPublicResponse)
async def recibir_lead_web(
    data: LeadWebCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verificar_api_key)
):
    """
    Endpoint público para recibir leads desde los formularios web.
    Protegido por API Key (header X-SGI-API-Key).
    Llamado desde los mailer.php de cada página web.
    """
    # Validar que la página de origen sea permitida
    if data.pagina_origen not in DOMINIOS_PERMITIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Página de origen no permitida: {data.pagina_origen}"
        )

    service = LeadWebService(db)
    try:
        resultado = await service.recibir_lead(data)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al recibir lead web: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar el lead")


# =========================================================================
# ROUTER PRIVADO (con JWT, para el frontend SGI)
# =========================================================================
router = APIRouter(prefix="/comercial/leads-web", tags=["leads-web"])


@router.get("", response_model=List[LeadWebResponse])
async def listar_leads_web(
    estado: Optional[str] = None,
    pagina_origen: Optional[str] = None,
    filtro_comercial_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """Lista leads web con filtros opcionales."""
    service = LeadWebService(db)
    return await service.listar_leads(
        estado=estado,
        pagina_origen=pagina_origen,
        comercial_ids=comercial_ids,
        filtro_comercial_id=filtro_comercial_id,
    )


@router.get("/count", response_model=int)
async def contar_leads_web(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """Cuenta leads web pendientes del usuario actual."""
    service = LeadWebService(db)
    return await service.contar_pendientes(usuario_id=current_user.id)


@router.get("/{lead_id}", response_model=LeadWebResponse)
async def obtener_lead_web(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """Obtiene el detalle de un lead web."""
    service = LeadWebService(db)
    lead = await service.obtener_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return lead


@router.patch("/{lead_id}/estado")
async def cambiar_estado_lead(
    lead_id: int,
    data: LeadWebCambiarEstado,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """Cambia el estado de un lead web."""
    service = LeadWebService(db)
    exito = await service.cambiar_estado(lead_id, data.estado, data.notas)
    if not exito:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return {"message": "Estado actualizado exitosamente"}


@router.post("/{lead_id}/descartar")
async def descartar_lead_web(
    lead_id: int,
    data: LeadWebDescartarRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """Descarta un lead web con motivo y comentario."""
    service = LeadWebService(db)
    exito = await service.descartar_lead(lead_id, data.motivo_descarte, data.comentario_descarte)
    if not exito:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return {"message": "Lead descartado exitosamente"}


@router.post("/{lead_id}/convertir")
async def convertir_lead_web(
    lead_id: int,
    data: LeadWebConvertirRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """Convierte un lead web en cliente (vincula con existente o crea prospecto)."""
    service = LeadWebService(db)
    try:
        resultado = await service.convertir_lead(
            lead_id,
            cliente_id=data.cliente_id,
            crear_prospecto=data.crear_prospecto
        )
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{lead_id}/notas")
async def actualizar_notas_lead(
    lead_id: int,
    data: LeadWebActualizarNotas,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """Actualiza las notas de un lead web."""
    service = LeadWebService(db)
    exito = await service.actualizar_notas(lead_id, data.notas)
    if not exito:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return {"message": "Notas actualizadas exitosamente"}


@router.post("/{lead_id}/asignar")
async def asignar_lead_manual(
    lead_id: int,
    comercial_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """Asigna manualmente un lead a un comercial específico."""
    service = LeadWebService(db)
    try:
        resultado = await service.asignar_manual(lead_id, comercial_id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
