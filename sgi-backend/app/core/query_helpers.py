"""
Helpers reutilizables para queries SQLAlchemy.

Centraliza lógica de filtrado por equipo comercial que antes estaba
duplicada en inbox_service, chat_service, etc.
"""
import logging
from sqlalchemy import Column, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.settings import get_settings

logger = logging.getLogger(__name__)


async def aplicar_filtro_comercial(
    stmt, 
    columna_asignado: Column, 
    db: AsyncSession,
    comercial_ids: list = None, 
    filtro_comercial_id: int = None,
    incluir_sin_asignar: bool = False,
    jefe_comercial_id: int = None
):
    """
    Aplica filtro de equipo comercial a una query SQLAlchemy.
    
    Args:
        stmt: Query SQLAlchemy existente
        columna_asignado: Columna del modelo (ej. Inbox.asignado_a)
        db: Sesión de base de datos (para resolver BOT_JEFE_COMERCIAL_ID)
        comercial_ids: Lista de IDs permitidos (None = sin filtro / ve todo)
        filtro_comercial_id: ID específico para filtrar (dropdown del jefe)
        incluir_sin_asignar: Si True, también incluye registros sin asignar (para jefes)
    
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
        
        # Incluir leads sin asignar (estado BOT) para supervisores
        if incluir_sin_asignar:
            if jefe_comercial_id:
                from app.models.whatsapp_bot_config import WhatsAppBotConfig
                from sqlalchemy import and_
                # Obtenemos los bots que pertenecen a este jefe o están bajo su cadena
                # Como simplificación directa, buscamos los bots cuyo jefe sea el actual
                cond_sin_asignar = and_(
                    columna_asignado == None,
                    columna_asignado.class_.bot_config_id.in_(
                        select(WhatsAppBotConfig.id).where(WhatsAppBotConfig.jefe_comercial_id == jefe_comercial_id)
                    )
                )
                condiciones.append(cond_sin_asignar)
            else:
                condiciones.append(columna_asignado == None)
        
        return stmt.where(or_(*condiciones))
    
    # Sin filtro (ADMIN, GERENCIA, SISTEMAS)
    return stmt
