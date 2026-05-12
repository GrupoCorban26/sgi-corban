"""
Helpers reutilizables para queries SQLAlchemy.

Centraliza lógica de filtrado por equipo comercial que antes estaba
duplicada en inbox_service, chat_service, etc.
"""
import logging
from typing import List, Optional
from sqlalchemy import Column, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger(__name__)


async def aplicar_filtro_comercial(
    stmt, 
    columna_asignado: Column, 
    db: AsyncSession,
    comercial_ids: list = None, 
    filtro_comercial_id: int = None,
    incluir_sin_asignar: bool = False,
    jefe_empleado_ids: Optional[List[int]] = None
):
    """
    Aplica filtro de equipo comercial a una query SQLAlchemy.
    
    Args:
        stmt: Query SQLAlchemy existente
        columna_asignado: Columna del modelo (ej. Inbox.asignado_a)
        db: Sesión de base de datos
        comercial_ids: Lista de usuario_ids permitidos (None = sin filtro / ve todo)
        filtro_comercial_id: ID específico para filtrar (dropdown del jefe)
        incluir_sin_asignar: Si True, incluye leads sin asignar (BOT) filtrados por bot_config
        jefe_empleado_ids: Lista de empleado_ids del jefe + subordinados (para filtrar bots)
    
    Returns:
        Query con filtro aplicado, o None si no tiene permiso
    """
    # Filtro específico por dropdown (prioridad sobre filtro de equipo)
    if filtro_comercial_id:
        if comercial_ids is not None and filtro_comercial_id not in comercial_ids:
            return None  # No tiene permiso para ver este comercial
        return stmt.where(columna_asignado == filtro_comercial_id)
    
    # Filtro por equipo (JEFE_COMERCIAL ve su equipo, COMERCIAL ve solo lo suyo)
    if comercial_ids is not None:
        condiciones = [columna_asignado.in_(comercial_ids)]
        
        # Incluir leads sin asignar (estado BOT) — solo para jefes, no para comerciales
        if incluir_sin_asignar and jefe_empleado_ids:
            from app.models.whatsapp_bot_config import WhatsAppBotConfig
            # Filtrar leads BOT por los bots que pertenecen a cualquier jefe en la cadena
            cond_sin_asignar = and_(
                columna_asignado == None,
                columna_asignado.class_.bot_config_id.in_(
                    select(WhatsAppBotConfig.id).where(
                        WhatsAppBotConfig.jefe_comercial_id.in_(jefe_empleado_ids)
                    )
                )
            )
            condiciones.append(cond_sin_asignar)
        
        return stmt.where(or_(*condiciones))
    
    # Sin filtro (ADMIN, GERENCIA, SISTEMAS)
    return stmt
