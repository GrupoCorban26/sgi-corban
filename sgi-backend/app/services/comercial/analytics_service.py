"""
AnalyticsService - Dashboard de métricas para el perfil de Sistemas/Gerencia.
Genera un reporte completo con estadísticas de pipeline, rendimiento comercial,
canales de captación y métricas operativas.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, and_, extract, or_, text
from app.models.comercial import Cliente, ClienteContacto, Cita, CasoLlamada
from app.models.historial_llamadas import HistorialLlamada
from app.models.comercial_inbox import Inbox
from app.models.cliente_historial import ClienteHistorial
from app.models.cliente_gestion import ClienteGestion
from app.models.seguridad import Usuario, Rol
from app.models.administrativo import Empleado
from datetime import date, datetime, timedelta
from app.utils.horario_laboral import calcular_segundos_horario_laboral

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

    async def get_reporte_base_datos(self, dt_inicio: datetime, dt_fin: datetime, comercial_ids: list = None, empresa: str = None) -> dict:
        # Obtener comerciales activos y filtrar
        stmt_comerciales = select(Usuario.id, Empleado.nombres).join(Empleado).join(Usuario.roles).where(and_(Usuario.is_active == True, Rol.nombre == "COMERCIAL"))
        if comercial_ids is not None:
             stmt_comerciales = stmt_comerciales.where(Usuario.id.in_(comercial_ids))
        if empresa:
             stmt_comerciales = stmt_comerciales.where(Empleado.empresa == empresa)
        comerciales = (await self.db.execute(stmt_comerciales)).all()
        
        comerciales_stats = []
        totales = {"total_llamadas": 0, "llamadas_contestadas": 0, "llamadas_efectivas": 0}

        for com in comerciales:
            uid = com.id
            nombre = com.nombres.split()[0] if com.nombres else 'Sin Nombre'
            
            # Total llamadas completadas (updated_at = fecha real de la llamada)
            stmt_llamadas = select(func.count()).select_from(HistorialLlamada).where(
                and_(HistorialLlamada.comercial_id == uid, HistorialLlamada.updated_at >= dt_inicio, HistorialLlamada.updated_at <= dt_fin, HistorialLlamada.caso_id.isnot(None))
            )
            total_llamadas = (await self.db.execute(stmt_llamadas)).scalar() or 0
            
            # Llamadas contestadas
            stmt_contestadas = select(func.count()).select_from(HistorialLlamada).join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id).where(
                and_(HistorialLlamada.comercial_id == uid, HistorialLlamada.updated_at >= dt_inicio, HistorialLlamada.updated_at <= dt_fin, CasoLlamada.contestado == True)
            )
            llamadas_contestadas = (await self.db.execute(stmt_contestadas)).scalar() or 0
            
            # Llamadas efectivas
            stmt_efectivas = select(func.count()).select_from(HistorialLlamada).join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id).where(
                and_(HistorialLlamada.comercial_id == uid, HistorialLlamada.updated_at >= dt_inicio, HistorialLlamada.updated_at <= dt_fin, CasoLlamada.gestionable == True)
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

    async def get_reporte_cartera(self, dt_inicio: datetime, dt_fin: datetime, comercial_ids: list = None, empresa: str = None) -> dict:
        from app.models.comercial_catalogos import MotivoGestion

        # Obtener comerciales activos y filtrar
        stmt_comerciales = select(Usuario.id, Empleado.nombres).join(Empleado).join(Usuario.roles).where(and_(Usuario.is_active == True, Rol.nombre == "COMERCIAL"))
        if comercial_ids is not None:
             stmt_comerciales = stmt_comerciales.where(Usuario.id.in_(comercial_ids))
        if empresa:
             stmt_comerciales = stmt_comerciales.where(Empleado.empresa == empresa)
        comerciales = (await self.db.execute(stmt_comerciales)).all()
        
        comerciales_stats = []

        for com in comerciales:
            uid = com.id
            nombre = com.nombres.split()[0] if com.nombres else 'Sin Nombre'
            
            # Count by motive — JOIN through Cliente.comercial_encargado_id and MotivoGestion.nombre
            stmt_motivos = (
                select(MotivoGestion.nombre, func.count().label('total'))
                .select_from(ClienteGestion)
                .join(Cliente, ClienteGestion.cliente_id == Cliente.id)
                .join(MotivoGestion, ClienteGestion.motivo_id == MotivoGestion.id)
                .where(and_(
                    Cliente.comercial_encargado_id == uid,
                    ClienteGestion.created_at >= dt_inicio,
                    ClienteGestion.created_at <= dt_fin
                ))
                .group_by(MotivoGestion.nombre)
            )
            
            result_motivos = await self.db.execute(stmt_motivos)
            motivos = {row.nombre: row.total for row in result_motivos.all()}
            
            seguimiento = motivos.get("SEGUIMIENTO_CARGA", 0)
            fidelizacion = motivos.get("FIDELIZACION", 0)
            dudas = motivos.get("DUDAS_CLIENTE", 0)
            cotizacion = motivos.get("QUIERE_COTIZACION", 0)
            total_comercial = seguimiento + fidelizacion + dudas + cotizacion
            
            comerciales_stats.append({
                "usuario_id": uid, "nombre": nombre,
                "seguimiento_carga": seguimiento,
                "fidelizacion": fidelizacion,
                "dudas_cliente": dudas,
                "quiere_cotizacion": cotizacion,
                "total": total_comercial
            })
            
        # Totales generales
        comercial_ids_validos = [c.id for c in comerciales]
        if comercial_ids_validos:
            condicion_totales = and_(
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            )
            stmt_totales = (
                select(func.count())
                .select_from(ClienteGestion)
                .join(Cliente, ClienteGestion.cliente_id == Cliente.id)
                .where(and_(condicion_totales, Cliente.comercial_encargado_id.in_(comercial_ids_validos)))
            )
            total_gestiones_real = (await self.db.execute(stmt_totales)).scalar() or 0
            
            stmt_unicos_real = (
                select(func.count(func.distinct(ClienteGestion.cliente_id)))
                .select_from(ClienteGestion)
                .join(Cliente, ClienteGestion.cliente_id == Cliente.id)
                .where(and_(condicion_totales, Cliente.comercial_encargado_id.in_(comercial_ids_validos)))
            )
            total_unicos_real = (await self.db.execute(stmt_unicos_real)).scalar() or 0
        else:
            total_gestiones_real = 0
            total_unicos_real = 0

        return {
            "totales": {
                "total_llamadas": total_gestiones_real,
                "total_clientes_gestionados": total_unicos_real
            },
            "por_comercial": comerciales_stats
        }

    # =========================================================================
    # C. Reporte de Buzón WhatsApp
    # =========================================================================

    async def get_reporte_buzon(self, dt_inicio: datetime, dt_fin: datetime, comercial_ids: list = None, empresa: str = None) -> dict:
        """Métricas del Buzón de WhatsApp por comercial."""
        # --- COMERCIALES A CONSIDERAR ---
        stmt_comerciales = select(Usuario.id, Empleado.nombres).join(Empleado).join(Usuario.roles).where(
            and_(Usuario.is_active == True, Rol.nombre == "COMERCIAL")
        )
        if comercial_ids is not None:
            stmt_comerciales = stmt_comerciales.where(Usuario.id.in_(comercial_ids))
        if empresa:
            stmt_comerciales = stmt_comerciales.where(Empleado.empresa == empresa)
            
        comerciales = (await self.db.execute(stmt_comerciales)).all()
        comerciales_ids_validos = [c.id for c in comerciales]

        # Condición base de fechas
        condicion_fecha = and_(
            Inbox.fecha_recepcion >= dt_inicio,
            Inbox.fecha_recepcion <= dt_fin
        )
        
        # Filtro de comerciales para los totales generales
        # Aplica si se proveyó explicitamente comercial_ids o empresa, para que los totales calzen.
        filtro_aplicable = (comercial_ids is not None) or (empresa is not None)
        
        # --- TOTALES GENERALES ---
        # Total leads
        stmt_total = select(func.count()).select_from(Inbox).where(condicion_fecha)
        if filtro_aplicable:
             if not comerciales_ids_validos:
                 stmt_total = stmt_total.where(False)
             else:
                 stmt_total = stmt_total.where(Inbox.asignado_a.in_(comerciales_ids_validos))
        total_leads = (await self.db.execute(stmt_total)).scalar() or 0

        # Convertidos — filtrado por fecha_cierre (fecha de cierre real)
        condicion_fecha_cierre = and_(
            Inbox.fecha_cierre >= dt_inicio,
            Inbox.fecha_cierre <= dt_fin
        )
        stmt_convertidos = select(func.count()).select_from(Inbox).where(
            and_(condicion_fecha_cierre, Inbox.estado == 'CIERRE')
        )
        if filtro_aplicable and comerciales_ids_validos:
            stmt_convertidos = stmt_convertidos.where(Inbox.asignado_a.in_(comerciales_ids_validos))
        total_convertidos = (await self.db.execute(stmt_convertidos)).scalar() or 0

        # Descartados
        stmt_descartados = select(func.count()).select_from(Inbox).where(
            and_(condicion_fecha, Inbox.estado == 'DESCARTADO')
        )
        if filtro_aplicable and comerciales_ids_validos:
            stmt_descartados = stmt_descartados.where(Inbox.asignado_a.in_(comerciales_ids_validos))
        total_descartados = (await self.db.execute(stmt_descartados)).scalar() if total_leads > 0 else 0

        # Sin respuesta (auto-asignados)
        stmt_sin_respuesta = select(func.count()).select_from(Inbox).where(
            and_(condicion_fecha, Inbox.tipo_interes == 'SIN_RESPUESTA')
        )
        if filtro_aplicable and comerciales_ids_validos:
            stmt_sin_respuesta = stmt_sin_respuesta.where(Inbox.asignado_a.in_(comerciales_ids_validos))
        total_sin_respuesta = (await self.db.execute(stmt_sin_respuesta)).scalar() if total_leads > 0 else 0

        # Tiempo promedio de respuesta en segundos (calculado usando horario laboral)
        stmt_avg = select(Inbox.fecha_recepcion, Inbox.fecha_gestion)\
                   .select_from(Inbox)\
                   .where(and_(condicion_fecha, Inbox.fecha_gestion != None))
        if filtro_aplicable and comerciales_ids_validos:
            stmt_avg = stmt_avg.where(Inbox.asignado_a.in_(comerciales_ids_validos))
            
        result_tiempos = (await self.db.execute(stmt_avg)).all()
        tiempos_segundos = [calcular_segundos_horario_laboral(r.fecha_recepcion, r.fecha_gestion) for r in result_tiempos]
        avg_tiempo = sum(tiempos_segundos) / len(tiempos_segundos) if tiempos_segundos else 0

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

            # Convertidos — por fecha de cierre real
            cond_cierre_com = and_(
                Inbox.fecha_cierre >= dt_inicio,
                Inbox.fecha_cierre <= dt_fin,
                Inbox.asignado_a == uid
            )
            convertidos = (await self.db.execute(
                select(func.count()).select_from(Inbox).where(and_(cond_cierre_com, Inbox.estado == 'CIERRE'))
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

            # Tiempo promedio respuesta en horario laboral
            stmt_avg_com = select(Inbox.fecha_recepcion, Inbox.fecha_gestion)\
                           .select_from(Inbox)\
                           .where(and_(cond_com, Inbox.fecha_gestion != None))
            result_tiempos_com = (await self.db.execute(stmt_avg_com)).all()
            tiempos_com = [calcular_segundos_horario_laboral(r.fecha_recepcion, r.fecha_gestion) for r in result_tiempos_com]
            avg_resp = sum(tiempos_com) / len(tiempos_com) if tiempos_com else 0


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

    # =========================================================================
    # D. Detalle de Buzón WhatsApp (para exportación Excel)
    # =========================================================================

    async def get_detalle_buzon(self, dt_inicio: datetime, dt_fin: datetime, comercial_ids: list = None, empresa: str = None) -> list[dict]:
        """Retorna filas individuales del Inbox para exportar a Excel."""
        from app.models.comercial_catalogos import MotivoDescarteInbox

        # Condición base de fechas
        condicion = and_(
            Inbox.fecha_recepcion >= dt_inicio,
            Inbox.fecha_recepcion <= dt_fin,
        )

        # Columnas base (sin origen_lead que puede no existir aún)
        columnas_base = [
            Inbox.telefono,
            Inbox.nombre_whatsapp,
            Inbox.estado,
            Inbox.tipo_interes,
            Inbox.comentario_descarte,
            func.coalesce(MotivoDescarteInbox.nombre, '').label("motivo_descarte"),
            Inbox.fecha_recepcion,
            Inbox.fecha_gestion,
            Inbox.fecha_cierre,
            Empleado.nombres.label("comercial"),
        ]

        # Intentar incluir origen_lead (disponible tras migración)
        try:
            columnas = columnas_base.copy()
            columnas.insert(4, Inbox.origen_lead)
            stmt = (
                select(*columnas)
                .outerjoin(Usuario, Inbox.asignado_a == Usuario.id)
                .outerjoin(Empleado, Usuario.empleado_id == Empleado.id)
                .outerjoin(MotivoDescarteInbox, Inbox.motivo_descarte_id == MotivoDescarteInbox.id)
                .where(condicion)
                .order_by(Inbox.fecha_recepcion.desc())
            )
            if comercial_ids is not None:
                stmt = stmt.where(Inbox.asignado_a.in_(comercial_ids))
            if empresa:
                stmt = stmt.where(Empleado.empresa == empresa)

            rows = (await self.db.execute(stmt)).all()
            tiene_origen = True
        except Exception:
            # Columna origen_lead aún no existe → query sin ella
            stmt = (
                select(*columnas_base)
                .outerjoin(Usuario, Inbox.asignado_a == Usuario.id)
                .outerjoin(Empleado, Usuario.empleado_id == Empleado.id)
                .outerjoin(MotivoDescarteInbox, Inbox.motivo_descarte_id == MotivoDescarteInbox.id)
                .where(condicion)
                .order_by(Inbox.fecha_recepcion.desc())
            )
            if comercial_ids is not None:
                stmt = stmt.where(Inbox.asignado_a.in_(comercial_ids))
            if empresa:
                stmt = stmt.where(Empleado.empresa == empresa)

            rows = (await self.db.execute(stmt)).all()
            tiene_origen = False

        TIPO_LABELS = {
            'IMPORTACION': 'Importación',
            'ASESORIA': 'Asesoría',
            'DUDAS': 'Dudas',
            'SIN_RESPUESTA': 'Sin respuesta',
            'ASIGNACION_MANUAL': 'Asignación manual',
            'AGENDAMIENTO': 'Agendamiento'
        }

        ESTADO_LABELS = {
            'BOT': 'Bot',
            'NUEVO': 'Nuevo',
            'PENDIENTE': 'Pendiente',
            'EN_GESTION': 'En Gestión',
            'SEGUIMIENTO': 'Seguimiento',
            'COTIZADO': 'Cotizado',
            'CIERRE': 'Cierre',
            'DESCARTADO': 'Descartado',
            'CONVERTIDO': 'Convertido',
        }

        return [
            {
                "telefono": row.telefono,
                "nombre": row.nombre_whatsapp or "",
                "estado": ESTADO_LABELS.get(row.estado, row.estado),
                "estado_raw": row.estado,
                "tipo_interes": TIPO_LABELS.get(row.tipo_interes, row.tipo_interes or ""),
                "origen": (row.origen_lead or "ORGANICO") if tiene_origen else "ORGANICO",
                "motivo_descarte": row._mapping.get("motivo_descarte") or "",
                "comentario_descarte": row.comentario_descarte or "",
                "fecha_recepcion": row.fecha_recepcion.strftime("%Y-%m-%d %H:%M") if row.fecha_recepcion else "",
                "fecha_gestion": row.fecha_gestion.strftime("%Y-%m-%d %H:%M") if row.fecha_gestion else "",
                "fecha_cierre": row.fecha_cierre.strftime("%Y-%m-%d %H:%M") if row.fecha_cierre else "",
                "comercial": (row._mapping.get("comercial").split()[0] if row._mapping.get("comercial") else "Sin asignar"),
            }
            for row in rows
        ]

    # =========================================================================
    # E. Detalle de Base de Datos (para exportación Excel)
    # =========================================================================

    async def get_detalle_base_datos(self, dt_inicio: datetime, dt_fin: datetime, comercial_ids: list = None, empresa: str = None) -> list[dict]:
        """Retorna filas individuales de HistorialLlamada para exportar a Excel."""

        condicion = and_(
            HistorialLlamada.updated_at >= dt_inicio,
            HistorialLlamada.updated_at <= dt_fin,
        )

        stmt = (
            select(
                ClienteContacto.ruc.label("ruc"),
                func.coalesce(Cliente.razon_social, "Sin razón social").label("razon_social"),
                ClienteContacto.telefono,
                CasoLlamada.contestado.label("contesto"),
                CasoLlamada.nombre.label("caso"),
                CasoLlamada.gestionable.label("efectiva"),
                HistorialLlamada.comentario,
                Empleado.nombres.label("comercial"),
                HistorialLlamada.created_at.label("fecha_llamada"),
            )
            .join(ClienteContacto, HistorialLlamada.contacto_id == ClienteContacto.id)
            .outerjoin(Cliente, ClienteContacto.ruc == Cliente.ruc)
            .join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id)
            .join(Usuario, HistorialLlamada.comercial_id == Usuario.id)
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            .where(condicion)
            .order_by(HistorialLlamada.created_at.desc())
        )

        if comercial_ids is not None:
            stmt = stmt.where(HistorialLlamada.comercial_id.in_(comercial_ids))
        if empresa:
            stmt = stmt.where(Empleado.empresa == empresa)

        rows = (await self.db.execute(stmt)).all()

        return [
            {
                "RUC": row.ruc or "",
                "Razón Social": row.razon_social,
                "Teléfono": row.telefono or "",
                "Contestó": "Sí" if row.contesto else "No",
                "Efectiva": "Sí" if row.efectiva else "No",
                "Caso": row.caso or "",
                "Comentario": row.comentario or "",
                "Comercial": (row.comercial.split()[0] if row.comercial else "Sin asignar"),
                "Fecha y Hora": row.fecha_llamada.strftime("%Y-%m-%d %H:%M") if row.fecha_llamada else "",
            }
            for row in rows
        ]

    # =========================================================================
    # F. Detalle de Mantenimiento de Cartera (para exportación Excel)
    # =========================================================================

    async def get_detalle_cartera(self, dt_inicio: datetime, dt_fin: datetime, comercial_ids: list = None, empresa: str = None) -> list[dict]:
        """Retorna filas individuales de ClienteGestion para exportar a Excel."""
        from app.models.comercial_catalogos import MotivoGestion

        condicion = and_(
            ClienteGestion.created_at >= dt_inicio,
            ClienteGestion.created_at <= dt_fin,
        )

        stmt = (
            select(
                Cliente.ruc,
                Cliente.razon_social,
                MotivoGestion.nombre.label("motivo"),
                ClienteGestion.comentario,
                Empleado.nombres.label("comercial"),
                ClienteGestion.created_at.label("fecha"),
            )
            .select_from(ClienteGestion)
            .join(Cliente, ClienteGestion.cliente_id == Cliente.id)
            .join(MotivoGestion, ClienteGestion.motivo_id == MotivoGestion.id)
            .join(Usuario, Cliente.comercial_encargado_id == Usuario.id)
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            .where(condicion)
            .order_by(ClienteGestion.created_at.desc())
        )

        if comercial_ids is not None:
            stmt = stmt.where(Cliente.comercial_encargado_id.in_(comercial_ids))
        if empresa:
            stmt = stmt.where(Empleado.empresa == empresa)

        rows = (await self.db.execute(stmt)).all()

        MOTIVO_LABELS = {
            "SEGUIMIENTO_CARGA": "Seguimiento de carga",
            "FIDELIZACION": "Fidelización",
            "DUDAS_CLIENTE": "Dudas del cliente",
            "QUIERE_COTIZACION": "Quiere cotización",
        }

        return [
            {
                "RUC": row.ruc or "",
                "Razón Social": row.razon_social or "",
                "Motivo de gestión": MOTIVO_LABELS.get(row.motivo, row.motivo or ""),
                "Comentario": row.comentario or "",
                "Comercial": (row.comercial.split()[0] if row.comercial else "Sin asignar"),
                "Fecha": row.fecha.strftime("%Y-%m-%d %H:%M") if row.fecha else "",
            }
            for row in rows
        ]

