import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from sqlalchemy.orm import selectinload
from app.models.cliente_gestion import ClienteGestion
from app.models.comercial import Cliente
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.schemas.comercial.gestion import GestionCreate
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)


class GestionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def registrar_gestion(self, cliente_id: int, data: GestionCreate, comercial_id: int) -> dict:
        """Registra una gestión y actualiza los campos del cliente."""
        try:
            # Verificar que el cliente existe
            cliente = await self.db.get(Cliente, cliente_id)
            if not cliente:
                return {"success": 0, "message": "Cliente no encontrado"}

            # Crear registro de gestión
            gestion = ClienteGestion(
                cliente_id=cliente_id,
                comercial_id=comercial_id,
                tipo=data.tipo,
                resultado=data.resultado,
                comentario=data.comentario,
                proxima_fecha_contacto=data.proxima_fecha_contacto
            )
            self.db.add(gestion)

            # Actualizar campos del cliente
            cliente.ultimo_contacto = datetime.now()
            cliente.comentario_ultima_llamada = data.comentario
            if data.proxima_fecha_contacto:
                cliente.proxima_fecha_contacto = data.proxima_fecha_contacto
            cliente.updated_at = datetime.now()
            cliente.updated_by = comercial_id

            await self.db.commit()
            await self.db.refresh(gestion)

            return {"success": 1, "message": "Gestión registrada exitosamente", "id": gestion.id}
        except Exception as e:
            logger.error(f"Error registrando gestión: {e}", exc_info=True)
            await self.db.rollback()
            return {"success": 0, "message": f"Error al registrar gestión: {str(e)}"}

    async def get_gestiones(self, cliente_id: int) -> list[dict]:
        """Historial completo de gestiones de un cliente."""
        stmt = (
            select(
                ClienteGestion,
                func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre")
            )
            .outerjoin(Usuario, ClienteGestion.comercial_id == Usuario.id)
            .outerjoin(Empleado, Usuario.empleado_id == Empleado.id)
            .where(ClienteGestion.cliente_id == cliente_id)
            .order_by(ClienteGestion.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {
                "id": g.id,
                "cliente_id": g.cliente_id,
                "comercial_id": g.comercial_id,
                "comercial_nombre": nombre,
                "tipo": g.tipo,
                "resultado": g.resultado,
                "comentario": g.comentario,
                "proxima_fecha_contacto": g.proxima_fecha_contacto,
                "created_at": g.created_at
            }
            for g, nombre in rows
        ]

    async def get_productividad(self, comercial_id: int, fecha_inicio: date, fecha_fin: date) -> dict:
        """Métricas de productividad del comercial en un rango de fechas."""
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())

        # Total gestiones
        stmt_total = select(func.count()).select_from(ClienteGestion).where(
            and_(
                ClienteGestion.comercial_id == comercial_id,
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            )
        )
        total = (await self.db.execute(stmt_total)).scalar() or 0

        # Por tipo
        stmt_tipo = select(
            ClienteGestion.tipo,
            func.count().label("total")
        ).where(
            and_(
                ClienteGestion.comercial_id == comercial_id,
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            )
        ).group_by(ClienteGestion.tipo)
        result_tipo = await self.db.execute(stmt_tipo)
        por_tipo = {row.tipo: row.total for row in result_tipo.all()}

        # Por resultado
        stmt_resultado = select(
            ClienteGestion.resultado,
            func.count().label("total")
        ).where(
            and_(
                ClienteGestion.comercial_id == comercial_id,
                ClienteGestion.created_at >= dt_inicio,
                ClienteGestion.created_at <= dt_fin
            )
        ).group_by(ClienteGestion.resultado)
        result_resultado = await self.db.execute(stmt_resultado)
        por_resultado = {row.resultado: row.total for row in result_resultado.all()}

        # Tasa de contactabilidad
        llamadas_total = por_tipo.get("LLAMADA", 0)
        contesto = por_resultado.get("CONTESTO", 0) + por_resultado.get("INTERESADO", 0) + por_resultado.get("COTIZACION_ENVIADA", 0)
        tasa_contactabilidad = round((contesto / llamadas_total * 100), 1) if llamadas_total > 0 else 0

        return {
            "total_gestiones": total,
            "por_tipo": por_tipo,
            "por_resultado": por_resultado,
            "tasa_contactabilidad": tasa_contactabilidad
        }
