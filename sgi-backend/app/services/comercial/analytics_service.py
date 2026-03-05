"""
AnalyticsService - Dashboard de métricas para el perfil de Sistemas/Gerencia.
Genera un reporte completo con estadísticas de pipeline, rendimiento comercial,
canales de captación y métricas operativas.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, and_, extract, or_
from app.models.comercial import Cliente, ClienteContacto, Cita, CasoLlamada
from app.models.historial_llamadas import HistorialLlamada
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

    async def get_dashboard(self, fecha_inicio: date, fecha_fin: date, comercial_ids: list = None) -> dict:
        """Genera el dashboard completo simplificado en dos reportes."""
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())

        # 1. Reporte de Base de Datos
        base_datos = await self._get_reporte_base_datos(dt_inicio, dt_fin, comercial_ids)
        
        # 2. Reporte de Mantenimiento de Cartera
        cartera = await self._get_reporte_cartera(dt_inicio, dt_fin, comercial_ids)

        # 3. Reporte de Buzón WhatsApp
        buzon = await self._get_reporte_buzon(dt_inicio, dt_fin, comercial_ids)

        return {
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "base_datos": base_datos,
            "cartera": cartera,
            "buzon": buzon
        }

    # =========================================================================
    # A. Reporte de Base de Datos
    # =========================================================================

    async def _get_reporte_base_datos(self, dt_inicio: datetime, dt_fin: datetime, comercial_ids: list = None) -> dict:
        # Obtener comerciales activos y filtrar
        stmt_comerciales = select(Usuario.id, Empleado.nombres).join(Empleado).join(Usuario.roles).where(and_(Usuario.is_active == True, Rol.nombre == "COMERCIAL"))
        if comercial_ids is not None:
             stmt_comerciales = stmt_comerciales.where(Usuario.id.in_(comercial_ids))
        comerciales = (await self.db.execute(stmt_comerciales)).all()
        
        comerciales_stats = []
        totales = {"total_llamadas": 0, "llamadas_contestadas": 0, "llamadas_efectivas": 0}

        for com in comerciales:
            uid = com.id
            nombre = com.nombres.split()[0] if com.nombres else 'Sin Nombre'
            
            # Total llamadas (HistorialLlamada con fecha_llamada)
            stmt_llamadas = select(func.count()).select_from(HistorialLlamada).where(
                and_(HistorialLlamada.comercial_id == uid, HistorialLlamada.fecha_llamada >= dt_inicio, HistorialLlamada.fecha_llamada <= dt_fin)
            )
            total_llamadas = (await self.db.execute(stmt_llamadas)).scalar() or 0
            
            # Llamadas contestadas
            stmt_contestadas = select(func.count()).select_from(HistorialLlamada).join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id).where(
                and_(HistorialLlamada.comercial_id == uid, HistorialLlamada.fecha_llamada >= dt_inicio, HistorialLlamada.fecha_llamada <= dt_fin, CasoLlamada.contestado == True)
            )
            llamadas_contestadas = (await self.db.execute(stmt_contestadas)).scalar() or 0
            
            # Llamadas efectivas
            stmt_efectivas = select(func.count()).select_from(HistorialLlamada).join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id).where(
                and_(HistorialLlamada.comercial_id == uid, HistorialLlamada.fecha_llamada >= dt_inicio, HistorialLlamada.fecha_llamada <= dt_fin, CasoLlamada.gestionable == True)
            )
            llamadas_efectivas = (await self.db.execute(stmt_efectivas)).scalar() or 0
            
            totales["total_llamadas"] += total_llamadas
            totales["llamadas_contestadas"] += llamadas_contestadas
            totales["llamadas_efectivas"] += llamadas_efectivas
            
            comerciales_stats.append({
                "usuario_id": uid, "nombre": nombre,
                "total_llamadas": total_llamadas, "llamadas_contestadas": llamadas_contestadas, "llamadas_efectivas": llamadas_efectivas
            })
            
        # Calcular porcentajes generales
        pct_contestadas = round((totales["llamadas_contestadas"] / totales["total_llamadas"] * 100), 1) if totales["total_llamadas"] > 0 else 0
        pct_efectivas = round((totales["llamadas_efectivas"] / totales["total_llamadas"] * 100), 1) if totales["total_llamadas"] > 0 else 0
        
        totales["pct_contestadas"] = pct_contestadas
        totales["pct_efectivas"] = pct_efectivas

        return { "totales": totales, "por_comercial": comerciales_stats }

    # =========================================================================
    # B. Reporte de Mantenimiento de Cartera
    # =========================================================================

    async def _get_reporte_cartera(self, dt_inicio: datetime, dt_fin: datetime, comercial_ids: list = None) -> dict:
        # Obtener comerciales activos y filtrar
        stmt_comerciales = select(Usuario.id, Empleado.nombres).join(Empleado).join(Usuario.roles).where(and_(Usuario.is_active == True, Rol.nombre == "COMERCIAL"))
        if comercial_ids is not None:
             stmt_comerciales = stmt_comerciales.where(Usuario.id.in_(comercial_ids))
        comerciales = (await self.db.execute(stmt_comerciales)).all()
        
        comerciales_stats = []
        
        # Filtro base para conteos
        condicion_base = and_(ClienteGestion.created_at >= dt_inicio, ClienteGestion.created_at <= dt_fin)
        if comercial_ids is not None:
            condicion_base = and_(condicion_base, ClienteGestion.comercial_id.in_(comercial_ids))
            
        # Totales Generales limitados a los comerciales permitidos
        stmt_totales = select(func.count()).select_from(ClienteGestion).where(condicion_base)
        total_gestiones = (await self.db.execute(stmt_totales)).scalar() or 0
        
        stmt_unicos = select(func.count(func.distinct(ClienteGestion.cliente_id))).where(condicion_base)
        total_unicos = (await self.db.execute(stmt_unicos)).scalar() or 0

        for com in comerciales:
            uid = com.id
            nombre = com.nombres.split()[0] if com.nombres else 'Sin Nombre'
            
            # Count by motive
            stmt_motivos = select(ClienteGestion.resultado, func.count().label('total')).where(
                and_(ClienteGestion.comercial_id == uid, ClienteGestion.created_at >= dt_inicio, ClienteGestion.created_at <= dt_fin)
            ).group_by(ClienteGestion.resultado)
            
            result_motivos = await self.db.execute(stmt_motivos)
            motivos = {row.resultado: row.total for row in result_motivos.all()}
            
            comerciales_stats.append({
                "usuario_id": uid, "nombre": nombre,
                "seguimiento_carga": motivos.get("SEGUIMIENTO_CARGA", 0),
                "fidelizacion": motivos.get("FIDELIZACION", 0),
                "dudas_cliente": motivos.get("DUDAS_CLIENTE", 0),
                "quiere_cotizacion": motivos.get("QUIERE_COTIZACION", 0)
            })

        return {
            "totales": {
                "total_llamadas": total_gestiones,
                "total_clientes_gestionados": total_unicos
            },
            "por_comercial": comerciales_stats
        }

    # =========================================================================
    # C. Reporte de Buzón WhatsApp
    # =========================================================================

    async def _get_reporte_buzon(self, dt_inicio: datetime, dt_fin: datetime, comercial_ids: list = None) -> dict:
        """Métricas del Buzón de WhatsApp por comercial."""
        # Condición base de fechas
        condicion_fecha = and_(
            Inbox.fecha_recepcion >= dt_inicio,
            Inbox.fecha_recepcion <= dt_fin
        )

        # --- TOTALES GENERALES ---
        # Total leads
        stmt_total = select(func.count()).select_from(Inbox).where(condicion_fecha)
        if comercial_ids is not None:
            stmt_total = stmt_total.where(Inbox.asignado_a.in_(comercial_ids))
        total_leads = (await self.db.execute(stmt_total)).scalar() or 0

        # Convertidos
        stmt_convertidos = select(func.count()).select_from(Inbox).where(
            and_(condicion_fecha, Inbox.estado == 'CONVERTIDO')
        )
        if comercial_ids is not None:
            stmt_convertidos = stmt_convertidos.where(Inbox.asignado_a.in_(comercial_ids))
        total_convertidos = (await self.db.execute(stmt_convertidos)).scalar() or 0

        # Descartados
        stmt_descartados = select(func.count()).select_from(Inbox).where(
            and_(condicion_fecha, Inbox.estado == 'DESCARTADO')
        )
        if comercial_ids is not None:
            stmt_descartados = stmt_descartados.where(Inbox.asignado_a.in_(comercial_ids))
        total_descartados = (await self.db.execute(stmt_descartados)).scalar() or 0

        # Sin respuesta (auto-asignados)
        stmt_sin_respuesta = select(func.count()).select_from(Inbox).where(
            and_(condicion_fecha, Inbox.tipo_interes == 'SIN_RESPUESTA')
        )
        if comercial_ids is not None:
            stmt_sin_respuesta = stmt_sin_respuesta.where(Inbox.asignado_a.in_(comercial_ids))
        total_sin_respuesta = (await self.db.execute(stmt_sin_respuesta)).scalar() or 0

        # Tiempo promedio de respuesta (solo leads con respuesta)
        stmt_avg_tiempo = select(func.avg(Inbox.tiempo_respuesta_segundos)).where(
            and_(condicion_fecha, Inbox.tiempo_respuesta_segundos != None)
        )
        if comercial_ids is not None:
            stmt_avg_tiempo = stmt_avg_tiempo.where(Inbox.asignado_a.in_(comercial_ids))
        avg_tiempo = (await self.db.execute(stmt_avg_tiempo)).scalar() or 0

        # Tasa de conversión y abandono
        tasa_conversion = round((total_convertidos / total_leads * 100), 1) if total_leads > 0 else 0
        tasa_abandono = round((total_sin_respuesta / total_leads * 100), 1) if total_leads > 0 else 0

        totales = {
            "total_leads": total_leads,
            "total_convertidos": total_convertidos,
            "total_descartados": total_descartados,
            "total_sin_respuesta": total_sin_respuesta,
            "tasa_conversion": tasa_conversion,
            "tasa_abandono": tasa_abandono,
            "avg_tiempo_respuesta_seg": int(avg_tiempo)
        }

        # --- POR COMERCIAL ---
        stmt_comerciales = select(Usuario.id, Empleado.nombres).join(Empleado).join(Usuario.roles).where(
            and_(Usuario.is_active == True, Rol.nombre == "COMERCIAL")
        )
        if comercial_ids is not None:
            stmt_comerciales = stmt_comerciales.where(Usuario.id.in_(comercial_ids))
        comerciales = (await self.db.execute(stmt_comerciales)).all()

        comerciales_stats = []
        for com in comerciales:
            uid = com.id
            nombre = com.nombres.split()[0] if com.nombres else 'Sin Nombre'

            cond_com = and_(condicion_fecha, Inbox.asignado_a == uid)

            # Leads asignados a este comercial
            asignados = (await self.db.execute(
                select(func.count()).select_from(Inbox).where(cond_com)
            )).scalar() or 0

            # Convertidos
            convertidos = (await self.db.execute(
                select(func.count()).select_from(Inbox).where(and_(cond_com, Inbox.estado == 'CONVERTIDO'))
            )).scalar() or 0

            # Descartados
            descartados = (await self.db.execute(
                select(func.count()).select_from(Inbox).where(and_(cond_com, Inbox.estado == 'DESCARTADO'))
            )).scalar() or 0

            # En gestión activa
            en_gestion = (await self.db.execute(
                select(func.count()).select_from(Inbox).where(
                    and_(cond_com, Inbox.estado.in_(['EN_GESTION', 'SEGUIMIENTO', 'COTIZADO', 'PENDIENTE']))
                )
            )).scalar() or 0

            # Tiempo promedio respuesta
            avg_resp = (await self.db.execute(
                select(func.avg(Inbox.tiempo_respuesta_segundos)).where(
                    and_(cond_com, Inbox.tiempo_respuesta_segundos != None)
                )
            )).scalar() or 0

            tasa_conv = round((convertidos / asignados * 100), 1) if asignados > 0 else 0

            comerciales_stats.append({
                "usuario_id": uid,
                "nombre": nombre,
                "leads_asignados": asignados,
                "convertidos": convertidos,
                "descartados": descartados,
                "en_gestion": en_gestion,
                "avg_tiempo_respuesta_seg": int(avg_resp),
                "tasa_conversion": tasa_conv
            })

        return {"totales": totales, "por_comercial": comerciales_stats}
