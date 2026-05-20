"""
Servicio ligero de resumen diario para el dashboard del comercial.
Retorna solo los 3 contadores de las tarjetas principales.
"""
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, Date

from app.models.historial_llamadas import HistorialLlamada
from app.models.cliente_gestion import ClienteGestion
from app.models.comercial import Cliente
from app.models.comercial_inbox import Inbox


class StatsResumenService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_resumen_hoy(
        self,
        comercial_ids: list[int] | None = None,
    ) -> dict:
        """
        Retorna contadores del día de hoy para las tarjetas del dashboard.
        
        - llamadas_base: Total de llamadas registradas hoy en historial_llamadas.
        - gestiones_cartera: Total de gestiones registradas hoy en cliente_gestiones.
        - leads_asignados: Total de leads (inbox) creados hoy con estado != BOT.
        
        El filtro RBAC se aplica vía comercial_ids:
          - None = sin filtro (roles globales: ADMIN, GERENCIA, SISTEMAS)
          - [ids] = solo esos usuarios (JEFE_COMERCIAL ve equipo, COMERCIAL ve lo suyo)
        """
        hoy = date.today()

        # ── Llamadas Base ──────────────────────────────────────────
        llamadas_query = select(
            func.count(HistorialLlamada.id)
        ).where(
            cast(HistorialLlamada.created_at, Date) == hoy
        )
        if comercial_ids is not None:
            llamadas_query = llamadas_query.where(
                HistorialLlamada.comercial_id.in_(comercial_ids)
            )
        llamadas_base = (await self.db.execute(llamadas_query)).scalar() or 0

        # ── Gestión Cartera ────────────────────────────────────────
        cartera_query = select(
            func.count(ClienteGestion.id)
        ).select_from(ClienteGestion).join(
            Cliente, ClienteGestion.cliente_id == Cliente.id
        ).where(
            cast(ClienteGestion.created_at, Date) == hoy
        )
        if comercial_ids is not None:
            cartera_query = cartera_query.where(
                Cliente.comercial_encargado_id.in_(comercial_ids)
            )
        gestiones_cartera = (await self.db.execute(cartera_query)).scalar() or 0

        # ── Leads (Buzón WhatsApp) ─────────────────────────────────
        leads_query = select(
            func.count(Inbox.id)
        ).where(
            and_(
                cast(Inbox.created_at, Date) == hoy,
                Inbox.estado != "BOT",
            )
        )
        if comercial_ids is not None:
            leads_query = leads_query.where(
                Inbox.asignado_a.in_(comercial_ids)
            )
        leads_asignados = (await self.db.execute(leads_query)).scalar() or 0

        return {
            "llamadas_base": llamadas_base,
            "gestiones_cartera": gestiones_cartera,
            "leads_asignados": leads_asignados,
        }
