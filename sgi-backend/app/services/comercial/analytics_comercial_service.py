import logging
import io
import pandas as pd
from typing import List, Optional
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.orm import joinedload

from app.models.comercial import Cliente
from app.models.comercial_catalogos import EstadoCliente
from app.models.cliente_gestion import ClienteGestion
from app.models.cliente_historial import ClienteHistorial
from app.models.orden import Orden
from app.models.seguridad import Usuario, Rol
from app.models.administrativo import Empleado
from app.models.seguimiento import Seguimiento, Cotizacion
from app.schemas.comercial.analytics_comercial import (
    RadarResponse, RadarKPIs, ProgresoComercial, PipelineComercial, AlertaClienteMuerto,
    EmbudoResponse, EtapaEmbudo, TiempoPromedio, MotivoCaida, EfectividadOrigen,
    # Cotizaciones
    CotizacionesAnalyticsResponse, CotizacionesKpis, ComercialCotizacionesRendimiento,
    DistribucionCarga, DistribucionOperacion, DistribucionSegmentacion, TopMotivoCaida,
    EmpresaCotizacionesRendimiento
)

logger = logging.getLogger(__name__)

class AnalyticsComercialService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _parse_periodo(self, periodo: str) -> tuple[datetime, datetime]:
        """Convierte 'YYYY-MM' en inicio y fin del mes."""
        try:
            inicio = datetime.strptime(periodo, "%Y-%m")
            fin = inicio + relativedelta(months=1) - timedelta(microseconds=1)
            return inicio, fin
        except ValueError:
            ahora = datetime.now()
            inicio = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            fin = inicio + relativedelta(months=1) - timedelta(microseconds=1)
            return inicio, fin

    async def _get_usuarios_comerciales(self, comercial_ids: Optional[List[int]]) -> List[Usuario]:
        """Obtiene usuarios comerciales y sus empleados."""
        query = select(Usuario).outerjoin(Empleado, Usuario.empleado_id == Empleado.id).options(
            joinedload(Usuario.empleado).joinedload(Empleado.jefe)
        ).where(
            Usuario.is_active == True,
            Usuario.roles.any(Rol.nombre.in_(["comercial", "jefa_comercial", "jefe_comercial", "COMERCIAL", "JEFE_COMERCIAL", "JEFA_COMERCIAL"]))
        )
        if comercial_ids:
            query = query.where(Usuario.id.in_(comercial_ids))
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_radar_data(self, periodo: str, comercial_ids: Optional[List[int]] = None, cliente_id: Optional[int] = None) -> RadarResponse:
        """
        Obtiene datos para el tablero Radar Comercial.
        """
        inicio_mes, fin_mes = self._parse_periodo(periodo)
        usuarios = await self._get_usuarios_comerciales(comercial_ids)
        ids_usuarios = [u.id for u in usuarios]
        
        # 1. KPIs Globales
        meta_individual = 20
        meta_equipo = len(ids_usuarios) * meta_individual

        # Gestiones Totales del mes
        q_gestiones = select(func.count(ClienteGestion.id)).where(
            ClienteGestion.created_at >= inicio_mes,
            ClienteGestion.created_at <= fin_mes
        )
        if ids_usuarios or cliente_id:
            q_gestiones = q_gestiones.join(Cliente, ClienteGestion.cliente_id == Cliente.id)
            if ids_usuarios:
                q_gestiones = q_gestiones.where(Cliente.comercial_encargado_id.in_(ids_usuarios))
            if cliente_id:
                q_gestiones = q_gestiones.where(Cliente.id == cliente_id)
        
        total_gestiones = (await self.db.execute(q_gestiones)).scalar() or 0

        # Clientes Nuevos
        q_clientes = select(func.count(Cliente.id)).where(
            Cliente.created_at >= inicio_mes,
            Cliente.created_at <= fin_mes
        )
        if ids_usuarios:
            q_clientes = q_clientes.where(Cliente.comercial_encargado_id.in_(ids_usuarios))
        if cliente_id:
            q_clientes = q_clientes.where(Cliente.id == cliente_id)
            
        clientes_nuevos = (await self.db.execute(q_clientes)).scalar() or 0

        # 2. Órdenes vs Meta
        q_ordenes = select(
            Orden.comercial_id,
            func.sum(case((Orden.tipo_servicio == 'LOGISTICO', 1), else_=0)).label('logistico'),
            func.sum(case((Orden.tipo_servicio == 'ADUANAS', 1), else_=0)).label('aduanas'),
            func.sum(case((Orden.tipo_servicio == 'INTEGRAL', 1), else_=0)).label('integral'),
            func.count(Orden.id).label('total')
        ).where(
            Orden.periodo == periodo,
            Orden.es_casa == False
        )
        if ids_usuarios:
            q_ordenes = q_ordenes.where(Orden.comercial_id.in_(ids_usuarios))
        if cliente_id:
            q_ordenes = q_ordenes.where(Orden.cliente_id == cliente_id)
        q_ordenes = q_ordenes.group_by(Orden.comercial_id)
        
        res_ordenes = (await self.db.execute(q_ordenes)).all()
        ordenes_map = {row.comercial_id: row for row in res_ordenes}

        progreso_list = []
        for u in usuarios:
            stats = ordenes_map.get(u.id)
            logistico = stats.logistico if stats else 0
            aduanas = stats.aduanas if stats else 0
            integral = stats.integral if stats else 0
            total_ord = stats.total if stats else 0
            porcentaje = min(round((total_ord / meta_individual) * 100, 1), 100.0) if meta_individual > 0 else 0.0
            
            # Obtener nombre e iniciales
            res_emp = await self.db.execute(select(Empleado).where(Empleado.id == u.empleado_id))
            empleado = res_emp.scalar_one_or_none()
            nombre = f"{empleado.nombres} {empleado.apellido_paterno}" if empleado else u.correo_corp
            iniciales = empleado.iniciales_sispac if empleado else None
            
            progreso_list.append(ProgresoComercial(
                comercial_id=u.id,
                nombre=nombre,
                iniciales=iniciales,
                ordenes_logistico=logistico,
                ordenes_aduanas=aduanas,
                ordenes_integral=integral,
                total_ordenes=total_ord,
                meta=meta_individual,
                porcentaje=porcentaje
            ))

        # 3. Pipeline - usar JOINs a estado_cliente
        estados_result = await self.db.execute(select(EstadoCliente.id, EstadoCliente.nombre))
        em = {row.nombre: row.id for row in estados_result.all()}

        q_pipe = select(
            Cliente.comercial_encargado_id,
            func.sum(case((Cliente.estado_id == em.get('PROSPECTO', 0), 1), else_=0)).label('prospectos'),
            func.sum(case((Cliente.estado_id == em.get('EN_NEGOCIACION', 0), 1), else_=0)).label('negociacion'),
            func.sum(case((Cliente.estado_id == em.get('CERRADA', 0), 1), else_=0)).label('cerrada'),
            func.sum(case((Cliente.estado_id == em.get('EN_OPERACION', 0), 1), else_=0)).label('operacion'),
            func.sum(case((Cliente.estado_id == em.get('CARGA_ENTREGADA', 0), 1), else_=0)).label('carga_entregada')
        ).where(
            Cliente.is_active == True,
            Cliente.estado_id.notin_([em.get('CAIDO', 0), em.get('INACTIVO', 0)]),
            Cliente.comercial_encargado_id.in_(ids_usuarios) if ids_usuarios else True
        )
        if cliente_id:
            q_pipe = q_pipe.where(Cliente.id == cliente_id)
        q_pipe = q_pipe.group_by(Cliente.comercial_encargado_id)
        
        res_pipe = (await self.db.execute(q_pipe)).all()
        pipe_map = {row.comercial_encargado_id: row for row in res_pipe}
        
        pipeline_list = []
        for u in usuarios:
            stats = pipe_map.get(u.id)
            res_emp = await self.db.execute(select(Empleado).where(Empleado.id == u.empleado_id))
            empleado = res_emp.scalar_one_or_none()
            nombre = f"{empleado.nombres} {empleado.apellido_paterno}" if empleado else u.correo_corp
            
            pipeline_list.append(PipelineComercial(
                comercial_id=u.id,
                nombre=nombre,
                prospectos=stats.prospectos if stats else 0,
                negociacion=stats.negociacion if stats else 0,
                cerrada=stats.cerrada if stats else 0,
                operacion=stats.operacion if stats else 0,
                carga_entregada=stats.carga_entregada if stats else 0
            ))

        # 4. Alertas Clientes Muertos (sin contacto > 15 dias, activos, no caídos, no en carga entregada)
        fecha_limite = datetime.now() - timedelta(days=15)
        q_alertas = select(Cliente, Usuario, Empleado).join(
            Usuario, Usuario.id == Cliente.comercial_encargado_id
        ).join(
            Empleado, Empleado.id == Usuario.empleado_id
        ).where(
            Cliente.is_active == True,
            Cliente.estado_id.notin_([em.get('CAIDO', 0), em.get('INACTIVO', 0), em.get('CARGA_ENTREGADA', 0)]),
            or_(Cliente.updated_at < fecha_limite, Cliente.updated_at == None)
        )
        if ids_usuarios:
            q_alertas = q_alertas.where(Cliente.comercial_encargado_id.in_(ids_usuarios))
        if cliente_id:
            q_alertas = q_alertas.where(Cliente.id == cliente_id)
            
        q_alertas = q_alertas.order_by(
            case((Cliente.updated_at == None, 0), else_=1),
            Cliente.updated_at.asc()
        ).limit(20)
        res_alertas = (await self.db.execute(q_alertas)).all()
        
        alertas_list = []
        for c, u, e in res_alertas:
            dias_sin_contacto = (datetime.now().date() - c.updated_at.replace(tzinfo=None).date()).days if c.updated_at else 999
            alertas_list.append(AlertaClienteMuerto(
                cliente_id=c.id,
                cliente_nombre=c.razon_social,
                comercial_id=u.id,
                comercial_nombre=f"{e.nombres} {e.apellido_paterno}",
                dias_sin_contacto=dias_sin_contacto
            ))

        return RadarResponse(
            kpis=RadarKPIs(
                meta_ordenes_equipo=meta_equipo,
                meta_individual=meta_individual,
                total_gestiones=total_gestiones,
                clientes_nuevos=clientes_nuevos
            ),
            progreso_comerciales=progreso_list,
            pipeline_comerciales=pipeline_list,
            alertas_clientes_muertos=alertas_list
        )

    async def get_embudo_data(self, periodo: str, comercial_ids: Optional[List[int]] = None, cliente_id: Optional[int] = None) -> EmbudoResponse:
        """
        Obtiene datos para el tablero de Embudo y Diagnóstico.
        """
        inicio_mes, fin_mes = self._parse_periodo(periodo)
        
        # Obtener mapa de estados
        estados_result = await self.db.execute(select(EstadoCliente.id, EstadoCliente.nombre))
        em = {row.nombre: row.id for row in estados_result.all()}
        
        # 1. Pipeline global para embudo (de todos los activos)
        q_funnel = select(
            func.sum(case((Cliente.estado_id == em.get('PROSPECTO', 0), 1), else_=0)).label('prospectos'),
            func.sum(case((Cliente.estado_id == em.get('EN_NEGOCIACION', 0), 1), else_=0)).label('negociacion'),
            func.sum(case((Cliente.estado_id == em.get('CERRADA', 0), 1), else_=0)).label('cerrada'),
            func.sum(case((Cliente.estado_id == em.get('EN_OPERACION', 0), 1), else_=0)).label('operacion')
        ).where(Cliente.is_active == True, Cliente.estado_id.notin_([em.get('CAIDO', 0), em.get('INACTIVO', 0)]))
        
        if comercial_ids:
            q_funnel = q_funnel.where(Cliente.comercial_encargado_id.in_(comercial_ids))
        if cliente_id:
            q_funnel = q_funnel.where(Cliente.id == cliente_id)
            
        res_funnel = (await self.db.execute(q_funnel)).first()
        
        c_prospectos = res_funnel.prospectos or 0
        c_neg = res_funnel.negociacion or 0
        c_cer = res_funnel.cerrada or 0
        c_ope = res_funnel.operacion or 0
        
        embudo_list = [
            EtapaEmbudo(etapa="Prospecto", cantidad=c_prospectos, porcentaje_retencion=100.0),
            EtapaEmbudo(etapa="Negociación", cantidad=c_neg, porcentaje_retencion=round((c_neg/c_prospectos*100) if c_prospectos>0 else 0, 1)),
            EtapaEmbudo(etapa="Cerrada", cantidad=c_cer, porcentaje_retencion=round((c_cer/c_neg*100) if c_neg>0 else 0, 1)),
            EtapaEmbudo(etapa="Operación", cantidad=c_ope, porcentaje_retencion=round((c_ope/c_cer*100) if c_cer>0 else 0, 1))
        ]

        # 2. Tiempos Promedio por Etapa (historial del mes actual)
        q_tiempos = select(
            EstadoCliente.nombre,
            func.avg(ClienteHistorial.tiempo_en_estado_anterior).label('promedio')
        ).join(
            ClienteHistorial, ClienteHistorial.estado_anterior_id == EstadoCliente.id
        ).where(
            ClienteHistorial.created_at >= inicio_mes,
            ClienteHistorial.created_at <= fin_mes,
            ClienteHistorial.tiempo_en_estado_anterior != None
        )
        if comercial_ids or cliente_id:
            q_tiempos = q_tiempos.join(Cliente, Cliente.id == ClienteHistorial.cliente_id)
            if comercial_ids:
                q_tiempos = q_tiempos.where(Cliente.comercial_encargado_id.in_(comercial_ids))
            if cliente_id:
                q_tiempos = q_tiempos.where(Cliente.id == cliente_id)
            
        q_tiempos = q_tiempos.group_by(EstadoCliente.nombre)
        res_tiempos = (await self.db.execute(q_tiempos)).all()
        tiempos_list = [TiempoPromedio(etapa=row.nombre, dias_promedio=round(row.promedio / 1440, 1)) for row in res_tiempos]  # minutos -> dias

        # 3. Top Motivos Caída (de los caídos en el mes)
        q_caida = select(
            ClienteHistorial.motivo,
            func.count(ClienteHistorial.id).label('cantidad')
        ).where(
            ClienteHistorial.estado_nuevo_id == em.get('CAIDO', 0),
            ClienteHistorial.motivo != None,
            ClienteHistorial.created_at >= inicio_mes,
            ClienteHistorial.created_at <= fin_mes
        )
        if comercial_ids or cliente_id:
            q_caida = q_caida.join(Cliente, Cliente.id == ClienteHistorial.cliente_id)
            if comercial_ids:
                q_caida = q_caida.where(Cliente.comercial_encargado_id.in_(comercial_ids))
            if cliente_id:
                q_caida = q_caida.where(Cliente.id == cliente_id)
            
        q_caida = q_caida.group_by(ClienteHistorial.motivo).order_by(func.count(ClienteHistorial.id).desc()).limit(5)
        res_caidas = (await self.db.execute(q_caida)).all()
        
        total_caidas = sum(r.cantidad for r in res_caidas)
        caidas_list = []
        for row in res_caidas:
            porcentaje = round((row.cantidad / total_caidas * 100), 1) if total_caidas > 0 else 0.0
            caidas_list.append(MotivoCaida(motivo=row.motivo, cantidad=row.cantidad, porcentaje=porcentaje))

        # 4. Efectividad por Origen
        # TODO: Implementar efectividad real por origen de cliente cuando se tenga la data
        efectividad_list: list = []

        return EmbudoResponse(
            embudo_conversion=embudo_list,
            tiempos_promedio=tiempos_list,
            motivos_caida=caidas_list,
            efectividad_origen=efectividad_list
        )

    # =========================================================================
    # ANALYTICS DE COTIZACIONES Y KANBAN COMERCIAL
    # =========================================================================

    async def get_cotizaciones_analytics(
        self, 
        fecha_inicio: date, 
        fecha_fin: date, 
        comercial_ids: Optional[List[int]] = None,
        cliente_id: Optional[int] = None
    ) -> CotizacionesAnalyticsResponse:
        """
        Calcula las métricas de rendimiento y distribución del Kanban de cotizaciones
        en un rango de fechas de creación de tarjetas.
        """
        inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
        fin_dt = datetime.combine(fecha_fin, datetime.max.time())

        # 1. Obtener comerciales habilitados
        usuarios = await self._get_usuarios_comerciales(comercial_ids)
        ids_usuarios = [u.id for u in usuarios]

        if not ids_usuarios:
            return CotizacionesAnalyticsResponse(
                kpis=CotizacionesKpis(total_tarjetas=0, total_cotizaciones=0, total_ganadas=0, total_perdidas=0, tasa_conversion=0.0),
                rendimiento_comerciales=[],
                rendimiento_empresas=[],
                distribucion_carga=[],
                distribucion_operacion=[],
                distribucion_segmentacion=[],
                motivos_caida=[]
            )

        # 2. Consultar las tarjetas creadas en el periodo
        query = select(Seguimiento).where(
            Seguimiento.is_active == True,
            Seguimiento.created_at >= inicio_dt,
            Seguimiento.created_at <= fin_dt,
            Seguimiento.comercial_id.in_(ids_usuarios)
        )
        if cliente_id:
            query = query.where(Seguimiento.cliente_id == cliente_id)
            
        res = await self.db.execute(query)
        seguimientos = res.scalars().all()

        total_tarjetas = len(seguimientos)
        total_cotizaciones = 0
        total_ganadas = 0
        total_perdidas = 0

        comercial_stats = {
            uid: {
                "creadas": 0,
                "ganadas": 0,
                "caidas": 0,
                "pendientes": 0
            } for uid in ids_usuarios
        }
        
        empresa_stats = {}

        carga_counts = {}
        operacion_counts = {}
        segmentacion_counts = {}
        motivos_caida_counts = {}

        # 3. Procesar en memoria
        for seg in seguimientos:
            uid = seg.comercial_id
            # Usar propiedades con fallback a campos temporales
            cid = seg.cliente_id or f"temp_{seg.id}"
            c_name = seg.cliente_razon_social or "Prospecto sin nombre"
            
            # Inicializar stats por empresa
            if cid not in empresa_stats:
                empresa_stats[cid] = {
                    "nombre": c_name,
                    "creadas": 0,
                    "ganadas": 0,
                    "caidas": 0,
                    "pendientes": 0
                }

            if uid in comercial_stats:
                comercial_stats[uid]["creadas"] += 1
            empresa_stats[cid]["creadas"] += 1

            if seg.estado == "CIERRE":
                total_ganadas += 1
                if uid in comercial_stats:
                    comercial_stats[uid]["ganadas"] += 1
                empresa_stats[cid]["ganadas"] += 1
            elif seg.estado == "CAIDO":
                total_perdidas += 1
                if uid in comercial_stats:
                    comercial_stats[uid]["caidas"] += 1
                empresa_stats[cid]["caidas"] += 1
                if seg.motivo_caida:
                    motivo = seg.motivo_caida.strip()
                    motivos_caida_counts[motivo] = motivos_caida_counts.get(motivo, 0) + 1

            for cot in seg.cotizaciones:
                if not cot.is_active:
                    continue
                total_cotizaciones += 1

                # Tipo de Carga
                tc_nombre = cot.tipo_carga_nombre or "OTRO"
                carga_counts[tc_nombre] = carga_counts.get(tc_nombre, 0) + 1

                # Tipo de Operación
                top_nombre = cot.tipo_operacion or "IMPORTACION"
                operacion_counts[top_nombre] = operacion_counts.get(top_nombre, 0) + 1

                # Cotizaciones pendientes
                if cot.estado == "PENDIENTE":
                    if uid in comercial_stats:
                        comercial_stats[uid]["pendientes"] += 1
                    empresa_stats[cid]["pendientes"] += 1

                # Segmentación/Atribución en cierres aceptados
                if cot.estado == "ACEPTADO" and cot.segmentacion_nombre:
                    seg_nombre = cot.segmentacion_nombre.replace("_", " ")
                    segmentacion_counts[seg_nombre] = segmentacion_counts.get(seg_nombre, 0) + 1

        tasa_conversion_global = 0.0
        conclusiones = total_ganadas + total_perdidas
        if conclusiones > 0:
            tasa_conversion_global = round((total_ganadas / conclusiones) * 100, 1)

        kpis = CotizacionesKpis(
            total_tarjetas=total_tarjetas,
            total_cotizaciones=total_cotizaciones,
            total_ganadas=total_ganadas,
            total_perdidas=total_perdidas,
            tasa_conversion=tasa_conversion_global
        )

        # 4. Formatear Rendimiento por Comercial
        rendimiento_comerciales = []
        for u in usuarios:
            stats = comercial_stats.get(u.id, {"creadas": 0, "ganadas": 0, "caidas": 0, "pendientes": 0})
            creados = stats["creadas"]
            ganados = stats["ganadas"]
            caidos = stats["caidas"]
            pendientes = stats["pendientes"]

            conclusiones_ind = ganados + caidos
            tasa_efectividad = 0.0
            if conclusiones_ind > 0:
                tasa_efectividad = round((ganados / conclusiones_ind) * 100, 1)

            empleado = u.empleado
            nombre = f"{empleado.nombres} {empleado.apellido_paterno}" if empleado else u.correo_corp
            iniciales = empleado.iniciales_sispac if empleado else None

            jefe_id = empleado.jefe.id if (empleado and empleado.jefe) else None
            jefe_nombre = f"{empleado.jefe.nombres} {empleado.jefe.apellido_paterno}" if (empleado and empleado.jefe) else None

            rendimiento_comerciales.append(ComercialCotizacionesRendimiento(
                comercial_id=u.id,
                nombre=nombre,
                iniciales=iniciales,
                cotizados_creados=creados,
                cierres_exitosos=ganados,
                negociaciones_caidas=caidos,
                tasa_efectividad=tasa_efectividad,
                cotizaciones_pendientes=pendientes,
                jefe_id=jefe_id,
                jefe_nombre=jefe_nombre
            ))
            
        # 4b. Formatear Rendimiento por Empresa (Cliente)
        rendimiento_empresas = []
        for cid, stats in empresa_stats.items():
            creados = stats["creadas"]
            ganados = stats["ganadas"]
            caidos = stats["caidas"]
            pendientes = stats["pendientes"]

            conclusiones_ind = ganados + caidos
            tasa_efectividad = 0.0
            if conclusiones_ind > 0:
                tasa_efectividad = round((ganados / conclusiones_ind) * 100, 1)

            rendimiento_empresas.append(EmpresaCotizacionesRendimiento(
                cliente_id=cid,
                nombre=stats["nombre"],
                cotizados_creados=creados,
                cierres_exitosos=ganados,
                negociaciones_caidas=caidos,
                tasa_efectividad=tasa_efectividad,
                cotizaciones_pendientes=pendientes
            ))
        rendimiento_empresas.sort(key=lambda x: x.cotizados_creados, reverse=True)

        # 5. Formatear distribuciones
        dist_carga = []
        for tc, cant in carga_counts.items():
            pct = round((cant / total_cotizaciones * 100), 1) if total_cotizaciones > 0 else 0.0
            dist_carga.append(DistribucionCarga(tipo_carga_nombre=tc, cantidad=cant, porcentaje=pct))
        dist_carga.sort(key=lambda x: x.cantidad, reverse=True)

        dist_op = []
        for top, cant in operacion_counts.items():
            pct = round((cant / total_cotizaciones * 100), 1) if total_cotizaciones > 0 else 0.0
            dist_op.append(DistribucionOperacion(tipo_operacion=top, cantidad=cant, porcentaje=pct))
        dist_op.sort(key=lambda x: x.cantidad, reverse=True)

        dist_seg = []
        total_aceptadas = sum(segmentacion_counts.values())
        for seg_n, cant in segmentacion_counts.items():
            pct = round((cant / total_aceptadas * 100), 1) if total_aceptadas > 0 else 0.0
            dist_seg.append(DistribucionSegmentacion(segmentacion_nombre=seg_n, cantidad=cant, porcentaje=pct))
        dist_seg.sort(key=lambda x: x.cantidad, reverse=True)

        dist_mot = []
        total_mot_caidas = sum(motivos_caida_counts.values())
        for mot, cant in motivos_caida_counts.items():
            pct = round((cant / total_mot_caidas * 100), 1) if total_mot_caidas > 0 else 0.0
            dist_mot.append(TopMotivoCaida(motivo=mot, cantidad=cant, porcentaje=pct))
        dist_mot.sort(key=lambda x: x.cantidad, reverse=True)
        dist_mot = dist_mot[:5]

        return CotizacionesAnalyticsResponse(
            kpis=kpis,
            rendimiento_comerciales=rendimiento_comerciales,
            rendimiento_empresas=rendimiento_empresas,
            distribucion_carga=dist_carga,
            distribucion_operacion=dist_op,
            distribucion_segmentacion=dist_seg,
            motivos_caida=dist_mot
        )

    async def export_cotizaciones_excel(
        self, 
        fecha_inicio: date, 
        fecha_fin: date, 
        comercial_ids: Optional[List[int]] = None,
        cliente_id: Optional[int] = None
    ) -> bytes:
        """
        Genera el reporte de cotizaciones en un archivo Excel en memoria (XLSX).
        """
        # 1. Obtener la data consolidada de resumen
        analytics_data = await self.get_cotizaciones_analytics(fecha_inicio, fecha_fin, comercial_ids, cliente_id=cliente_id)

        resumen_list = []
        for rc in analytics_data.rendimiento_comerciales:
            resumen_list.append({
                "Comercial": rc.nombre,
                "Iniciales": rc.iniciales or "",
                "Cotizados Creados": rc.cotizados_creados,
                "Cierres Exitosos (Ganados)": rc.cierres_exitosos,
                "Negociaciones Caídas (Perdidos)": rc.negociaciones_caidas,
                "Tasa de Efectividad (%)": rc.tasa_efectividad,
                "Cotizaciones Pendientes": rc.cotizaciones_pendientes
            })
        df_resumen = pd.DataFrame(resumen_list)

        # 2. Consultar seguimientos uniendo las relaciones cliente y comercial para evitar MissingGreenlet
        inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
        fin_dt = datetime.combine(fecha_fin, datetime.max.time())
        usuarios = await self._get_usuarios_comerciales(comercial_ids)
        ids_usuarios = [u.id for u in usuarios]

        query = select(Seguimiento).options(
            joinedload(Seguimiento.cliente),
            joinedload(Seguimiento.comercial)
        ).where(
            Seguimiento.is_active == True,
            Seguimiento.created_at >= inicio_dt,
            Seguimiento.created_at <= fin_dt,
            Seguimiento.comercial_id.in_(ids_usuarios)
        ).order_by(Seguimiento.created_at.desc())
        if cliente_id:
            query = query.where(Seguimiento.cliente_id == cliente_id)
        
        res = await self.db.execute(query)
        seguimientos = res.scalars().all()

        # Precargar empleados para evitar N+1 queries
        emp_ids = list(set(seg.comercial.empleado_id for seg in seguimientos if seg.comercial and seg.comercial.empleado_id))
        if emp_ids:
            res_emps = await self.db.execute(select(Empleado).where(Empleado.id.in_(emp_ids)))
            emp_map = {e.id: e for e in res_emps.scalars().all()}
        else:
            emp_map = {}

        tarjetas_list = []
        for seg in seguimientos:
            empleado = emp_map.get(seg.comercial.empleado_id) if seg.comercial else None
            com_nombre = f"{empleado.nombres} {empleado.apellido_paterno}" if empleado else (seg.comercial.correo_corp if seg.comercial else "Desconocido")

            tarjetas_list.append({
                "ID Tarjeta": seg.id,
                "Cliente Razón Social": seg.cliente_razon_social or "Prospecto",
                "Cliente RUC": seg.cliente_ruc or "",
                "Comercial Asignado": com_nombre,
                "Título / Carga": seg.titulo,
                "Estado Tarjeta": seg.estado,
                "Motivo de Caída": seg.motivo_caida or "",
                "Fecha Creación": seg.created_at.replace(tzinfo=None) if seg.created_at else ""
            })
        df_tarjetas = pd.DataFrame(tarjetas_list)

        # 3. Mapear detalle de cotizaciones individuales
        cotizaciones_list = []
        for seg in seguimientos:
            empleado = emp_map.get(seg.comercial.empleado_id) if seg.comercial else None
            com_nombre = f"{empleado.nombres} {empleado.apellido_paterno}" if empleado else (seg.comercial.correo_corp if seg.comercial else "Desconocido")

            for cot in seg.cotizaciones:
                if not cot.is_active:
                    continue
                cotizaciones_list.append({
                    "ID Tarjeta": seg.id,
                    "Cliente Razón Social": seg.cliente_razon_social or "Prospecto",
                    "Comercial Asignado": com_nombre,
                    "Tipo Carga": cot.tipo_carga_nombre or "",
                    "Tipo Servicio": cot.tipo_servicio_nombre or "",
                    "Vía de Operación": cot.tipo_operacion or "",
                    "País Origen": cot.pais_origen or "",
                    "Estado Cotización": cot.estado,
                    "Código COR (SISPAC)": cot.codigo_operacion or "",
                    "Segmentación Cierre": (cot.segmentacion_nombre or "").replace("_", " "),
                    "Fecha Cierre": cot.fecha_cierre if cot.fecha_cierre else "",
                    "Fecha Registro": cot.created_at.replace(tzinfo=None) if cot.created_at else ""
                })
        df_cotizaciones = pd.DataFrame(cotizaciones_list)

        # 4. Generar el Excel en memoria
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_resumen.to_excel(writer, sheet_name='Resumen Rendimiento', index=False)
            df_tarjetas.to_excel(writer, sheet_name='Detalle Tarjetas', index=False)
            df_cotizaciones.to_excel(writer, sheet_name='Detalle Cotizaciones', index=False)
            
            # Autoajustar anchos de columnas
            workbook = writer.book
            for sheet_name in writer.sheets:
                worksheet = writer.sheets[sheet_name]
                for col in worksheet.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    col_letter = col[0].column_letter
                    worksheet.column_dimensions[col_letter].width = max(max_len + 3, 12)

        return output.getvalue()
