from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, desc
from datetime import date, datetime, timedelta
import io
import pandas as pd
from fastapi.responses import StreamingResponse

from app.models.historial_llamadas import HistorialLlamada
from app.models.comercial import ClienteContacto, CasoLlamada
from app.models.comercial_base import BaseContacto
from app.models.comercial_inbox import Inbox
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado

class ReportesLlamadasService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_reporte_llamadas(self, fecha_inicio: date, fecha_fin: date, comercial_id: int = None, page: int = 1, page_size: int = 50, comercial_ids: list = None):
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())
        offset = (page - 1) * page_size

        # Construir consulta base
        stmt = (
            select(
                HistorialLlamada.id,
                BaseContacto.ruc.label("ruc"),
                BaseContacto.razon_social,
                BaseContacto.telefono,
                CasoLlamada.contestado.label("contesto"),
                CasoLlamada.nombre.label("caso_nombre"),
                HistorialLlamada.comentario,
                func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre"),
                HistorialLlamada.created_at.label("fecha_llamada")
            )
            .join(BaseContacto, HistorialLlamada.base_id == BaseContacto.id)
            .join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id)
            .join(Usuario, HistorialLlamada.comercial_id == Usuario.id)
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            .where(
                and_(
                    HistorialLlamada.created_at >= dt_inicio,
                    HistorialLlamada.created_at <= dt_fin
                )
            )
        )

        # Filtros de equipo y comercial individual
        if comercial_id:
            stmt = stmt.where(HistorialLlamada.comercial_id == comercial_id)
        elif comercial_ids is not None:
            stmt = stmt.where(HistorialLlamada.comercial_id.in_(comercial_ids))

        # Contar total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Obtener datos paginados
        stmt = stmt.order_by(desc(HistorialLlamada.created_at)).offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        
        filas = []
        for row in result.all():
            filas.append({
                "id": row.id,
                "ruc": row.ruc,
                "razon_social": row.razon_social or "Sin razón social",
                "telefono": row.telefono,
                "contesto": bool(row.contesto),
                "caso_nombre": row.caso_nombre,
                "comentario": row.comentario,
                "comercial_nombre": row.comercial_nombre,
                "fecha_llamada": row.fecha_llamada
            })

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "data": filas
        }

    async def exportar_reporte_llamadas(self, fecha_inicio: date, fecha_fin: date, comercial_id: int = None, comercial_ids: list = None):
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())

        # Mismo query pero sin paginación
        stmt = (
            select(
                BaseContacto.ruc.label("RUC"),
                BaseContacto.razon_social.label("Razón Social"),
                BaseContacto.telefono.label("Teléfono"),
                BaseContacto.correo.label("Correo"),
                CasoLlamada.contestado.label("Contestó"),
                CasoLlamada.nombre.label("Caso"),
                HistorialLlamada.comentario.label("Comentario"),
                func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("Comercial"),
                HistorialLlamada.created_at.label("Fecha y Hora")
            )
            .join(BaseContacto, HistorialLlamada.base_id == BaseContacto.id)
            .join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id)
            .join(Usuario, HistorialLlamada.comercial_id == Usuario.id)
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            .where(
                and_(
                    HistorialLlamada.created_at >= dt_inicio,
                    HistorialLlamada.created_at <= dt_fin
                )
            )
            .order_by(desc(HistorialLlamada.created_at))
        )

        # Filtros de equipo y comercial individual
        if comercial_id:
            stmt = stmt.where(HistorialLlamada.comercial_id == comercial_id)
        elif comercial_ids is not None:
            stmt = stmt.where(HistorialLlamada.comercial_id.in_(comercial_ids))

        result = await self.db.execute(stmt)
        rows = result.mappings().all()

        if not rows:
            # Si no hay datos, crear un excel vacío con cabeceras
            df = pd.DataFrame(columns=["RUC", "Razón Social", "Teléfono", "Correo", "Contestó", "Caso", "Comentario", "Comercial", "Fecha y Hora"])
        else:
            # Construir DataFrame
            data = []
            for r in rows:
                data.append({
                    "RUC": r["RUC"],
                    "Razón Social": r["Razón Social"] or "Sin razón social",
                    "Teléfono": r["Teléfono"],
                    "Correo": r["Correo"] or "",
                    "Contestó": "Sí" if r["Contestó"] else "No",
                    "Caso": r["Caso"],
                    "Comentario": r["Comentario"] or "",
                    "Comercial": r["Comercial"],
                    "Fecha y Hora": r["Fecha y Hora"].strftime("%Y-%m-%d %H:%M:%S") if r["Fecha y Hora"] else ""
                })
            df = pd.DataFrame(data)

        # Guardar en memoria
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Llamadas', index=False)
            
            # Ajustar ancho de columnas
            worksheet = writer.sheets['Llamadas']
            for i, col in enumerate(df.columns):
                max_len = max(df[col].astype(str).map(len).max() if not df.empty else 0, len(col)) + 2
                worksheet.set_column(i, i, min(max_len, 50)) # Max 50 de ancho

        output.seek(0)
        
        # Nombre del archivo
        filename = f"Reporte_Llamadas_{fecha_inicio}_al_{fecha_fin}.xlsx"

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    async def get_bot_analytics(self, fecha_inicio: date, fecha_fin: date, comercial_ids: list = None) -> dict:
        """KPIs del bot para decisiones de Sistemas: tipo de interés, leads por hora, motivos de descarte."""
        from sqlalchemy import extract, or_, Date
        from app.models.comercial_catalogos import MotivoDescarteInbox
        import os
        
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())
        condicion_fecha = and_(Inbox.created_at >= dt_inicio, Inbox.created_at <= dt_fin)

        condiciones = [condicion_fecha]

        # Si hay restricción de equipo
        if comercial_ids is not None:
            cond_asignacion = [Inbox.asignado_a.in_(comercial_ids)]
            bot_jefe_id_str = os.getenv("BOT_JEFE_COMERCIAL_ID")
            
            # Verificar si este equipo dueño de comercial_ids es el dueño del bot
            if bot_jefe_id_str:
                try:
                    from app.models.seguridad import Usuario
                    query_bot_jefe = select(Usuario.id).where(Usuario.empleado_id == int(bot_jefe_id_str))
                    bot_jefe_uid = (await self.db.execute(query_bot_jefe)).scalar()
                    
                    # Si el UID del jefe del bot está en los IDs permitidos, le permitimos ver los "Sin asignar" del bot
                    if bot_jefe_uid and bot_jefe_uid in comercial_ids:
                        cond_asignacion.append(Inbox.asignado_a == None)
                except Exception:
                    pass
            condiciones.append(or_(*cond_asignacion))

        condicion_base = and_(*condiciones)

        # 1. Distribución por tipo de interés
        stmt_tipo = select(
            Inbox.tipo_interes, func.count().label('total')
        ).where(
            and_(condicion_base, Inbox.tipo_interes != None)
        ).group_by(Inbox.tipo_interes)
        result_tipo = await self.db.execute(stmt_tipo)
        por_tipo_interes = [{"tipo": row.tipo_interes or "SIN_CLASIFICAR", "total": row.total} for row in result_tipo.all()]

        # 2. Leads por hora del día
        stmt_hora = select(
            extract('hour', Inbox.created_at).label('hora'),
            func.count().label('total')
        ).where(condicion_base).group_by(
            extract('hour', Inbox.created_at)
        ).order_by(extract('hour', Inbox.created_at))
        result_hora = await self.db.execute(stmt_hora)
        por_hora = [{"hora": int(row.hora), "total": row.total} for row in result_hora.all()]

        # 3. Motivos de descarte — JOIN con catálogo para obtener el nombre
        stmt_descarte = (
            select(
                MotivoDescarteInbox.nombre.label('motivo_nombre'),
                func.count().label('total')
            )
            .select_from(Inbox)
            .join(MotivoDescarteInbox, Inbox.motivo_descarte_id == MotivoDescarteInbox.id)
            .where(
                and_(condicion_base, Inbox.estado == 'DESCARTADO', Inbox.motivo_descarte_id != None)
            )
            .group_by(MotivoDescarteInbox.nombre)
            .order_by(func.count().desc())
        )
        result_descarte = await self.db.execute(stmt_descarte)
        motivos_descarte = [{"motivo": row.motivo_nombre, "total": row.total} for row in result_descarte.all()]

        # 4. Leads por día (tendencia)
        stmt_dia = select(
            func.cast(Inbox.created_at, Date).label('fecha'),
            func.count().label('total')
        ).where(condicion_base).group_by(
            func.cast(Inbox.created_at, Date)
        ).order_by(func.cast(Inbox.created_at, Date))
        result_dia = await self.db.execute(stmt_dia)
        por_dia = [{"fecha": row.fecha.isoformat() if row.fecha else None, "total": row.total} for row in result_dia.all()]

        return {
            "por_tipo_interes": por_tipo_interes,
            "por_hora": por_hora,
            "motivos_descarte": motivos_descarte,
            "por_dia": por_dia
        }
