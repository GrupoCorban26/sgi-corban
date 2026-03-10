"""
Helpers reutilizables para queries SQLAlchemy.

Centraliza lógica de filtrado por equipo comercial que antes estaba
duplicada en inbox_service, chat_service, etc.
"""
from sqlalchemy import Column, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.settings import get_settings


async def aplicar_filtro_comercial(
    stmt, 
    columna_asignado: Column, 
    db: AsyncSession,
    comercial_ids: list = None, 
    filtro_comercial_id: int = None,
    incluir_sin_asignar: bool = False
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
        
        # Si el jefe del bot está en el equipo, también ve leads sin asignar
        if incluir_sin_asignar:
            settings = get_settings()
            bot_jefe_id = settings.BOT_JEFE_COMERCIAL_ID
            if bot_jefe_id:
                try:
                    from app.models.seguridad import Usuario
                    query_bot_jefe = select(Usuario.id).where(Usuario.empleado_id == bot_jefe_id)
                    bot_jefe_uid = (await db.execute(query_bot_jefe)).scalar()
                    if bot_jefe_uid and bot_jefe_uid in comercial_ids:
                        condiciones.append(columna_asignado == None)
                except Exception:
                    pass
        
        return stmt.where(or_(*condiciones))
    
    # Sin filtro (ADMIN, GERENCIA, SISTEMAS)
    return stmt
