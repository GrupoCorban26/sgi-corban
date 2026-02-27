"""
AnalyticsService - Dashboard de métricas para el perfil de Sistemas/Gerencia.
Genera un reporte completo con estadísticas de pipeline, rendimiento comercial,
canales de captación y métricas operativas.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, and_, extract
from app.models.comercial import Cliente, ClienteContacto, Cita, CasoLlamada
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
        """Genera el dashboard completo simplificado en dos reportes."""
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())

        # 1. Reporte de Base de Datos
        base_datos = await self._get_reporte_base_datos(dt_inicio, dt_fin)
        
        # 2. Reporte de Mantenimiento de Cartera
        cartera = await self._get_reporte_cartera(dt_inicio, dt_fin)

        return {
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "base_datos": base_datos,
            "cartera": cartera
        }

    # =========================================================================
    # A. Reporte de Base de Datos
    # =========================================================================

    async def _get_reporte_base_datos(self, dt_inicio: datetime, dt_fin: datetime) -> dict:
        # Obtener comerciales
        stmt_comerciales = select(Usuario.id, Empleado.nombres).join(Empleado).join(Usuario.roles).where(and_(Usuario.is_active == True, Rol.nombre == "COMERCIAL"))
        comerciales = (await self.db.execute(stmt_comerciales)).all()
        
        comerciales_stats = []
        totales = {"total_llamadas": 0, "llamadas_contestadas": 0, "llamadas_efectivas": 0}

        for com in comerciales:
            uid = com.id
            nombre = com.nombres.split()[0] if com.nombres else 'Sin Nombre'
            
            # Total llamadas (ClienteContacto con fecha_llamada)
            stmt_llamadas = select(func.count()).select_from(ClienteContacto).where(
                and_(ClienteContacto.asignado_a == uid, ClienteContacto.fecha_llamada >= dt_inicio, ClienteContacto.fecha_llamada <= dt_fin)
            )
            total_llamadas = (await self.db.execute(stmt_llamadas)).scalar() or 0
            
            # Llamadas contestadas
            stmt_contestadas = select(func.count()).select_from(ClienteContacto).join(CasoLlamada).where(
                and_(ClienteContacto.asignado_a == uid, ClienteContacto.fecha_llamada >= dt_inicio, ClienteContacto.fecha_llamada <= dt_fin, CasoLlamada.contestado == True)
            )
            llamadas_contestadas = (await self.db.execute(stmt_contestadas)).scalar() or 0
            
            # Llamadas efectivas
            stmt_efectivas = select(func.count()).select_from(ClienteContacto).join(CasoLlamada).where(
                and_(ClienteContacto.asignado_a == uid, ClienteContacto.fecha_llamada >= dt_inicio, ClienteContacto.fecha_llamada <= dt_fin, CasoLlamada.gestionable == True)
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

    async def _get_reporte_cartera(self, dt_inicio: datetime, dt_fin: datetime) -> dict:
        # Obtener comerciales
        stmt_comerciales = select(Usuario.id, Empleado.nombres).join(Empleado).join(Usuario.roles).where(and_(Usuario.is_active == True, Rol.nombre == "COMERCIAL"))
        comerciales = (await self.db.execute(stmt_comerciales)).all()
        
        comerciales_stats = []
        
        # Totales Generales
        stmt_totales = select(func.count()).select_from(ClienteGestion).where(
            and_(ClienteGestion.created_at >= dt_inicio, ClienteGestion.created_at <= dt_fin)
        )
        total_gestiones = (await self.db.execute(stmt_totales)).scalar() or 0
        
        stmt_unicos = select(func.count(func.distinct(ClienteGestion.cliente_id))).where(
            and_(ClienteGestion.created_at >= dt_inicio, ClienteGestion.created_at <= dt_fin)
        )
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
