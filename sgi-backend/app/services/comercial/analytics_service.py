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
from app.models.cliente_gestion import ClienteGestion
from app.models.seguridad import Usuario, Rol
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
        gestion = await self._get_gestion_stats(dt_inicio, dt_fin)
        actividad = await self._get_actividad_stats(dt_inicio, dt_fin)

        return {
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "pipeline": pipeline,
            "comerciales": comerciales,
            "origenes": origenes,
            "operativo": operativo,
            "gestion": gestion,
            "actividad": actividad
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
                Empleado.nombres,
                Empleado.apellido_paterno
            )
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            .join(Usuario.roles)
            .where(
                and_(
                    Usuario.is_active == True,
                    Rol.nombre == "COMERCIAL"
                )
            )
        )
        comerciales = (await self.db.execute(stmt_comerciales)).all()

        result = []
        for com in comerciales:
            uid = com.usuario_id
            primer_nombre = com.nombres.split()[0] if com.nombres else ''
            primer_apellido = com.apellido_paterno.split()[0] if com.apellido_paterno else ''
            nombre_corto = f"{primer_nombre} {primer_apellido}".strip()
            nombre = nombre_corto or "Sin Nombre"

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
                func.avg(Inbox.tiempo_respuesta_segundos)
            ).where(
                and_(
                    Inbox.asignado_a == uid,
                    Inbox.tiempo_respuesta_segundos.isnot(None),
                    Inbox.fecha_recepcion >= dt_inicio,
                    Inbox.fecha_recepcion <= dt_fin
                )
            )
            tiempo_resp = (await self.db.execute(stmt_tiempo)).scalar()
            tiempo_resp = round(float(tiempo_resp)) if tiempo_resp is not None else None

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

            # Gestiones realizadas (nueva tabla)
            stmt_gestiones = select(func.count()).select_from(ClienteGestion).where(
                and_(
                    ClienteGestion.comercial_id == uid,
                    ClienteGestion.created_at >= dt_inicio,
                    ClienteGestion.created_at <= dt_fin
                )
            )
            gestiones = (await self.db.execute(stmt_gestiones)).scalar() or 0

            # Clientes únicos gestionados
            stmt_unicos = select(func.count(func.distinct(ClienteGestion.cliente_id))).where(
                and_(
                    ClienteGestion.comercial_id == uid,
                    ClienteGestion.created_at >= dt_inicio,
                    ClienteGestion.created_at <= dt_fin
                )
            )
            clientes_unicos = (await self.db.execute(stmt_unicos)).scalar() or 0

            tasa = round((convertidos / leads * 100), 1) if leads > 0 else 0

            result.append({
                "usuario_id": uid,
                "nombre": nombre,
                "leads_atendidos": leads,
                "tiempo_respuesta_promedio_min": tiempo_resp,
                "clientes_convertidos": convertidos,
                "llamadas_realizadas": llamadas,
                "gestiones_realizadas": gestiones,
                "clientes_unicos_gestionados": clientes_unicos,
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
                Cita.fecha >= dt_inicio,
                Cita.fecha <= dt_fin,
                Cita.estado.in_(['APROBADO', 'TERMINADO'])
            )
        )
        total_citas = (await self.db.execute(stmt_citas_total)).scalar() or 0

        stmt_citas_terminadas = select(func.count()).select_from(Cita).where(
            and_(
                Cita.fecha >= dt_inicio,
                Cita.fecha <= dt_fin,
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

    # =========================================================================
    # E. Gestión de Cartera
    # =========================================================================

    async def _get_gestion_stats(self, dt_inicio: datetime, dt_fin: datetime) -> dict:
        """Métricas de gestión de cartera: actividades, contactabilidad, clientes abandonados."""
        # Total gestiones en el período
        stmt_total = select(func.count()).select_from(ClienteGestion).where(
            and_(
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            )
        )
        total_gestiones = (await self.db.execute(stmt_total)).scalar() or 0

        # Gestiones por tipo
        stmt_tipo = select(
            ClienteGestion.tipo,
            func.count().label("total")
        ).where(
            and_(
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            )
        ).group_by(ClienteGestion.tipo)
        result_tipo = await self.db.execute(stmt_tipo)
        por_tipo = {row.tipo: row.total for row in result_tipo.all()}

        # Gestiones por resultado
        stmt_resultado = select(
            ClienteGestion.resultado,
            func.count().label("total")
        ).where(
            and_(
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            )
        ).group_by(ClienteGestion.resultado)
        result_resultado = await self.db.execute(stmt_resultado)
        por_resultado = {row.resultado: row.total for row in result_resultado.all()}

        # Tasa de contactabilidad global
        llamadas_total = por_tipo.get("LLAMADA", 0)
        contactados = por_resultado.get("CONTESTO", 0) + por_resultado.get("INTERESADO", 0) + por_resultado.get("COTIZACION_ENVIADA", 0)
        tasa_contactabilidad = round((contactados / llamadas_total * 100), 1) if llamadas_total > 0 else 0

        # Clientes sin gestión > 30 días (clientes activos asignados que no tienen gestión reciente)
        hace_30_dias = dt_fin - timedelta(days=30)
        # Subquery: clientes que sí tienen gestión reciente
        subq_con_gestion = select(ClienteGestion.cliente_id).where(
            ClienteGestion.created_at >= hace_30_dias
        ).distinct().subquery()

        stmt_abandonados = select(func.count()).select_from(Cliente).where(
            and_(
                Cliente.is_active == True,
                Cliente.tipo_estado.in_(['PROSPECTO', 'EN_NEGOCIACION', 'CLIENTE']),
                Cliente.comercial_encargado_id.isnot(None),
                ~Cliente.id.in_(select(subq_con_gestion))
            )
        )
        clientes_sin_gestion = (await self.db.execute(stmt_abandonados)).scalar() or 0

        return {
            "total_gestiones": total_gestiones,
            "por_tipo": por_tipo,
            "por_resultado": por_resultado,
            "tasa_contactabilidad": tasa_contactabilidad,
            "clientes_sin_gestion_30d": clientes_sin_gestion
        }

    # =========================================================================
    # F. Actividad Consolidada
    # =========================================================================

    async def _get_actividad_stats(self, dt_inicio: datetime, dt_fin: datetime) -> dict:
        """Suma de actividad del equipo comercial desde 3 fuentes."""
        # 1. Gestión Cartera
        stmt_cartera = select(func.count()).select_from(ClienteGestion).where(
            and_(
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            )
        )
        gestion_cartera = (await self.db.execute(stmt_cartera)).scalar() or 0

        stmt_cartera_unicos = select(func.count(func.distinct(ClienteGestion.cliente_id))).where(
            and_(
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            )
        )
        clientes_unicos_cartera = (await self.db.execute(stmt_cartera_unicos)).scalar() or 0

        # 2. Llamadas Base (prospección fría)
        stmt_base = select(func.count()).select_from(ClienteContacto).where(
            and_(
                ClienteContacto.fecha_llamada >= dt_inicio,
                ClienteContacto.fecha_llamada <= dt_fin
            )
        )
        llamadas_base = (await self.db.execute(stmt_base)).scalar() or 0

        # 3. Leads Atendidos (Inbox)
        stmt_inbox = select(
            Inbox.estado,
            func.count().label("total")
        ).where(
            and_(
                Inbox.estado.in_(['CONVERTIDO', 'DESCARTADO']),
                Inbox.fecha_recepcion >= dt_inicio,
                Inbox.fecha_recepcion <= dt_fin
            )
        ).group_by(Inbox.estado)
        
        result_inbox = await self.db.execute(stmt_inbox)
        estados_inbox = {row.estado: row.total for row in result_inbox.all()}
        
        leads_convertidos = estados_inbox.get("CONVERTIDO", 0)
        leads_descartados = estados_inbox.get("DESCARTADO", 0)
        leads_total = leads_convertidos + leads_descartados

        # 4. Gestión Total
        gestion_total = gestion_cartera + llamadas_base + leads_total

        return {
            "gestion_cartera": gestion_cartera,
            "llamadas_base": llamadas_base,
            "leads_convertidos": leads_convertidos,
            "leads_descartados": leads_descartados,
            "leads_total": leads_total,
            "gestion_total": gestion_total,
            "clientes_unicos_cartera": clientes_unicos_cartera
        }

