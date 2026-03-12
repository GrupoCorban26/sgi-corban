"""
Servicio de Analytics del Buzón (WhatsApp + Web).
Consulta datos de Inbox (WhatsApp) y LeadWeb (Web) para generar
estadísticas unificadas de 3 niveles: General, Por Canal, Comparativo.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, and_, extract
from sqlalchemy.orm import selectinload
from app.models.comercial_inbox import Inbox
from app.models.lead_web import LeadWeb
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from typing import Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class AnalyticsBuzonService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def obtener_estadisticas(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        comercial_ids: Optional[list] = None,
    ) -> dict:
        """Genera estadísticas completas de 3 niveles para el dashboard del buzón."""

        # Si no se especifica rango, usar los últimos 6 meses
        if not fecha_hasta:
            fecha_hasta = datetime.now()
        if not fecha_desde:
            fecha_desde = fecha_hasta - timedelta(days=180)

        # Obtener datos crudos de ambos canales
        datos_wa = await self._obtener_datos_inbox(fecha_desde, fecha_hasta, comercial_ids)
        datos_web = await self._obtener_datos_lead_web(fecha_desde, fecha_hasta, comercial_ids)

        # Tendencia mensual combinada
        tendencia = await self._obtener_tendencia_mensual(fecha_desde, fecha_hasta, comercial_ids)

        # Rendimiento por comercial combinado (para nivel 3)
        rendimiento_comercial = await self._obtener_rendimiento_comparativo(
            fecha_desde, fecha_hasta, comercial_ids
        )

        # =====================================================
        # NIVEL 1 — VISTA GENERAL
        # =====================================================
        total_wa = datos_wa["total"]
        total_web = datos_web["total"]
        total_global = total_wa + total_web

        convertidos_wa = datos_wa["cierre"]
        convertidos_web = datos_web["convertidos"]
        total_convertidos = convertidos_wa + convertidos_web

        descartados_wa = datos_wa["descartados"]
        descartados_web = datos_web["descartados"]
        total_descartados = descartados_wa + descartados_web

        en_gestion_wa = datos_wa["en_gestion"]
        en_gestion_web = datos_web["en_gestion"]

        # Tiempo de respuesta promedio global
        tiempos = []
        if datos_wa["tiempo_promedio"] is not None:
            tiempos.append(datos_wa["tiempo_promedio"])
        if datos_web["tiempo_promedio"] is not None:
            tiempos.append(datos_web["tiempo_promedio"])
        tiempo_global = sum(tiempos) / len(tiempos) if tiempos else None

        general = {
            "total_leads": total_global,
            "total_convertidos": total_convertidos,
            "total_descartados": total_descartados,
            "total_en_gestion": en_gestion_wa + en_gestion_web,
            "tasa_conversion": round(
                (total_convertidos / total_global * 100) if total_global > 0 else 0, 1
            ),
            "tasa_descarte": round(
                (total_descartados / total_global * 100) if total_global > 0 else 0, 1
            ),
            "tiempo_respuesta_promedio_minutos": (
                round(tiempo_global / 60, 1) if tiempo_global else None
            ),
            "proporcion_canal": [
                {"name": "WhatsApp", "value": total_wa},
                {"name": "Web", "value": total_web},
            ],
            "tendencia_mensual": tendencia,
        }

        # =====================================================
        # NIVEL 2 — POR CANAL
        # =====================================================
        por_canal = {
            "whatsapp": {
                "total": total_wa,
                "nuevos": datos_wa["nuevos"],
                "pendientes": datos_wa["pendientes"],
                "en_gestion": datos_wa["en_gestion"],
                "cotizados": datos_wa["cotizados"],
                "cierre": datos_wa["cierre"],
                "descartados": datos_wa["descartados"],
                "tasa_conversion": round(
                    (convertidos_wa / total_wa * 100) if total_wa > 0 else 0, 1
                ),
                "tasa_descarte": round(
                    (descartados_wa / total_wa * 100) if total_wa > 0 else 0, 1
                ),
                "tiempo_respuesta_promedio_minutos": (
                    round(datos_wa["tiempo_promedio"] / 60, 1)
                    if datos_wa["tiempo_promedio"]
                    else None
                ),
                "motivos_descarte": datos_wa["motivos_descarte"],
                "leads_por_comercial": datos_wa["leads_por_comercial"],
            },
            "web": {
                "total": total_web,
                "nuevos": datos_web["nuevos"],
                "pendientes": datos_web["pendientes"],
                "en_gestion": datos_web["en_gestion"],
                "convertidos": datos_web["convertidos"],
                "descartados": datos_web["descartados"],
                "tasa_conversion": round(
                    (convertidos_web / total_web * 100) if total_web > 0 else 0, 1
                ),
                "tasa_descarte": round(
                    (descartados_web / total_web * 100) if total_web > 0 else 0, 1
                ),
                "tiempo_respuesta_promedio_minutos": (
                    round(datos_web["tiempo_promedio"] / 60, 1)
                    if datos_web["tiempo_promedio"]
                    else None
                ),
                "motivos_descarte": datos_web["motivos_descarte"],
                "leads_por_pagina": datos_web["leads_por_pagina"],
                "leads_por_comercial": datos_web["leads_por_comercial"],
            },
        }

        # =====================================================
        # NIVEL 3 — COMPARATIVO
        # =====================================================
        comparativo = {
            "metricas": [
                {
                    "metrica": "Tasa de Conversión (%)",
                    "whatsapp": por_canal["whatsapp"]["tasa_conversion"],
                    "web": por_canal["web"]["tasa_conversion"],
                },
                {
                    "metrica": "Tasa de Descarte (%)",
                    "whatsapp": por_canal["whatsapp"]["tasa_descarte"],
                    "web": por_canal["web"]["tasa_descarte"],
                },
                {
                    "metrica": "Tiempo Respuesta (min)",
                    "whatsapp": por_canal["whatsapp"]["tiempo_respuesta_promedio_minutos"] or 0,
                    "web": por_canal["web"]["tiempo_respuesta_promedio_minutos"] or 0,
                },
                {
                    "metrica": "Total Leads",
                    "whatsapp": float(total_wa),
                    "web": float(total_web),
                },
            ],
            "rendimiento_por_comercial": rendimiento_comercial,
        }

        return {
            "general": general,
            "por_canal": por_canal,
            "comparativo": comparativo,
        }

    # =================================================================
    # QUERIES PRIVADAS — INBOX (WhatsApp)
    # =================================================================

    async def _obtener_datos_inbox(
        self,
        fecha_desde: datetime,
        fecha_hasta: datetime,
        comercial_ids: Optional[list],
    ) -> dict:
        """Conteos y agregaciones del modelo Inbox."""

        base_filter = and_(
            Inbox.fecha_recepcion >= fecha_desde,
            Inbox.fecha_recepcion <= fecha_hasta,
        )

        # Conteos por estado en una sola query
        query_conteos = select(
            func.count().label("total"),
            func.sum(case((Inbox.estado == "NUEVO", 1), else_=0)).label("nuevos"),
            func.sum(case((Inbox.estado == "PENDIENTE", 1), else_=0)).label("pendientes"),
            func.sum(case((Inbox.estado == "EN_GESTION", 1), else_=0)).label("en_gestion"),
            func.sum(case((Inbox.estado == "COTIZADO", 1), else_=0)).label("cotizados"),
            func.sum(case((Inbox.estado == "CIERRE", 1), else_=0)).label("cierre"),
            func.sum(case((Inbox.estado == "DESCARTADO", 1), else_=0)).label("descartados"),
            func.avg(
                case(
                    (Inbox.tiempo_respuesta_segundos.isnot(None), Inbox.tiempo_respuesta_segundos),
                    else_=None,
                )
            ).label("tiempo_promedio"),
        ).where(base_filter)

        if comercial_ids is not None:
            query_conteos = query_conteos.where(Inbox.asignado_a.in_(comercial_ids))

        resultado = await self.db.execute(query_conteos)
        row = resultado.one()

        # Motivos de descarte
        query_motivos = (
            select(
                Inbox.motivo_descarte.label("name"),
                func.count().label("value"),
            )
            .where(
                and_(
                    base_filter,
                    Inbox.estado == "DESCARTADO",
                    Inbox.motivo_descarte.isnot(None),
                )
            )
            .group_by(Inbox.motivo_descarte)
            .order_by(func.count().desc())
        )
        if comercial_ids is not None:
            query_motivos = query_motivos.where(Inbox.asignado_a.in_(comercial_ids))

        motivos = await self.db.execute(query_motivos)
        motivos_lista = [
            {"name": r.name or "Sin especificar", "value": r.value}
            for r in motivos.all()
        ]

        # Leads por comercial
        leads_comercial = await self._leads_por_comercial_inbox(base_filter, comercial_ids)

        return {
            "total": row.total or 0,
            "nuevos": row.nuevos or 0,
            "pendientes": row.pendientes or 0,
            "en_gestion": row.en_gestion or 0,
            "cotizados": row.cotizados or 0,
            "cierre": row.cierre or 0,
            "descartados": row.descartados or 0,
            "tiempo_promedio": float(row.tiempo_promedio) if row.tiempo_promedio else None,
            "motivos_descarte": motivos_lista,
            "leads_por_comercial": leads_comercial,
        }

    async def _leads_por_comercial_inbox(
        self, base_filter, comercial_ids: Optional[list]
    ) -> list:
        """Rendimiento por comercial para Inbox."""
        query = (
            select(
                Inbox.asignado_a,
                func.count().label("total"),
                func.sum(case((Inbox.estado == "CIERRE", 1), else_=0)).label("convertidos"),
                func.sum(case((Inbox.estado == "DESCARTADO", 1), else_=0)).label("descartados"),
            )
            .where(and_(base_filter, Inbox.asignado_a.isnot(None)))
            .group_by(Inbox.asignado_a)
        )
        if comercial_ids is not None:
            query = query.where(Inbox.asignado_a.in_(comercial_ids))

        resultado = await self.db.execute(query)
        rows = resultado.all()

        salida = []
        for r in rows:
            nombre = await self._resolver_nombre_usuario(r.asignado_a)
            total = r.total or 0
            convertidos = r.convertidos or 0
            salida.append(
                {
                    "nombre": nombre,
                    "total": total,
                    "convertidos": convertidos,
                    "descartados": r.descartados or 0,
                    "tasa_conversion": round(
                        (convertidos / total * 100) if total > 0 else 0, 1
                    ),
                }
            )

        return sorted(salida, key=lambda x: x["total"], reverse=True)

    # =================================================================
    # QUERIES PRIVADAS — LEAD WEB
    # =================================================================

    async def _obtener_datos_lead_web(
        self,
        fecha_desde: datetime,
        fecha_hasta: datetime,
        comercial_ids: Optional[list],
    ) -> dict:
        """Conteos y agregaciones del modelo LeadWeb."""

        base_filter = and_(
            LeadWeb.fecha_recepcion >= fecha_desde,
            LeadWeb.fecha_recepcion <= fecha_hasta,
        )

        query_conteos = select(
            func.count().label("total"),
            func.sum(case((LeadWeb.estado == "NUEVO", 1), else_=0)).label("nuevos"),
            func.sum(case((LeadWeb.estado == "PENDIENTE", 1), else_=0)).label("pendientes"),
            func.sum(case((LeadWeb.estado == "EN_GESTION", 1), else_=0)).label("en_gestion"),
            func.sum(case((LeadWeb.estado == "CONVERTIDO", 1), else_=0)).label("convertidos"),
            func.sum(case((LeadWeb.estado == "DESCARTADO", 1), else_=0)).label("descartados"),
            func.avg(
                case(
                    (
                        LeadWeb.tiempo_respuesta_segundos.isnot(None),
                        LeadWeb.tiempo_respuesta_segundos,
                    ),
                    else_=None,
                )
            ).label("tiempo_promedio"),
        ).where(base_filter)

        if comercial_ids is not None:
            query_conteos = query_conteos.where(LeadWeb.asignado_a.in_(comercial_ids))

        resultado = await self.db.execute(query_conteos)
        row = resultado.one()

        # Motivos de descarte
        query_motivos = (
            select(
                LeadWeb.motivo_descarte.label("name"),
                func.count().label("value"),
            )
            .where(
                and_(
                    base_filter,
                    LeadWeb.estado == "DESCARTADO",
                    LeadWeb.motivo_descarte.isnot(None),
                )
            )
            .group_by(LeadWeb.motivo_descarte)
            .order_by(func.count().desc())
        )
        if comercial_ids is not None:
            query_motivos = query_motivos.where(LeadWeb.asignado_a.in_(comercial_ids))

        motivos = await self.db.execute(query_motivos)
        motivos_lista = [
            {"name": r.name or "Sin especificar", "value": r.value}
            for r in motivos.all()
        ]

        # Leads por página de origen
        query_paginas = (
            select(
                LeadWeb.pagina_origen.label("name"),
                func.count().label("value"),
            )
            .where(base_filter)
            .group_by(LeadWeb.pagina_origen)
            .order_by(func.count().desc())
        )
        if comercial_ids is not None:
            query_paginas = query_paginas.where(LeadWeb.asignado_a.in_(comercial_ids))

        paginas = await self.db.execute(query_paginas)
        paginas_lista = [{"name": r.name, "value": r.value} for r in paginas.all()]

        # Leads por comercial
        leads_comercial = await self._leads_por_comercial_web(base_filter, comercial_ids)

        return {
            "total": row.total or 0,
            "nuevos": row.nuevos or 0,
            "pendientes": row.pendientes or 0,
            "en_gestion": row.en_gestion or 0,
            "convertidos": row.convertidos or 0,
            "descartados": row.descartados or 0,
            "tiempo_promedio": float(row.tiempo_promedio) if row.tiempo_promedio else None,
            "motivos_descarte": motivos_lista,
            "leads_por_pagina": paginas_lista,
            "leads_por_comercial": leads_comercial,
        }

    async def _leads_por_comercial_web(
        self, base_filter, comercial_ids: Optional[list]
    ) -> list:
        """Rendimiento por comercial para LeadWeb."""
        query = (
            select(
                LeadWeb.asignado_a,
                func.count().label("total"),
                func.sum(case((LeadWeb.estado == "CONVERTIDO", 1), else_=0)).label(
                    "convertidos"
                ),
                func.sum(case((LeadWeb.estado == "DESCARTADO", 1), else_=0)).label(
                    "descartados"
                ),
            )
            .where(and_(base_filter, LeadWeb.asignado_a.isnot(None)))
            .group_by(LeadWeb.asignado_a)
        )
        if comercial_ids is not None:
            query = query.where(LeadWeb.asignado_a.in_(comercial_ids))

        resultado = await self.db.execute(query)
        rows = resultado.all()

        salida = []
        for r in rows:
            nombre = await self._resolver_nombre_usuario(r.asignado_a)
            total = r.total or 0
            convertidos = r.convertidos or 0
            salida.append(
                {
                    "nombre": nombre,
                    "total": total,
                    "convertidos": convertidos,
                    "descartados": r.descartados or 0,
                    "tasa_conversion": round(
                        (convertidos / total * 100) if total > 0 else 0, 1
                    ),
                }
            )

        return sorted(salida, key=lambda x: x["total"], reverse=True)

    # =================================================================
    # QUERIES COMBINADAS
    # =================================================================

    async def _obtener_tendencia_mensual(
        self,
        fecha_desde: datetime,
        fecha_hasta: datetime,
        comercial_ids: Optional[list],
    ) -> list:
        """Tendencia mensual combinada: leads por mes de ambos canales."""

        # WhatsApp por mes
        query_wa = (
            select(
                extract("year", Inbox.fecha_recepcion).label("anio"),
                extract("month", Inbox.fecha_recepcion).label("mes"),
                func.count().label("total"),
            )
            .where(
                and_(
                    Inbox.fecha_recepcion >= fecha_desde,
                    Inbox.fecha_recepcion <= fecha_hasta,
                )
            )
            .group_by(
                extract("year", Inbox.fecha_recepcion),
                extract("month", Inbox.fecha_recepcion),
            )
        )
        if comercial_ids is not None:
            query_wa = query_wa.where(Inbox.asignado_a.in_(comercial_ids))

        resultado_wa = await self.db.execute(query_wa)
        wa_por_mes = {(int(r.anio), int(r.mes)): r.total for r in resultado_wa.all()}

        # Web por mes
        query_web = (
            select(
                extract("year", LeadWeb.fecha_recepcion).label("anio"),
                extract("month", LeadWeb.fecha_recepcion).label("mes"),
                func.count().label("total"),
            )
            .where(
                and_(
                    LeadWeb.fecha_recepcion >= fecha_desde,
                    LeadWeb.fecha_recepcion <= fecha_hasta,
                )
            )
            .group_by(
                extract("year", LeadWeb.fecha_recepcion),
                extract("month", LeadWeb.fecha_recepcion),
            )
        )
        if comercial_ids is not None:
            query_web = query_web.where(LeadWeb.asignado_a.in_(comercial_ids))

        resultado_web = await self.db.execute(query_web)
        web_por_mes = {(int(r.anio), int(r.mes)): r.total for r in resultado_web.all()}

        # Combinar en lista ordenada
        meses_nombres = [
            "",
            "Ene",
            "Feb",
            "Mar",
            "Abr",
            "May",
            "Jun",
            "Jul",
            "Ago",
            "Sep",
            "Oct",
            "Nov",
            "Dic",
        ]

        todos_meses = sorted(set(list(wa_por_mes.keys()) + list(web_por_mes.keys())))
        tendencia = []
        for anio, mes in todos_meses:
            wa_count = wa_por_mes.get((anio, mes), 0)
            web_count = web_por_mes.get((anio, mes), 0)
            tendencia.append(
                {
                    "mes": f"{meses_nombres[mes]} {anio}",
                    "whatsapp": wa_count,
                    "web": web_count,
                    "total": wa_count + web_count,
                }
            )

        return tendencia

    async def _obtener_rendimiento_comparativo(
        self,
        fecha_desde: datetime,
        fecha_hasta: datetime,
        comercial_ids: Optional[list],
    ) -> list:
        """Rendimiento por comercial comparando ambos canales."""

        base_filter_wa = and_(
            Inbox.fecha_recepcion >= fecha_desde,
            Inbox.fecha_recepcion <= fecha_hasta,
            Inbox.asignado_a.isnot(None),
        )
        base_filter_web = and_(
            LeadWeb.fecha_recepcion >= fecha_desde,
            LeadWeb.fecha_recepcion <= fecha_hasta,
            LeadWeb.asignado_a.isnot(None),
        )

        # WhatsApp por comercial
        query_wa = (
            select(Inbox.asignado_a, func.count().label("total"))
            .where(base_filter_wa)
            .group_by(Inbox.asignado_a)
        )
        if comercial_ids is not None:
            query_wa = query_wa.where(Inbox.asignado_a.in_(comercial_ids))

        resultado_wa = await self.db.execute(query_wa)
        wa_por_comercial = {r.asignado_a: r.total for r in resultado_wa.all()}

        # Web por comercial
        query_web = (
            select(LeadWeb.asignado_a, func.count().label("total"))
            .where(base_filter_web)
            .group_by(LeadWeb.asignado_a)
        )
        if comercial_ids is not None:
            query_web = query_web.where(LeadWeb.asignado_a.in_(comercial_ids))

        resultado_web = await self.db.execute(query_web)
        web_por_comercial = {r.asignado_a: r.total for r in resultado_web.all()}

        # Combinar
        todos_ids = set(list(wa_por_comercial.keys()) + list(web_por_comercial.keys()))
        salida = []
        for uid in todos_ids:
            nombre = await self._resolver_nombre_usuario(uid)
            salida.append(
                {
                    "nombre": nombre,
                    "whatsapp": wa_por_comercial.get(uid, 0),
                    "web": web_por_comercial.get(uid, 0),
                    "total": wa_por_comercial.get(uid, 0) + web_por_comercial.get(uid, 0),
                }
            )

        return sorted(salida, key=lambda x: x["total"], reverse=True)

    # =================================================================
    # HELPERS
    # =================================================================

    async def _resolver_nombre_usuario(self, usuario_id: int) -> str:
        """Resuelve el nombre del usuario a partir de su ID."""
        query = (
            select(Usuario)
            .options(selectinload(Usuario.empleado))
            .where(Usuario.id == usuario_id)
        )
        resultado = await self.db.execute(query)
        usuario = resultado.scalar_one_or_none()

        if usuario and usuario.empleado:
            return f"{usuario.empleado.nombres} {usuario.empleado.apellido_paterno}"
        elif usuario:
            return usuario.correo_corp
        return f"Usuario #{usuario_id}"
