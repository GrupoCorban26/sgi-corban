import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from app.models.cliente_gestion import ClienteGestion
from app.models.comercial import Cliente
from app.models.comercial_catalogos import EstadoCliente, MedioGestion, MotivoGestion
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.schemas.comercial.gestion import GestionCreate
from datetime import datetime, date

logger = logging.getLogger(__name__)


class GestionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def registrar_gestion(self, cliente_id: int, data: GestionCreate, comercial_id: int) -> dict:
        """Registra una gestión y actualiza los campos del cliente. Opcionalmente cambia el estado."""
        try:
            cliente = await self.db.get(Cliente, cliente_id)
            if not cliente:
                return {"success": 0, "message": "Cliente no encontrado"}

            gestion = ClienteGestion(
                cliente_id=cliente_id,
                medio_id=data.medio_id,
                motivo_id=data.motivo_id,
                comentario=data.comentario,
            )
            self.db.add(gestion)

            # Actualizar próxima fecha de contacto
            if data.proxima_fecha_contacto:
                cliente.proxima_fecha_contacto = data.proxima_fecha_contacto
            cliente.updated_at = datetime.now()
            cliente.updated_by = comercial_id

            # Cambiar estado del cliente si se solicita
            estado_cambiado = None
            if data.nuevo_estado_id and data.nuevo_estado_id != cliente.estado_id:
                from app.services.comercial.clientes_service import ClientesService
                clientes_svc = ClientesService(self.db)
                # Obtener nombre del estado para el motivo
                estado_result = await self.db.execute(
                    select(EstadoCliente.nombre).where(EstadoCliente.id == data.nuevo_estado_id)
                )
                nombre_estado = estado_result.scalar()
                motivo_result = await self.db.execute(
                    select(MotivoGestion.nombre).where(MotivoGestion.id == data.motivo_id)
                )
                nombre_motivo = motivo_result.scalar()

                result_estado = await clientes_svc.cambiar_estado(
                    cliente_id, data.nuevo_estado_id, updated_by=comercial_id,
                    motivo=f"Cambio desde gestión: {nombre_motivo}"
                )
                if result_estado.get("success") == 0:
                    return result_estado
                estado_cambiado = nombre_estado

            await self.db.commit()
            await self.db.refresh(gestion)

            mensaje = "Gestión registrada exitosamente"
            if estado_cambiado:
                mensaje += f" • Estado cambiado a: {estado_cambiado}"

            return {"success": 1, "message": mensaje, "id": gestion.id}
        except Exception as e:
            logger.error(f"Error registrando gestión: {e}", exc_info=True)
            await self.db.rollback()
            return {"success": 0, "message": f"Error al registrar gestión: {str(e)}"}

    async def get_gestiones(self, cliente_id: int) -> list[dict]:
        """Historial completo de gestiones de un cliente."""
        stmt = (
            select(
                ClienteGestion,
                MedioGestion.nombre.label("medio_nombre"),
                MotivoGestion.nombre.label("motivo_nombre"),
            )
            .outerjoin(MedioGestion, ClienteGestion.medio_id == MedioGestion.id)
            .outerjoin(MotivoGestion, ClienteGestion.motivo_id == MotivoGestion.id)
            .where(ClienteGestion.cliente_id == cliente_id)
            .order_by(ClienteGestion.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {
                "id": g.id,
                "cliente_id": g.cliente_id,
                "medio_nombre": medio,
                "motivo_nombre": motivo,
                "comentario": g.comentario,
                "created_at": g.created_at
            }
            for g, medio, motivo in rows
        ]

    async def get_productividad(self, comercial_id: int, fecha_inicio: date, fecha_fin: date) -> dict:
        """Métricas de productividad del comercial en un rango de fechas."""
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())

        # Total gestiones — ya no hay comercial_id en la tabla,
        # así que filtramos por los clientes asignados al comercial
        stmt_total = (
            select(func.count())
            .select_from(ClienteGestion)
            .join(Cliente, ClienteGestion.cliente_id == Cliente.id)
            .where(and_(
                Cliente.comercial_encargado_id == comercial_id,
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            ))
        )
        total = (await self.db.execute(stmt_total)).scalar() or 0

        # Por medio
        stmt_medio = (
            select(MedioGestion.nombre, func.count().label("total"))
            .select_from(ClienteGestion)
            .join(MedioGestion, ClienteGestion.medio_id == MedioGestion.id)
            .join(Cliente, ClienteGestion.cliente_id == Cliente.id)
            .where(and_(
                Cliente.comercial_encargado_id == comercial_id,
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            ))
            .group_by(MedioGestion.nombre)
        )
        result_medio = await self.db.execute(stmt_medio)
        por_medio = {row.nombre: row.total for row in result_medio.all()}

        # Por motivo
        stmt_motivo = (
            select(MotivoGestion.nombre, func.count().label("total"))
            .select_from(ClienteGestion)
            .join(MotivoGestion, ClienteGestion.motivo_id == MotivoGestion.id)
            .join(Cliente, ClienteGestion.cliente_id == Cliente.id)
            .where(and_(
                Cliente.comercial_encargado_id == comercial_id,
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            ))
            .group_by(MotivoGestion.nombre)
        )
        result_motivo = await self.db.execute(stmt_motivo)
        por_motivo = {row.nombre: row.total for row in result_motivo.all()}

        return {
            "total_gestiones": total,
            "por_medio": por_medio,
            "por_motivo": por_motivo,
        }
