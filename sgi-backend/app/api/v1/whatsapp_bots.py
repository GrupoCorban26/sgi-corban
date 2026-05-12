"""
API CRUD para gestión de WhatsApp Bot Configurations.
Solo accesible por rol SISTEMAS.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import Optional, List

from app.database.db_connection import get_db
from app.core.security import get_current_active_auth
from app.core.dependencies import require_any_role
from app.models.whatsapp_bot_config import WhatsAppBotConfig
from app.models.administrativo import Empleado

router = APIRouter(
    prefix="/whatsapp-bots",
    tags=["WhatsApp Bots Config"],
    dependencies=[Depends(require_any_role("SISTEMAS"))],
)


# ==========================================================
# SCHEMAS
# ==========================================================

class BotConfigCreate(BaseModel):
    slug: str = Field(..., min_length=2, max_length=50, pattern=r'^[a-z0-9\-]+$')
    nombre_bot: str = Field(..., min_length=2, max_length=100)
    jefe_comercial_id: int
    whatsapp_token: str = Field(..., min_length=10)
    whatsapp_phone_id: str = Field(..., min_length=5, max_length=50)
    whatsapp_verify_token: str = Field(..., min_length=5, max_length=100)


class BotConfigUpdate(BaseModel):
    slug: Optional[str] = Field(None, min_length=2, max_length=50, pattern=r'^[a-z0-9\-]+$')
    nombre_bot: Optional[str] = Field(None, min_length=2, max_length=100)
    jefe_comercial_id: Optional[int] = None
    whatsapp_token: Optional[str] = Field(None, min_length=10)
    whatsapp_phone_id: Optional[str] = Field(None, min_length=5, max_length=50)
    whatsapp_verify_token: Optional[str] = Field(None, min_length=5, max_length=100)


class BotConfigResponse(BaseModel):
    id: int
    slug: str
    nombre_bot: str
    jefe_comercial_id: int
    jefe_nombre: Optional[str] = None
    whatsapp_phone_id: str
    # Token enmascarado por seguridad
    whatsapp_token_masked: str
    whatsapp_verify_token: str
    is_active: bool
    webhook_url: str

    class Config:
        from_attributes = True


# ==========================================================
# HELPERS
# ==========================================================

def _mask_token(token: str) -> str:
    """Enmascara el token mostrando solo los primeros 6 y últimos 4 caracteres."""
    if len(token) <= 14:
        return token[:4] + "****" + token[-4:]
    return token[:6] + "****" + token[-4:]


def _build_response(bot: WhatsAppBotConfig, jefe_nombre: str = None) -> dict:
    """Construye la respuesta con token enmascarado y URL del webhook."""
    return {
        "id": bot.id,
        "slug": bot.slug,
        "nombre_bot": bot.nombre_bot,
        "jefe_comercial_id": bot.jefe_comercial_id,
        "jefe_nombre": jefe_nombre,
        "whatsapp_phone_id": bot.whatsapp_phone_id,
        "whatsapp_token_masked": _mask_token(bot.whatsapp_token),
        "whatsapp_verify_token": bot.whatsapp_verify_token,
        "is_active": bot.is_active,
        "webhook_url": f"/api/v1/comercial/whatsapp/webhook/{bot.slug}",
    }


# ==========================================================
# ENDPOINTS
# ==========================================================

@router.get("", response_model=List[BotConfigResponse])
async def list_bots(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Lista todas las configuraciones de bots."""
    result = await db.execute(
        select(WhatsAppBotConfig).order_by(WhatsAppBotConfig.id)
    )
    bots = result.scalars().all()

    response = []
    for bot in bots:
        jefe = await db.get(Empleado, bot.jefe_comercial_id)
        jefe_nombre = f"{jefe.nombres} {jefe.apellido_paterno}" if jefe else "Sin asignar"
        response.append(_build_response(bot, jefe_nombre))

    return response


@router.get("/{bot_id}", response_model=BotConfigResponse)
async def get_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Obtiene una configuración de bot por ID."""
    bot = await db.get(WhatsAppBotConfig, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot no encontrado")

    jefe = await db.get(Empleado, bot.jefe_comercial_id)
    jefe_nombre = f"{jefe.nombres} {jefe.apellido_paterno}" if jefe else "Sin asignar"
    return _build_response(bot, jefe_nombre)


@router.post("", response_model=BotConfigResponse, status_code=201)
async def create_bot(
    data: BotConfigCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Crea una nueva configuración de bot."""
    # Validar slug único
    existing = await db.execute(
        select(WhatsAppBotConfig).where(WhatsAppBotConfig.slug == data.slug)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail=f"El slug '{data.slug}' ya existe")

    # Validar que el jefe existe
    jefe = await db.get(Empleado, data.jefe_comercial_id)
    if not jefe:
        raise HTTPException(status_code=400, detail="El jefe comercial no existe")

    bot = WhatsAppBotConfig(
        slug=data.slug,
        nombre_bot=data.nombre_bot,
        jefe_comercial_id=data.jefe_comercial_id,
        whatsapp_token=data.whatsapp_token,
        whatsapp_phone_id=data.whatsapp_phone_id,
        whatsapp_verify_token=data.whatsapp_verify_token,
    )
    db.add(bot)
    await db.commit()
    await db.refresh(bot)

    jefe_nombre = f"{jefe.nombres} {jefe.apellido_paterno}"
    return _build_response(bot, jefe_nombre)


@router.put("/{bot_id}", response_model=BotConfigResponse)
async def update_bot(
    bot_id: int,
    data: BotConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Actualiza una configuración de bot."""
    bot = await db.get(WhatsAppBotConfig, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot no encontrado")

    # Validar slug único si cambió
    if data.slug and data.slug != bot.slug:
        existing = await db.execute(
            select(WhatsAppBotConfig).where(
                and_(WhatsAppBotConfig.slug == data.slug, WhatsAppBotConfig.id != bot_id)
            )
        )
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail=f"El slug '{data.slug}' ya existe")

    # Validar jefe si cambió
    if data.jefe_comercial_id and data.jefe_comercial_id != bot.jefe_comercial_id:
        jefe = await db.get(Empleado, data.jefe_comercial_id)
        if not jefe:
            raise HTTPException(status_code=400, detail="El jefe comercial no existe")

    # Aplicar cambios (solo los campos que vienen)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bot, field, value)

    await db.commit()
    await db.refresh(bot)

    jefe = await db.get(Empleado, bot.jefe_comercial_id)
    jefe_nombre = f"{jefe.nombres} {jefe.apellido_paterno}" if jefe else "Sin asignar"
    return _build_response(bot, jefe_nombre)


@router.patch("/{bot_id}/toggle", response_model=BotConfigResponse)
async def toggle_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Activa/desactiva un bot."""
    bot = await db.get(WhatsAppBotConfig, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot no encontrado")

    bot.is_active = not bot.is_active
    await db.commit()
    await db.refresh(bot)

    jefe = await db.get(Empleado, bot.jefe_comercial_id)
    jefe_nombre = f"{jefe.nombres} {jefe.apellido_paterno}" if jefe else "Sin asignar"
    return _build_response(bot, jefe_nombre)


@router.get("/jefes/disponibles")
async def list_jefes_disponibles(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth),
):
    """Lista empleados que son jefes de otros (para el dropdown)."""
    # Buscar empleados que son jefe_id de al menos un empleado activo
    subquery = (
        select(Empleado.jefe_id)
        .where(and_(Empleado.jefe_id.isnot(None), Empleado.is_active == True))
        .distinct()
        .scalar_subquery()
    )
    result = await db.execute(
        select(Empleado)
        .where(and_(Empleado.id.in_(subquery), Empleado.is_active == True))
        .order_by(Empleado.apellido_paterno)
    )
    jefes = result.scalars().all()

    return [
        {
            "id": j.id,
            "nombre": f"{j.nombres} {j.apellido_paterno}",
        }
        for j in jefes
    ]
