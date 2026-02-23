"""
AnalyticsService - Dashboard de métricas para el perfil de Sistemas/Gerencia.
Genera un reporte completo con estadísticas de pipeline, rendimiento comercial,
canales de captación y métricas operativas.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, and_, extract
from app.models.comercial import Cliente, ClienteContacto, Cita
from app.models.comercial_inbox import Inbox
from app.models.cliente_historial import ClienteHistorial
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from datetime import date, datetime, timedelta

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard(self, fecha_inicio: date, fecha_fin: date) -> dict:
        """Genera el dashboard completo con todas las métricas."""
        # Convertir date a datetime para filtros consistentes
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())

        pipeline = await self._get_pipeline_stats(dt_inicio, dt_fin)
        comerciales = await self._get_comerciales_stats(dt_inicio, dt_fin)
        origenes = await self._get_origenes_stats(dt_inicio, dt_fin)
        operativo = await self._get_operativo_stats(dt_inicio, dt_fin)

        return {
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "pipeline": pipeline,
            "comerciales": comerciales,
            "origenes": origenes,
            "operativo": operativo
        }

    # =========================================================================
    # A. Pipeline de Ventas
    # =========================================================================

    async def _get_pipeline_stats(self, dt_inicio: datetime, dt_fin: datetime) -> dict:
        """Embudo de conversión, tasas y tiempos."""
        # Embudo: conteo por estado (todos los clientes activos)
        stmt_embudo = select(
            Cliente.tipo_estado,
            func.count().label('total')
        ).where(Cliente.is_active == True).group_by(Cliente.tipo_estado)

        result = await self.db.execute(stmt_embudo)
        embudo = {row.tipo_estado: row.total for row in result.all()}

        total_pipeline = sum(embudo.get(e, 0) for e in ["PROSPECTO", "EN_NEGOCIACION", "CLIENTE"])
        convertidos = embudo.get("CLIENTE", 0)
        perdidos = embudo.get("PERDIDO", 0)
        total_activos = sum(embudo.values()) or 1  # Evitar división por 0

        tasa_conversion = round((convertidos / total_pipeline * 100), 1) if total_pipeline > 0 else 0
        tasa_perdida = round((perdidos / total_activos * 100), 1) if total_activos > 0 else 0

        # Tiempo promedio por etapa (desde historial en el período)
        stmt_tiempos = select(
            ClienteHistorial.estado_anterior,
            func.avg(ClienteHistorial.tiempo_en_estado_anterior).label('promedio_minutos')
        ).where(
            and_(
                ClienteHistorial.created_at >= dt_inicio,
                ClienteHistorial.created_at <= dt_fin,
                ClienteHistorial.tiempo_en_estado_anterior.isnot(None),
                ClienteHistorial.estado_anterior.isnot(None)
            )
        ).group_by(ClienteHistorial.estado_anterior)

        result_tiempos = await self.db.execute(stmt_tiempos)
        tiempo_por_etapa = {}
        for row in result_tiempos.all():
            # Convertir minutos a días
            dias = round((row.promedio_minutos or 0) / 1440, 1)
            tiempo_por_etapa[row.estado_anterior] = dias

        # Reactivaciones exitosas en el período
        stmt_react = select(func.count()).select_from(ClienteHistorial).where(
            and_(
                ClienteHistorial.created_at >= dt_inicio,
                ClienteHistorial.created_at <= dt_fin,
                ClienteHistorial.origen_cambio == "REACTIVACION"
            )
        )
        reactivaciones = (await self.db.execute(stmt_react)).scalar() or 0

        return {
            "embudo": embudo,
            "tasa_conversion": tasa_conversion,
            "tasa_perdida": tasa_perdida,
            "tiempo_promedio_por_etapa": tiempo_por_etapa,
            "reactivaciones_exitosas": reactivaciones
        }

    # =========================================================================
    # B. Rendimiento por Comercial
    # =========================================================================

    async def _get_comerciales_stats(self, dt_inicio: datetime, dt_fin: datetime) -> list[dict]:
        """Métricas de cada comercial: respuesta, llamadas, conversión."""
        # Obtener todos los comerciales activos
        stmt_comerciales = (
            select(
                Usuario.id.label("usuario_id"),
                func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("nombre")
            )
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            .where(Usuario.is_active == True)
        )
        comerciales = (await self.db.execute(stmt_comerciales)).all()

        result = []
        for com in comerciales:
            uid = com.usuario_id
            nombre = com.nombre

            # Leads atendidos (del Inbox, en el período)
            stmt_leads = select(func.count()).select_from(Inbox).where(
                and_(
                    Inbox.asignado_a == uid,
                    Inbox.fecha_recepcion >= dt_inicio,
                    Inbox.fecha_recepcion <= dt_fin
                )
            )
            leads = (await self.db.execute(stmt_leads)).scalar() or 0

            # Tiempo promedio de respuesta
            stmt_tiempo = select(
                func.avg(Inbox.tiempo_respuesta_minutos)
            ).where(
                and_(
                    Inbox.asignado_a == uid,
                    Inbox.tiempo_respuesta_minutos.isnot(None),
                    Inbox.fecha_recepcion >= dt_inicio,
                    Inbox.fecha_recepcion <= dt_fin
                )
            )
            tiempo_resp = (await self.db.execute(stmt_tiempo)).scalar()
            tiempo_resp = round(float(tiempo_resp), 1) if tiempo_resp else None

            # Llamadas realizadas (contactos con fecha_llamada en el período)
            stmt_llamadas = select(func.count()).select_from(ClienteContacto).where(
                and_(
                    ClienteContacto.asignado_a == uid,
                    ClienteContacto.fecha_llamada >= dt_inicio,
                    ClienteContacto.fecha_llamada <= dt_fin
                )
            )
            llamadas = (await self.db.execute(stmt_llamadas)).scalar() or 0

            # Clientes convertidos (historial: estado_nuevo = CLIENTE, en el período)
            stmt_convertidos = select(func.count()).select_from(ClienteHistorial).where(
                and_(
                    ClienteHistorial.registrado_por == uid,
                    ClienteHistorial.estado_nuevo == "CLIENTE",
                    ClienteHistorial.created_at >= dt_inicio,
                    ClienteHistorial.created_at <= dt_fin
                )
            )
            convertidos = (await self.db.execute(stmt_convertidos)).scalar() or 0

            tasa = round((convertidos / leads * 100), 1) if leads > 0 else 0

            result.append({
                "usuario_id": uid,
                "nombre": nombre,
                "leads_atendidos": leads,
                "tiempo_respuesta_promedio_min": tiempo_resp,
                "clientes_convertidos": convertidos,
                "llamadas_realizadas": llamadas,
                "tasa_conversion": tasa
            })

        # Ordenar por tasa de conversión descendente
        result.sort(key=lambda x: x["tasa_conversion"], reverse=True)
        return result

    # =========================================================================
    # C. Canales de Captación (Origen)
    # =========================================================================

    async def _get_origenes_stats(self, dt_inicio: datetime, dt_fin: datetime) -> dict:
        """Distribución y rendimiento por canal de origen."""
        stmt = select(
            Cliente.origen,
            func.count().label('total'),
            func.sum(case((Cliente.tipo_estado == 'CLIENTE', 1), else_=0)).label('convertidos')
        ).where(
            and_(
                Cliente.is_active == True,
                Cliente.created_at >= dt_inicio,
                Cliente.created_at <= dt_fin
            )
        ).group_by(Cliente.origen)

        result = await self.db.execute(stmt)
        origenes = {}
        for row in result.all():
            nombre = row.origen or "SIN_ORIGEN"
            total = row.total or 0
            convertidos = row.convertidos or 0
            origenes[nombre] = {
                "total": total,
                "convertidos": convertidos,
                "tasa_conversion": round((convertidos / total * 100), 1) if total > 0 else 0
            }

        return origenes

    # =========================================================================
    # D. Operativo
    # =========================================================================

    async def _get_operativo_stats(self, dt_inicio: datetime, dt_fin: datetime) -> dict:
        """Citas, leads pendientes, clientes nuevos, tendencia."""
        # Citas en el período: agendadas vs terminadas
        stmt_citas_total = select(func.count()).select_from(Cita).where(
            and_(
                Cita.fecha_cita >= dt_inicio,
                Cita.fecha_cita <= dt_fin,
                Cita.estado.in_(['APROBADO', 'TERMINADO'])
            )
        )
        total_citas = (await self.db.execute(stmt_citas_total)).scalar() or 0

        stmt_citas_terminadas = select(func.count()).select_from(Cita).where(
            and_(
                Cita.fecha_cita >= dt_inicio,
                Cita.fecha_cita <= dt_fin,
                Cita.estado == 'TERMINADO'
            )
        )
        citas_terminadas = (await self.db.execute(stmt_citas_terminadas)).scalar() or 0
        cumplimiento = round((citas_terminadas / total_citas * 100), 1) if total_citas > 0 else 0

        # Leads pendientes (sin importar fecha, es un snapshot actual)
        stmt_pendientes = select(func.count()).select_from(Inbox).where(
            Inbox.estado == 'PENDIENTE'
        )
        leads_pendientes = (await self.db.execute(stmt_pendientes)).scalar() or 0

        # Clientes nuevos en el período
        stmt_nuevos = select(func.count()).select_from(Cliente).where(
            and_(
                Cliente.created_at >= dt_inicio,
                Cliente.created_at <= dt_fin
            )
        )
        clientes_nuevos = (await self.db.execute(stmt_nuevos)).scalar() or 0

        # Tendencia semanal (últimas 4 semanas desde fecha_fin)
        tendencia = []
        for i in range(4):
            semana_fin = dt_fin - timedelta(weeks=i)
            semana_inicio = semana_fin - timedelta(weeks=1)
            stmt_semana = select(func.count()).select_from(Cliente).where(
                and_(
                    Cliente.created_at >= semana_inicio,
                    Cliente.created_at < semana_fin
                )
            )
            count = (await self.db.execute(stmt_semana)).scalar() or 0
            tendencia.insert(0, count)  # Más antiguo primero

        return {
            "citas_cumplimiento": cumplimiento,
            "citas_total": total_citas,
            "citas_terminadas": citas_terminadas,
            "leads_pendientes": leads_pendientes,
            "clientes_nuevos_periodo": clientes_nuevos,
            "tendencia_semanal": tendencia
        }
