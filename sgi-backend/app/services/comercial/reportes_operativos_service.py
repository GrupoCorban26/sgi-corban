from sqlalchemy import select, func, or_, and_, Result, case
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime, timedelta
import calendar

from app.models.comercial import Cliente
from app.models.comercial import ClienteContacto, LoteContactos
from app.models.comercial_catalogos import EstadoCliente
from app.models.comercial_inbox import Inbox
from app.models.lead_web import LeadWeb
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.utils.horario_laboral import calcular_segundos_horario_laboral

from app.schemas.comercial.reportes import (
    ReporteBaseDatos, KPIBaseDatos, DetalleBaseDatos,
    ReporteMantenimientoCartera, KPIMantenimientoCartera, DetalleMantenimientoCartera,
    ReporteGestionLeads, KPIGestionLeads, DetalleGestionLeads
)

class ReportesOperativosService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_fechas_periodo(self, periodo: str) -> tuple[datetime, datetime]:
        """Convierte 'YYYY-MM' en fechas de inicio y fin del mes."""
        try:
            year, month = map(int, periodo.split('-'))
            start_date = datetime(year, month, 1)
            last_day = calendar.monthrange(year, month)[1]
            end_date = datetime(year, month, last_day, 23, 59, 59, 999999)
            return start_date, end_date
        except Exception:
            # Fallback a mes actual
            now = datetime.now()
            start_date = datetime(now.year, now.month, 1)
            last_day = calendar.monthrange(now.year, now.month)[1]
            end_date = datetime(now.year, now.month, last_day, 23, 59, 59, 999999)
            return start_date, end_date

    async def get_reporte_base_datos(self, periodo: str, comercial_id: Optional[int] = None) -> ReporteBaseDatos:
        start_date, end_date = self._get_fechas_periodo(periodo)
        
        # Filtro base
        filters = [Cliente.created_at >= start_date, Cliente.created_at <= end_date]
        if comercial_id:
            filters.append(Cliente.comercial_encargado_id == comercial_id)

        # Subquery para obtener el nombre del lote del contacto principal del cliente
        lote_subq = (
            select(LoteContactos.nombre)
            .select_from(ClienteContacto)
            .join(LoteContactos, ClienteContacto.lote_id == LoteContactos.id)
            .where(ClienteContacto.ruc == Cliente.ruc, ClienteContacto.is_active == True)
            .limit(1)
            .correlate(Cliente)
            .scalar_subquery()
            .label('lote_nombre')
        )

        # Consulta principal
        query = select(
            Cliente,
            EstadoCliente.nombre.label('estado_nombre'),
            Usuario.correo_corp,
            Empleado.nombres, Empleado.apellido_paterno,
            lote_subq
        ).outerjoin(
            EstadoCliente, Cliente.estado_id == EstadoCliente.id
        ).outerjoin(
            Usuario, Cliente.comercial_encargado_id == Usuario.id
        ).outerjoin(
            Empleado, Usuario.empleado_id == Empleado.id
        ).where(and_(*filters)).order_by(Cliente.created_at.desc())

        result: Result = await self.db.execute(query)
        rows = result.all()

        # Obtener IDs de estados "convertidos"
        estados_conv = await self.db.execute(
            select(EstadoCliente.id).where(EstadoCliente.nombre.notin_(['PROSPECTO', 'CAIDO', 'INACTIVO']))
        )
        ids_convertidos = {r.id for r in estados_conv.all()}

        total_leads = len(rows)
        leads_contactados = 0
        leads_convertidos = 0
        detalle = []

        for row in rows:
            cliente = row.Cliente
            comercial_nombre = f"{row.nombres or ''} {row.apellido_paterno or ''}".strip() or row.correo_corp
            
            if cliente.updated_at is not None:
                leads_contactados += 1
            if cliente.estado_id in ids_convertidos:
                leads_convertidos += 1

            detalle.append(DetalleBaseDatos(
                id=cliente.id,
                razon_social=cliente.razon_social,
                ruc=cliente.ruc,
                estado=row.estado_nombre,
                fecha_ingreso=cliente.created_at,
                comercial_nombre=comercial_nombre,
                lote_nombre=row.lote_nombre
            ))

        porc_contactabilidad = (leads_contactados / total_leads * 100) if total_leads > 0 else 0.0
        porc_conversion = (leads_convertidos / total_leads * 100) if total_leads > 0 else 0.0

        return ReporteBaseDatos(
            kpis=KPIBaseDatos(
                total_leads_ingresados=total_leads,
                leads_contactados=leads_contactados,
                porcentaje_contactabilidad=round(porc_contactabilidad, 2),
                leads_convertidos=leads_convertidos,
                porcentaje_conversion=round(porc_conversion, 2)
            ),
            detalle=detalle
        )

    async def get_reporte_mantenimiento_cartera(self, periodo: str, comercial_id: Optional[int] = None) -> ReporteMantenimientoCartera:
        start_date, end_date = self._get_fechas_periodo(periodo)
        
        # Obtener IDs de estados excluidos
        estados_excl = await self.db.execute(
            select(EstadoCliente.id).where(EstadoCliente.nombre.in_(['CAIDO', 'INACTIVO', 'PROSPECTO']))
        )
        ids_excluidos = [r.id for r in estados_excl.all()]
        
        filters = [Cliente.estado_id.notin_(ids_excluidos)]
        if comercial_id:
            filters.append(Cliente.comercial_encargado_id == comercial_id)

        query = select(
            Cliente,
            EstadoCliente.nombre.label('estado_nombre'),
            Usuario.correo_corp,
            Empleado.nombres, Empleado.apellido_paterno
        ).outerjoin(
            EstadoCliente, Cliente.estado_id == EstadoCliente.id
        ).outerjoin(
            Usuario, Cliente.comercial_encargado_id == Usuario.id
        ).outerjoin(
            Empleado, Usuario.empleado_id == Empleado.id
        ).where(and_(*filters)).order_by(
            case((Cliente.proxima_fecha_contacto == None, 1), else_=0),
            Cliente.proxima_fecha_contacto.asc()
        )

        result: Result = await self.db.execute(query)
        rows = result.all()

        clientes_activos = len(rows)
        clientes_recontactados = 0
        clientes_en_riesgo = 0
        detalle = []

        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)

        for row in rows:
            cliente = row.Cliente
            comercial_nombre = f"{row.nombres or ''} {row.apellido_paterno or ''}".strip() or row.correo_corp
            
            dias_sin_contacto = 0
            if cliente.updated_at:
                updated_naive = cliente.updated_at.replace(tzinfo=None) if cliente.updated_at.tzinfo else cliente.updated_at
                dias_sin_contacto = (now.date() - updated_naive.date()).days
                if start_date <= updated_naive <= end_date:
                    clientes_recontactados += 1
                if updated_naive < thirty_days_ago:
                    clientes_en_riesgo += 1
            else:
                dias_sin_contacto = (now.date() - (cliente.created_at.date() if cliente.created_at else now.date())).days
                clientes_en_riesgo += 1

            detalle.append(DetalleMantenimientoCartera(
                id=cliente.id,
                razon_social=cliente.razon_social,
                estado=row.estado_nombre,
                proxima_fecha_contacto=cliente.proxima_fecha_contacto,
                dias_sin_contacto=dias_sin_contacto,
                comercial_nombre=comercial_nombre
            ))

        porc_cobertura = (clientes_recontactados / clientes_activos * 100) if clientes_activos > 0 else 0.0
        porc_riesgo = (clientes_en_riesgo / clientes_activos * 100) if clientes_activos > 0 else 0.0

        return ReporteMantenimientoCartera(
            kpis=KPIMantenimientoCartera(
                clientes_activos=clientes_activos,
                clientes_recontactados=clientes_recontactados,
                porcentaje_cobertura=round(porc_cobertura, 2),
                clientes_en_riesgo=clientes_en_riesgo,
                porcentaje_riesgo=round(porc_riesgo, 2)
            ),
            detalle=detalle
        )

    async def get_reporte_gestion_leads(self, periodo: str, comercial_id: Optional[int] = None) -> ReporteGestionLeads:
        start_date, end_date = self._get_fechas_periodo(periodo)
        
        detalle = []
        leads_recibidos = 0
        leads_atendidos = 0
        leads_descartados = 0
        total_tiempo_segundos = 0
        conteo_tiempo = 0

        # === 1. INBOX (WhatsApp) ===
        inbox_filters = [Inbox.created_at >= start_date, Inbox.created_at <= end_date]
        if comercial_id:
            inbox_filters.append(Inbox.asignado_a == comercial_id)
            
        inbox_query = select(
            Inbox,
            Usuario.correo_corp,
            Empleado.nombres, Empleado.apellido_paterno
        ).outerjoin(
            Usuario, Inbox.asignado_a == Usuario.id
        ).outerjoin(
            Empleado, Usuario.empleado_id == Empleado.id
        ).where(and_(*inbox_filters))

        inbox_result = await self.db.execute(inbox_query)
        inbox_rows = inbox_result.all()

        for row in inbox_rows:
            lead = row.Inbox
            comercial_nombre = f"{row.nombres or ''} {row.apellido_paterno or ''}".strip() or row.correo_corp
            
            leads_recibidos += 1
            if lead.estado in ("EN_GESTION", "COTIZADO", "CERRADO", "DESCARTADO"):
                leads_atendidos += 1
            if lead.estado == "DESCARTADO":
                leads_descartados += 1
                
            tiempo_minutos = None
            if lead.fecha_gestion is not None and lead.fecha_recepcion is not None:
                diff_segundos = calcular_segundos_horario_laboral(lead.fecha_recepcion, lead.fecha_gestion)
                if diff_segundos >= 0:
                    tiempo_minutos = int(diff_segundos / 60)
                    total_tiempo_segundos += diff_segundos
                    conteo_tiempo += 1

            detalle.append(DetalleGestionLeads(
                id=lead.id,
                fuente="WhatsApp",
                nombre=lead.nombre_whatsapp or lead.telefono,
                estado=lead.estado,
                fecha_recepcion=lead.fecha_recepcion,
                tiempo_respuesta_minutos=tiempo_minutos,
                comercial_nombre=comercial_nombre
            ))

        # === 2. LEADS WEB ===
        web_filters = [LeadWeb.fecha_recepcion >= start_date, LeadWeb.fecha_recepcion <= end_date]
        if comercial_id:
            web_filters.append(LeadWeb.asignado_a == comercial_id)
            
        web_query = select(
            LeadWeb,
            Usuario.correo_corp,
            Empleado.nombres, Empleado.apellido_paterno
        ).outerjoin(
            Usuario, LeadWeb.asignado_a == Usuario.id
        ).outerjoin(
            Empleado, Usuario.empleado_id == Empleado.id
        ).where(and_(*web_filters))

        web_result = await self.db.execute(web_query)
        web_rows = web_result.all()

        for row in web_rows:
            lead = row.LeadWeb
            comercial_nombre = f"{row.nombres or ''} {row.apellido_paterno or ''}".strip() or row.correo_corp
            
            leads_recibidos += 1
            if lead.estado in ("EN_GESTION", "CERRADO", "DESCARTADO"):
                leads_atendidos += 1
            if lead.estado == "DESCARTADO":
                leads_descartados += 1
                
            tiempo_minutos = None
            if lead.tiempo_respuesta_segundos is not None:
                tiempo_minutos = int(lead.tiempo_respuesta_segundos / 60)
                total_tiempo_segundos += lead.tiempo_respuesta_segundos
                conteo_tiempo += 1

            detalle.append(DetalleGestionLeads(
                id=lead.id,
                fuente=f"Web ({lead.pagina_origen})",
                nombre=lead.nombre,
                estado=lead.estado,
                fecha_recepcion=lead.fecha_recepcion,
                tiempo_respuesta_minutos=tiempo_minutos,
                comercial_nombre=comercial_nombre
            ))

        # Sort detallado list by fecha_recepcion desc
        detalle.sort(key=lambda x: x.fecha_recepcion.replace(tzinfo=None) if x.fecha_recepcion else datetime.min, reverse=True)

        porc_atencion = (leads_atendidos / leads_recibidos * 100) if leads_recibidos > 0 else 0.0
        tiempo_promedio = (total_tiempo_segundos / conteo_tiempo / 60) if conteo_tiempo > 0 else 0.0

        return ReporteGestionLeads(
            kpis=KPIGestionLeads(
                leads_recibidos=leads_recibidos,
                leads_atendidos=leads_atendidos,
                porcentaje_atencion=round(porc_atencion, 2),
                tiempo_promedio_respuesta_minutos=round(tiempo_promedio, 2),
                leads_descartados=leads_descartados
            ),
            detalle=detalle
        )
