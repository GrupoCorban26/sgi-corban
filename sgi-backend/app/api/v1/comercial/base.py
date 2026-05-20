from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_active_auth
from app.core.dependencies import require_permission
from app.services.comercial.lotes_base_service import LotesBaseService
from app.services.comercial.contactos_asignacion_service import ContactosAsignacionService

router = APIRouter(
    prefix="/base",
    tags=["Base Comercial"]
)

@router.post("/cargar", dependencies=[Depends(require_permission("contactos.crear"))])
async def cargar_base(
    empresa: Optional[str] = Query(None, description="Filtro opcional por empresa (CORBAN | EBL)"),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """El comercial extrae 50 contactos DISPONIBLES."""
    service = LotesBaseService(db)
    return await service.cargar_base(user_id, empresa)


@router.get("/mis-contactos", dependencies=[Depends(require_permission("contactos.listar"))])
async def get_mis_contactos_asignados(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Obtiene los contactos asignados al comercial actual."""
    service = ContactosAsignacionService(db)
    return await service.get_mis_contactos_asignados(user_id)


@router.post("/{base_id}/feedback", dependencies=[Depends(require_permission("contactos.editar"))])
async def actualizar_feedback(
    base_id: int,
    caso_id: int = Query(..., description="ID del caso de llamada"),
    comentario: str = Query(..., min_length=1, description="Comentario de la llamada"),
    nuevo_intento: bool = Query(False, description="True para registrar un nuevo intento de llamada"),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Actualiza el feedback de la llamada o registra un nuevo intento."""
    service = ContactosAsignacionService(db)
    return await service.actualizar_feedback(base_id, caso_id, comentario, user_id, nuevo_intento)


@router.post("/enviar-feedback", dependencies=[Depends(require_permission("contactos.editar"))])
async def enviar_feedback_lote(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Finaliza el lote de gestión actual."""
    service = ContactosAsignacionService(db)
    return await service.enviar_feedback_lote(user_id)