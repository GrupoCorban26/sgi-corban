"""
Servicio del Dashboard consolidado de Reportes.
"""
import logging
from datetime import date, timedelta, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, cast, Date
from sqlalchemy.orm import selectinload

from app.models.comercial_inbox import Inbox
from app.models.historial_llamadas import HistorialLlamada
from app.models.comercial import CasoLlamada, Cliente
from app.models.cliente_gestion import ClienteGestion
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado

logger = logging.getLogger(__name__)


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_data(
        self,
        fecha_inicio: date,
        fecha_fin: date,
        comparar: bool = False,
        comercial_id: int | None = None,
        empresa: str | None = None,
        comercial_ids: list[int] | None = None,
    ) -> dict:
        """Retorna datos consolidados del dashboard."""

        dias_rango = (fecha_fin - fecha_inicio).days + 1
        periodo_anterior_inicio = fecha_inicio - timedelta(days=dias_rango)
        periodo_anterior_fin = fecha_inicio - timedelta(days=1)

        filtro_ids = None
        if comercial_id:
            filtro_ids = [comercial_id]
        elif comercial_ids is not None:
            filtro_ids = comercial_ids

        periodo_actual = await self._get_kpis(fecha_inicio, fecha_fin, filtro_ids, empresa)

        periodo_anterior = None
        tendencias = None
        if comparar:
            periodo_anterior = await self._get_kpis(
                periodo_anterior_inicio, periodo_anterior_fin, filtro_ids, empresa
            )
            tendencias = self._calcular_tendencias(periodo_actual, periodo_anterior)

        por_dia = await self._get_actividad_por_dia(fecha_inicio, fecha_fin, filtro_ids, empresa)
        por_comercial = await self._get_ranking_comerciales(fecha_inicio, fecha_fin, filtro_ids, empresa)
        descartes_buzon = await self._get_descartes_buzon(fecha_inicio, fecha_fin, filtro_ids, empresa)
        
        casos_contestadas = await self._get_distribucion_casos_llamada(fecha_inicio, fecha_fin, filtro_ids, True)
        casos_no_contestadas = await self._get_distribucion_casos_llamada(fecha_inicio, fecha_fin, filtro_ids, False)

        return {
            "periodo_actual": periodo_actual,
            "periodo_anterior": periodo_anterior,
            "tendencias": tendencias,
            "por_dia": por_dia,
            "por_comercial": por_comercial,
            "descartes_buzon": descartes_buzon,
            "casos_contestadas": casos_contestadas,
            "casos_no_contestadas": casos_no_contestadas
        }

    async def _get_distribucion_casos_llamada(
        self, fecha_inicio: date, fecha_fin: date,
        filtro_ids: list[int] | None, contestado: bool
    ) -> list[dict]:
        from app.models.historial_llamadas import HistorialLlamada
        from app.models.comercial import CasoLlamada

        query = select(
            func.coalesce(CasoLlamada.nombre, 'Sin Caso').label("caso"),
            func.count(HistorialLlamada.id).label("cantidad"),
        ).select_from(HistorialLlamada).outerjoin(
            CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id
        ).where(
            and_(
                cast(HistorialLlamada.created_at, Date) >= fecha_inicio,
                cast(HistorialLlamada.created_at, Date) <= fecha_fin,
                CasoLlamada.contestado == contestado
            )
        ).group_by(CasoLlamada.nombre)

        if filtro_ids is not None:
            query = query.where(HistorialLlamada.comercial_id.in_(filtro_ids))

        result = await self.db.execute(query)
        
        # SQL Server order
        rows = [
            {"motivo": row.caso, "cantidad": row.cantidad}
            for row in result.all()
        ]
        rows.sort(key=lambda x: x["cantidad"], reverse=True)
        return rows

    async def _get_kpis(
        self, fecha_inicio: date, fecha_fin: date, 
        filtro_ids: list[int] | None, empresa: str | None
    ) -> dict:
        
        # =============================================
        # LLAMADAS (HistorialLlamada + CasoLlamada)
        # =============================================
        llamadas_query = select(
            func.count(HistorialLlamada.id).label("total_llamadas"),
            func.sum(
                case((CasoLlamada.contestado == True, 1), else_=0)
            ).label("llamadas_contestadas"),
            func.sum(
                case(
                    (and_(CasoLlamada.contestado == True, CasoLlamada.gestionable == True), 1),
                    else_=0,
                )
            ).label("llamadas_efectivas"),
        ).select_from(HistorialLlamada).join(
            CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id
        ).where(
            and_(
                cast(HistorialLlamada.created_at, Date) >= fecha_inicio,
                cast(HistorialLlamada.created_at, Date) <= fecha_fin,
            )
        )

        if filtro_ids is not None:
            llamadas_query = llamadas_query.where(HistorialLlamada.comercial_id.in_(filtro_ids))

        result_llamadas = await self.db.execute(llamadas_query)
        row_llamadas = result_llamadas.one()

        total_llamadas = row_llamadas.total_llamadas or 0
        llamadas_contestadas = row_llamadas.llamadas_contestadas or 0
        llamadas_efectivas = row_llamadas.llamadas_efectivas or 0
        pct_contestadas = round((llamadas_contestadas / total_llamadas * 100), 1) if total_llamadas > 0 else 0
        pct_efectivas = round((llamadas_efectivas / total_llamadas * 100), 1) if total_llamadas > 0 else 0

        # =============================================
        # BUZÓN (Inbox)
        # =============================================
        buzon_query = select(
            func.count(Inbox.id).label("total_leads"),
            func.sum(
                case((Inbox.estado == "CONVERTIDO", 1), else_=0)
            ).label("total_convertidos"),
            func.sum(
                case((Inbox.estado == "DESCARTADO", 1), else_=0)
            ).label("total_descartados"),
            func.sum(
                case((Inbox.estado.in_(["PENDIENTE", "EN_GESTION"]), 1), else_=0)
            ).label("total_en_gestion"),
            func.avg(
                case(
                    (Inbox.tiempo_respuesta_segundos.isnot(None), Inbox.tiempo_respuesta_segundos),
                    else_=None,
                )
            ).label("avg_tiempo_resp"),
        ).where(
            and_(
                cast(Inbox.fecha_recepcion, Date) >= fecha_inicio,
                cast(Inbox.fecha_recepcion, Date) <= fecha_fin,
                Inbox.estado != "BOT",
            )
        )

        if filtro_ids is not None:
            buzon_query = buzon_query.where(Inbox.asignado_a.in_(filtro_ids))

        result_buzon = await self.db.execute(buzon_query)
        row_buzon = result_buzon.one()

        total_leads = row_buzon.total_leads or 0
        total_convertidos = row_buzon.total_convertidos or 0
        total_descartados = row_buzon.total_descartados or 0
        total_en_gestion = row_buzon.total_en_gestion or 0
        avg_tiempo_resp = row_buzon.avg_tiempo_resp or 0
        pct_conversion = round((total_convertidos / total_leads * 100), 1) if total_leads > 0 else 0

        # =============================================
        # CARTERA (ClienteGestion)
        # =============================================
        cartera_query = select(
            func.count(ClienteGestion.id).label("total_gestiones"),
            func.count(func.distinct(ClienteGestion.cliente_id)).label("clientes_unicos"),
        ).select_from(ClienteGestion).join(
            Cliente, ClienteGestion.cliente_id == Cliente.id
        ).where(
            and_(
                cast(ClienteGestion.created_at, Date) >= fecha_inicio,
                cast(ClienteGestion.created_at, Date) <= fecha_fin,
            )
        )

        if filtro_ids is not None:
            cartera_query = cartera_query.where(Cliente.comercial_encargado_id.in_(filtro_ids))

        result_cartera = await self.db.execute(cartera_query)
        row_cartera = result_cartera.one()

        return {
            "llamadas_total": total_llamadas,
            "llamadas_contestadas": llamadas_contestadas,
            "llamadas_efectivas": llamadas_efectivas,
            "pct_contestadas": pct_contestadas,
            "pct_efectivas": pct_efectivas,
            "leads_buzon": total_leads,
            "leads_convertidos": total_convertidos,
            "leads_descartados": total_descartados,
            "leads_en_gestion": total_en_gestion,
            "pct_conversion": pct_conversion,
            "avg_tiempo_respuesta_min": round(avg_tiempo_resp / 60, 1) if avg_tiempo_resp else 0,
            "cartera_gestiones": row_cartera.total_gestiones or 0,
            "cartera_clientes_unicos": row_cartera.clientes_unicos or 0,
        }

    def _calcular_tendencias(self, actual: dict, anterior: dict) -> dict:
        tendencias = {}
        for key in actual:
            val_actual = actual[key]
            val_anterior = anterior.get(key, 0)
            if val_anterior and val_anterior != 0:
                cambio = round(((val_actual - val_anterior) / val_anterior) * 100, 1)
            elif val_actual > 0:
                cambio = 100.0 
            else:
                cambio = 0.0
            tendencias[key] = cambio
        return tendencias

    async def _get_actividad_por_dia(
        self, fecha_inicio: date, fecha_fin: date,
        filtro_ids: list[int] | None, empresa: str | None
    ) -> list[dict]:

        # Llamadas de Base
        base_dia_query = select(
            cast(HistorialLlamada.created_at, Date).label("fecha"),
            func.count(HistorialLlamada.id).label("llamadas_base"),
        ).where(
            and_(
                cast(HistorialLlamada.created_at, Date) >= fecha_inicio,
                cast(HistorialLlamada.created_at, Date) <= fecha_fin,
            )
        ).group_by(cast(HistorialLlamada.created_at, Date))

        if filtro_ids is not None:
            base_dia_query = base_dia_query.where(
                HistorialLlamada.comercial_id.in_(filtro_ids)
            )

        result_base = await self.db.execute(base_dia_query)
        base_por_dia = {str(row.fecha): row.llamadas_base for row in result_base.all()}

        # Llamadas de Cartera (Gestiones)
        cartera_dia_query = select(
            cast(ClienteGestion.created_at, Date).label("fecha"),
            func.count(ClienteGestion.id).label("llamadas_cartera"),
        ).select_from(ClienteGestion).join(
            Cliente, ClienteGestion.cliente_id == Cliente.id
        ).where(
            and_(
                cast(ClienteGestion.created_at, Date) >= fecha_inicio,
                cast(ClienteGestion.created_at, Date) <= fecha_fin,
            )
        ).group_by(cast(ClienteGestion.created_at, Date))

        if filtro_ids is not None:
            cartera_dia_query = cartera_dia_query.where(Cliente.comercial_encargado_id.in_(filtro_ids))

        result_cartera = await self.db.execute(cartera_dia_query)
        cartera_por_dia = {str(row.fecha): row.llamadas_cartera for row in result_cartera.all()}

        resultado = []
        current = fecha_inicio
        while current <= fecha_fin:
            fecha_str = str(current)
            resultado.append({
                "fecha": fecha_str,
                "llamadas_base": base_por_dia.get(fecha_str, 0),
                "llamadas_cartera": cartera_por_dia.get(fecha_str, 0),
            })
            current += timedelta(days=1)

        return resultado

    async def _get_ranking_comerciales(
        self, fecha_inicio: date, fecha_fin: date,
        filtro_ids: list[int] | None, empresa: str | None
    ) -> list[dict]:

        llamadas_query = select(
            HistorialLlamada.comercial_id,
            func.count(HistorialLlamada.id).label("total_llamadas"),
            func.sum(
                case((CasoLlamada.contestado == True, 1), else_=0)
            ).label("contestadas"),
            func.sum(
                case(
                    (and_(CasoLlamada.contestado == True, CasoLlamada.gestionable == True), 1),
                    else_=0,
                )
            ).label("efectivas"),
        ).select_from(HistorialLlamada).join(
            CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id
        ).where(
            and_(
                cast(HistorialLlamada.created_at, Date) >= fecha_inicio,
                cast(HistorialLlamada.created_at, Date) <= fecha_fin,
            )
        ).group_by(HistorialLlamada.comercial_id)

        if filtro_ids is not None:
            llamadas_query = llamadas_query.where(
                HistorialLlamada.comercial_id.in_(filtro_ids)
            )

        result_llamadas = await self.db.execute(llamadas_query)
        llamadas_data = {row.comercial_id: row for row in result_llamadas.all()}

        leads_query = select(
            Inbox.asignado_a.label("comercial_id"),
            func.count(Inbox.id).label("leads_asignados"),
            func.sum(
                case((Inbox.estado == "CONVERTIDO", 1), else_=0)
            ).label("convertidos"),
        ).where(
            and_(
                cast(Inbox.fecha_recepcion, Date) >= fecha_inicio,
                cast(Inbox.fecha_recepcion, Date) <= fecha_fin,
                Inbox.estado != "BOT",
                Inbox.asignado_a.isnot(None),
            )
        ).group_by(Inbox.asignado_a)

        if filtro_ids is not None:
            leads_query = leads_query.where(Inbox.asignado_a.in_(filtro_ids))

        result_leads = await self.db.execute(leads_query)
        leads_data = {row.comercial_id: row for row in result_leads.all()}

        from app.models.comercial_catalogos import MedioGestion

        # Cartera (with breakdown)
        cartera_query = select(
            Cliente.comercial_encargado_id.label("comercial_id"),
            func.coalesce(MedioGestion.nombre, 'Otro').label("medio"),
            func.count(ClienteGestion.id).label("cantidad"),
        ).select_from(ClienteGestion).join(
            Cliente, ClienteGestion.cliente_id == Cliente.id
        ).outerjoin(
            MedioGestion, ClienteGestion.medio_id == MedioGestion.id
        ).where(
            and_(
                cast(ClienteGestion.created_at, Date) >= fecha_inicio,
                cast(ClienteGestion.created_at, Date) <= fecha_fin,
                Cliente.comercial_encargado_id.isnot(None),
            )
        ).group_by(Cliente.comercial_encargado_id, MedioGestion.nombre)

        if filtro_ids is not None:
            cartera_query = cartera_query.where(Cliente.comercial_encargado_id.in_(filtro_ids))

        result_cartera = await self.db.execute(cartera_query)
        cartera_data = {}
        for row in result_cartera.all():
            if row.comercial_id not in cartera_data:
                cartera_data[row.comercial_id] = {"total": 0, "medios": {}}
            cartera_data[row.comercial_id]["total"] += row.cantidad
            medio_norm = row.medio.lower()
            cartera_data[row.comercial_id]["medios"][medio_norm] = row.cantidad

        all_ids = set(llamadas_data.keys()) | set(leads_data.keys()) | set(cartera_data.keys())
        if not all_ids:
            return []

        users_query = select(Usuario).options(
            selectinload(Usuario.empleado)
        ).where(Usuario.id.in_(all_ids))
        result_users = await self.db.execute(users_query)
        users = {u.id: u for u in result_users.scalars().all()}

        resultado = []
        for uid in all_ids:
            user = users.get(uid)
            if not user:
                continue
            nombre = (
                f"{user.empleado.nombres} {user.empleado.apellido_paterno}"
                if user.empleado else user.correo_corp
            )

            ll = llamadas_data.get(uid)
            ld = leads_data.get(uid)
            cc = cartera_data.get(uid, {"total": 0, "medios": {}})

            resultado.append({
                "nombre": nombre,
                "total_llamadas": ll.total_llamadas if ll else 0,
                "contestadas": ll.contestadas if ll else 0,
                "efectivas": ll.efectivas if ll else 0,
                "leads_asignados": ld.leads_asignados if ld else 0,
                "convertidos": ld.convertidos if ld else 0,
                "gestiones_cartera": cc["total"],
                "gestiones_llamada": cc["medios"].get("llamada", 0),
                "gestiones_whatsapp": cc["medios"].get("whatsapp", 0),
                "gestiones_correo": cc["medios"].get("correo", 0),
                "gestiones_otro": cc["medios"].get("otro", 0) + sum(v for k, v in cc["medios"].items() if k not in ["llamada", "whatsapp", "correo", "otro"])
            })

        resultado.sort(key=lambda x: (x["total_llamadas"] + x["gestiones_cartera"]), reverse=True)
        return resultado

    async def _get_descartes_buzon(
        self, fecha_inicio: date, fecha_fin: date,
        filtro_ids: list[int] | None, empresa: str | None
    ) -> list[dict]:
        from app.models.comercial_catalogos import MotivoDescarteInbox
        
        query = select(
            func.coalesce(MotivoDescarteInbox.nombre, 'Sin motivo').label("motivo"),
            func.count(Inbox.id).label("cantidad")
        ).select_from(Inbox).outerjoin(
            MotivoDescarteInbox, Inbox.motivo_descarte_id == MotivoDescarteInbox.id
        ).where(
            and_(
                cast(Inbox.fecha_recepcion, Date) >= fecha_inicio,
                cast(Inbox.fecha_recepcion, Date) <= fecha_fin,
                Inbox.estado == "DESCARTADO"
            )
        ).group_by(MotivoDescarteInbox.nombre)

        if filtro_ids is not None:
            query = query.where(Inbox.asignado_a.in_(filtro_ids))

        result = await self.db.execute(query)
        
        return [
            {
                "motivo": row.motivo,
                "cantidad": row.cantidad
            }
            for row in result.all()
        ]
