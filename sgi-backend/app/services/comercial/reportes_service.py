from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, desc
from datetime import date, datetime, timedelta
import io
import pandas as pd
from fastapi.responses import StreamingResponse

from app.models.historial_llamadas import HistorialLlamada
from app.models.comercial import ClienteContacto, RegistroImportacion, CasoLlamada
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
                HistorialLlamada.ruc,
                RegistroImportacion.razon_social,
                ClienteContacto.telefono,
                CasoLlamada.contestado.label("contesto"),
                CasoLlamada.nombre.label("caso_nombre"),
                HistorialLlamada.comentario,
                func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre"),
                HistorialLlamada.fecha_llamada
            )
            .join(ClienteContacto, HistorialLlamada.contacto_id == ClienteContacto.id)
            .outerjoin(RegistroImportacion, HistorialLlamada.ruc == RegistroImportacion.ruc)
            .join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id)
            .join(Usuario, HistorialLlamada.comercial_id == Usuario.id)
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            .where(
                and_(
                    HistorialLlamada.fecha_llamada >= dt_inicio,
                    HistorialLlamada.fecha_llamada <= dt_fin
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
        stmt = stmt.order_by(desc(HistorialLlamada.fecha_llamada)).offset(offset).limit(page_size)
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
                HistorialLlamada.ruc.label("RUC"),
                RegistroImportacion.razon_social.label("Razón Social"),
                ClienteContacto.telefono.label("Teléfono"),
                CasoLlamada.contestado.label("Contestó"),
                CasoLlamada.nombre.label("Caso"),
                HistorialLlamada.comentario.label("Comentario"),
                func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("Comercial"),
                HistorialLlamada.fecha_llamada.label("Fecha y Hora")
            )
            .join(ClienteContacto, HistorialLlamada.contacto_id == ClienteContacto.id)
            .outerjoin(RegistroImportacion, HistorialLlamada.ruc == RegistroImportacion.ruc)
            .join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id)
            .join(Usuario, HistorialLlamada.comercial_id == Usuario.id)
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            .where(
                and_(
                    HistorialLlamada.fecha_llamada >= dt_inicio,
                    HistorialLlamada.fecha_llamada <= dt_fin
                )
            )
            .order_by(desc(HistorialLlamada.fecha_llamada))
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
            df = pd.DataFrame(columns=["RUC", "Razón Social", "Teléfono", "Contestó", "Caso", "Comentario", "Comercial", "Fecha y Hora"])
        else:
            # Construir DataFrame
            data = []
            for r in rows:
                data.append({
                    "RUC": r["RUC"],
                    "Razón Social": r["Razón Social"] or "Sin razón social",
                    "Teléfono": r["Teléfono"],
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

    async def get_bot_analytics(self, fecha_inicio: date, fecha_fin: date) -> dict:
        """KPIs del bot para decisiones de Sistemas: tipo de interés, leads por hora, motivos de descarte."""
        from sqlalchemy import extract
        
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())
        condicion_fecha = and_(Inbox.fecha_recepcion >= dt_inicio, Inbox.fecha_recepcion <= dt_fin)

        # 1. Distribución por tipo de interés
        stmt_tipo = select(
            Inbox.tipo_interes, func.count().label('total')
        ).where(
            and_(condicion_fecha, Inbox.tipo_interes != None)
        ).group_by(Inbox.tipo_interes)
        result_tipo = await self.db.execute(stmt_tipo)
        por_tipo_interes = [{"tipo": row.tipo_interes or "SIN_CLASIFICAR", "total": row.total} for row in result_tipo.all()]

        # 2. Leads por hora del día
        stmt_hora = select(
            extract('hour', Inbox.fecha_recepcion).label('hora'),
            func.count().label('total')
        ).where(condicion_fecha).group_by(
            extract('hour', Inbox.fecha_recepcion)
        ).order_by(extract('hour', Inbox.fecha_recepcion))
        result_hora = await self.db.execute(stmt_hora)
        por_hora = [{"hora": int(row.hora), "total": row.total} for row in result_hora.all()]

        # 3. Motivos de descarte
        stmt_descarte = select(
            Inbox.motivo_descarte, func.count().label('total')
        ).where(
            and_(condicion_fecha, Inbox.estado == 'DESCARTADO', Inbox.motivo_descarte != None)
        ).group_by(Inbox.motivo_descarte).order_by(func.count().desc())
        result_descarte = await self.db.execute(stmt_descarte)
        motivos_descarte = [{"motivo": row.motivo_descarte, "total": row.total} for row in result_descarte.all()]

        # 4. Leads por día (tendencia)
        stmt_dia = select(
            func.cast(Inbox.fecha_recepcion, date).label('fecha'),
            func.count().label('total')
        ).where(condicion_fecha).group_by(
            func.cast(Inbox.fecha_recepcion, date)
        ).order_by(func.cast(Inbox.fecha_recepcion, date))
        result_dia = await self.db.execute(stmt_dia)
        por_dia = [{"fecha": row.fecha.isoformat() if row.fecha else None, "total": row.total} for row in result_dia.all()]

        return {
            "por_tipo_interes": por_tipo_interes,
            "por_hora": por_hora,
            "motivos_descarte": motivos_descarte,
            "por_dia": por_dia
        }
