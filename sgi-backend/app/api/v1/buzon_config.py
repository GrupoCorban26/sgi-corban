"""
API de Configuración del Buzón de WhatsApp.
Solo accesible por rol SISTEMAS.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_active_auth
from app.core.dependencies import require_any_role
from app.services.buzon_config_service import BuzonConfigService

router = APIRouter(
    prefix="/buzon-config",
    tags=["Configuración Buzón"],
    dependencies=[Depends(require_any_role("SISTEMAS"))],
)


# ==========================================================
# SCHEMAS
# ==========================================================

class MotivoDescarteCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)

class MotivoDescarteUpdate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)

class SLAUpdate(BaseModel):
    primera_respuesta_min: int = Field(..., ge=1, le=1440)
    resolucion_horas: int = Field(..., ge=1, le=720)

class DiaNoLaborableCreate(BaseModel):
    fecha: date
    descripcion: Optional[str] = Field(None, max_length=150)

class MensajesBotUpdate(BaseModel):
    mensajes: dict

class KeywordsBotUpdate(BaseModel):
    keywords: dict

class HorarioUpdate(BaseModel):
    horario: dict


# ==========================================================
# RESUMEN GENERAL
# ==========================================================

@router.get("/resumen")
async def get_resumen(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Obtiene toda la configuración del buzón."""
    service = BuzonConfigService(db)
    return await service.get_resumen()


# ==========================================================
# DISPONIBILIDAD DE COMERCIALES
# ==========================================================

@router.get("/disponibilidad")
async def get_disponibilidad(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Lista comerciales con su estado de disponibilidad."""
    service = BuzonConfigService(db)
    return await service.get_disponibilidad()


@router.patch("/disponibilidad/{usuario_id}/toggle")
async def toggle_disponibilidad(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Toggle de disponibilidad de un comercial."""
    service = BuzonConfigService(db)
    result = await service.toggle_disponibilidad(usuario_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


# ==========================================================
# MOTIVOS DE DESCARTE
# ==========================================================

@router.get("/motivos-descarte")
async def get_motivos_descarte(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Lista motivos de descarte."""
    service = BuzonConfigService(db)
    return await service.get_motivos_descarte()


@router.post("/motivos-descarte")
async def create_motivo_descarte(
    data: MotivoDescarteCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Crea un motivo de descarte."""
    service = BuzonConfigService(db)
    return await service.create_motivo_descarte(data.nombre)


@router.put("/motivos-descarte/{id}")
async def update_motivo_descarte(
    id: int,
    data: MotivoDescarteUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Actualiza un motivo de descarte."""
    service = BuzonConfigService(db)
    result = await service.update_motivo_descarte(id, data.nombre)
    if result.get("success") == 0:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.patch("/motivos-descarte/{id}/toggle")
async def toggle_motivo_descarte(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Activa/desactiva un motivo de descarte."""
    service = BuzonConfigService(db)
    result = await service.toggle_motivo_descarte(id)
    if result.get("success") == 0:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


# ==========================================================
# HORARIO Y SLA
# ==========================================================

@router.get("/horario")
async def get_horario(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Obtiene la configuración de horario laboral."""
    service = BuzonConfigService(db)
    return await service.get_horario()


@router.put("/horario")
async def set_horario(
    data: HorarioUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Actualiza el horario laboral."""
    service = BuzonConfigService(db)
    return await service.set_horario(data.horario)


@router.get("/sla")
async def get_sla(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Obtiene umbrales de SLA."""
    service = BuzonConfigService(db)
    return await service.get_sla()


@router.put("/sla")
async def set_sla(
    data: SLAUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Actualiza umbrales de SLA."""
    service = BuzonConfigService(db)
    return await service.set_sla(data.primera_respuesta_min, data.resolucion_horas)


# ==========================================================
# DÍAS NO LABORABLES
# ==========================================================

@router.get("/dias-no-laborables")
async def get_dias_no_laborables(
    year: Optional[int] = Query(None, description="Filtrar por año"),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Lista días no laborables."""
    service = BuzonConfigService(db)
    return await service.get_dias_no_laborables(year)


@router.post("/dias-no-laborables")
async def add_dia_no_laborable(
    data: DiaNoLaborableCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    """Agrega un día no laborable."""
    service = BuzonConfigService(db)
    result = await service.add_dia_no_laborable(data.fecha, data.descripcion, current_user_id)
    if result.get("success") == 0:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete("/dias-no-laborables/{id}")
async def remove_dia_no_laborable(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Elimina un día no laborable."""
    service = BuzonConfigService(db)
    result = await service.remove_dia_no_laborable(id)
    if result.get("success") == 0:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


# ==========================================================
# MENSAJES DEL BOT
# ==========================================================

@router.get("/mensajes")
async def get_mensajes_bot(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Obtiene los mensajes del bot."""
    service = BuzonConfigService(db)
    return await service.get_mensajes_bot()


@router.put("/mensajes")
async def set_mensajes_bot(
    data: MensajesBotUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Actualiza los mensajes del bot."""
    service = BuzonConfigService(db)
    return await service.set_mensajes_bot(data.mensajes)


@router.get("/keywords")
async def get_keywords_bot(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Obtiene las keywords del bot."""
    service = BuzonConfigService(db)
    return await service.get_keywords_bot()


@router.put("/keywords")
async def set_keywords_bot(
    data: KeywordsBotUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Actualiza las keywords del bot."""
    service = BuzonConfigService(db)
    return await service.set_keywords_bot(data.keywords)
