"""
Endpoints REST para el módulo de Supervisión WhatsApp (Evolution API v2).

Rutas:
  GET    /supervision/mi-instancia                  → Mi instancia (vista comercial)
  POST   /supervision/mi-instancia                  → Crear MI instancia (comercial)
  GET    /supervision/mi-instancia/qr               → Mi QR (comercial)
  POST   /supervision/instancias                    → Crear instancia para otro (jefe+)
  GET    /supervision/instancias                    → Listar instancias del equipo (jefe+)
  GET    /supervision/instancias/{id}/qr            → Obtener QR para vincular (jefe+)
  DELETE /supervision/instancias/{id}               → Eliminar instancia (jefe+)
  GET    /supervision/instancias/{id}/conversaciones → Listar chats del comercial
  GET    /supervision/conversaciones/{id}/mensajes  → Leer mensajes del chat
  POST   /supervision/webhook                       → Receptor de webhooks (Evolution API)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.database.db_connection import get_db
from app.services.comercial.supervision_service import SupervisionService
from app.schemas.comercial.supervision import (
    InstanciaCreate,
    InstanciaResponse,
    InstanciaQRResponse,
    ConversacionListResponse,
    MensajeListResponse,
    WebhookPayload,
)
from app.core.dependencies import (
    get_current_user_obj,
    resolver_comercial_ids,
    require_any_role,
)
from app.models.seguridad import Usuario

router = APIRouter(prefix="/comercial/supervision", tags=["supervision"])


# ═════════════════════════════════════════════
#  MI INSTANCIA (Vista del Comercial)
# ═════════════════════════════════════════════

@router.get("/mi-instancia")
async def mi_instancia(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """Retorna la instancia del comercial actual (o null si no tiene)."""
    service = SupervisionService(db)
    instancia = await service.obtener_instancia_por_usuario(current_user.id)
    if not instancia:
        return None
    return instancia


@router.post("/mi-instancia")
async def crear_mi_instancia(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """El comercial crea su propia instancia de WhatsApp."""
    service = SupervisionService(db)
    try:
        result = await service.crear_instancia(
            usuario_id=current_user.id,
            created_by=current_user.id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/mi-instancia/qr", response_model=InstanciaQRResponse)
async def mi_instancia_qr(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
):
    """Obtiene el QR de la instancia del comercial actual."""
    service = SupervisionService(db)
    instancia = await service.obtener_instancia_por_usuario(current_user.id)
    if not instancia:
        raise HTTPException(status_code=404, detail="No tienes una instancia creada")
    try:
        return await service.obtener_qr(instancia.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═════════════════════════════════════════════
#  INSTANCIAS (Vista del Jefe / Admin)
# ═════════════════════════════════════════════

@router.post("/instancias", response_model=dict)
async def crear_instancia(
    data: InstanciaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    _: bool = Depends(require_any_role("JEFE_COMERCIAL", "ADMIN", "GERENCIA", "SISTEMAS")),
):
    """Crea una instancia de WhatsApp para un comercial (solo jefes/admin)."""
    service = SupervisionService(db)
    try:
        result = await service.crear_instancia(
            usuario_id=data.usuario_id,
            created_by=current_user.id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/instancias", response_model=List[InstanciaResponse])
async def listar_instancias(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
    _: bool = Depends(require_any_role("JEFE_COMERCIAL", "ADMIN", "GERENCIA", "SISTEMAS")),
):
    """Lista instancias filtradas por equipo del usuario actual (jefe+ only)."""
    service = SupervisionService(db)
    return await service.listar_instancias(comercial_ids=comercial_ids)


@router.get("/instancias/{instancia_id}/qr", response_model=InstanciaQRResponse)
async def obtener_qr(
    instancia_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """Obtiene el QR code para vincular una instancia."""
    service = SupervisionService(db)

    # RBAC: verificar acceso
    if not await service.verificar_acceso_instancia(instancia_id, comercial_ids):
        raise HTTPException(status_code=403, detail="No tienes acceso a esta instancia")

    try:
        return await service.obtener_qr(instancia_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/instancias/{instancia_id}")
async def eliminar_instancia(
    instancia_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
    _: bool = Depends(require_any_role("JEFE_COMERCIAL", "ADMIN", "GERENCIA", "SISTEMAS")),
):
    """Elimina una instancia de WhatsApp (y todos sus datos)."""
    service = SupervisionService(db)

    if not await service.verificar_acceso_instancia(instancia_id, comercial_ids):
        raise HTTPException(status_code=403, detail="No tienes acceso a esta instancia")

    try:
        await service.eliminar_instancia(instancia_id)
        return {"message": "Instancia eliminada correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═════════════════════════════════════════════
#  CONVERSACIONES
# ═════════════════════════════════════════════

@router.get(
    "/instancias/{instancia_id}/conversaciones",
    response_model=ConversacionListResponse,
)
async def listar_conversaciones(
    instancia_id: int,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """Lista conversaciones de un comercial (paginado)."""
    service = SupervisionService(db)

    if not await service.verificar_acceso_instancia(instancia_id, comercial_ids):
        raise HTTPException(status_code=403, detail="No tienes acceso a esta instancia")

    try:
        return await service.listar_conversaciones(instancia_id, page, page_size)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═════════════════════════════════════════════
#  MENSAJES
# ═════════════════════════════════════════════

@router.get(
    "/conversaciones/{conversacion_id}/mensajes",
    response_model=MensajeListResponse,
)
async def listar_mensajes(
    conversacion_id: int,
    page: int = 1,
    page_size: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj),
    comercial_ids: Optional[List[int]] = Depends(resolver_comercial_ids),
):
    """Lista mensajes de una conversación (paginado, solo lectura)."""
    service = SupervisionService(db)

    if not await service.verificar_acceso_conversacion(conversacion_id, comercial_ids):
        raise HTTPException(status_code=403, detail="No tienes acceso a esta conversación")

    return await service.listar_mensajes(conversacion_id, page, page_size)


# ═════════════════════════════════════════════
#  WEBHOOK (Evolution API → SGI)
# ═════════════════════════════════════════════

@router.post("/webhook")
async def webhook_receiver(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Receptor de webhooks de Evolution API.
    Endpoint público (no requiere JWT) pero verificado por API key.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Validación básica del payload
    if not payload.get("event") or not payload.get("instance"):
        raise HTTPException(status_code=400, detail="Missing event or instance")

    service = SupervisionService(db)
    result = await service.procesar_webhook(payload)

    return result
