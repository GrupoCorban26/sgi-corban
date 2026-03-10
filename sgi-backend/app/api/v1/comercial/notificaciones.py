from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db_connection import get_db
from app.core.dependencies import get_current_user_obj
from app.models.seguridad import Usuario
from app.services.notificacion_service import NotificacionService

router = APIRouter(prefix="/comercial/notificaciones", tags=["notificaciones"])


@router.get("/")
async def obtener_notificaciones(
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Obtener las últimas 20 notificaciones del usuario."""
    svc = NotificacionService(db)
    notificaciones = await svc.obtener_notificaciones(current_user.id)
    no_leidas = await svc.contar_no_leidas(current_user.id)

    return {
        "no_leidas": no_leidas,
        "notificaciones": [
            {
                "id": n.id,
                "tipo": n.tipo,
                "titulo": n.titulo,
                "mensaje": n.mensaje,
                "leida": n.leida,
                "url_destino": n.url_destino,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in notificaciones
        ]
    }


@router.get("/count")
async def contar_no_leidas(
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Endpoint ligero para polling: solo retorna el conteo de no leídas."""
    svc = NotificacionService(db)
    count = await svc.contar_no_leidas(current_user.id)
    return {"no_leidas": count}


@router.post("/{notificacion_id}/leer")
async def marcar_como_leida(
    notificacion_id: int,
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Marca una notificación como leída."""
    svc = NotificacionService(db)
    ok = await svc.marcar_como_leida(notificacion_id, current_user.id)
    if not ok:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return {"status": "success"}


@router.post("/leer-todas")
async def marcar_todas_leidas(
    current_user: Usuario = Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db)
):
    """Marca todas las notificaciones del usuario como leídas."""
    svc = NotificacionService(db)
    count = await svc.marcar_todas_leidas(current_user.id)
    return {"status": "success", "actualizadas": count}
