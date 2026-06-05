from fastapi import HTTPException
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, and_
from app.models.incidencia import Incidencia
from app.models.comercial import Cliente
from app.schemas.comercial.incidencia import IncidenciaCreate, IncidenciaUpdate, IncidenciaResolver
from datetime import datetime, date

logger = logging.getLogger(__name__)


class IncidenciasService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, comercial_ids: list[int] = None, estado: str = None) -> list[Incidencia]:
        """Obtiene todas las incidencias con filtros opcionales de comercial (RBAC) y estado."""
        query = select(Incidencia).where(Incidencia.is_active == True)

        if comercial_ids is not None:
            query = query.where(Incidencia.comercial_id.in_(comercial_ids))

        if estado:
            query = query.where(Incidencia.estado == estado)

        query = query.order_by(desc(Incidencia.created_at))
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, id: int) -> Incidencia:
        """Obtiene una incidencia por ID."""
        incidencia = await self.db.get(Incidencia, id)
        if not incidencia or not incidencia.is_active:
            raise HTTPException(status_code=404, detail="Incidencia no encontrada")
        return incidencia

    async def create(self, data: IncidenciaCreate, comercial_id: int, created_by: int) -> Incidencia:
        """Crea una nueva incidencia operativa asociada a un cliente."""
        # Validar que el cliente existe
        cliente = await self.db.get(Cliente, data.cliente_id)
        if not cliente or not cliente.is_active:
            raise HTTPException(status_code=404, detail="El cliente especificado no existe o está inactivo")

        incidencia = Incidencia(
            seguimiento_id=data.seguimiento_id,
            cliente_id=data.cliente_id,
            comercial_id=comercial_id,
            codigo_operacion=data.codigo_operacion,
            descripcion=data.descripcion,
            observacion=data.observacion,
            estado="ABIERTA",
            created_by=created_by
        )
        self.db.add(incidencia)
        await self.db.commit()
        await self.db.refresh(incidencia)
        return incidencia

    async def update(self, id: int, data: IncidenciaUpdate, usuario_id: int) -> Incidencia:
        """Actualiza datos de una incidencia existente."""
        incidencia = await self.db.get(Incidencia, id)
        if not incidencia or not incidencia.is_active:
            raise HTTPException(status_code=404, detail="Incidencia no encontrada")

        if data.descripcion is not None:
            incidencia.descripcion = data.descripcion
        if data.observacion is not None:
            incidencia.observacion = data.observacion
        if data.estado is not None:
            if data.estado not in ["ABIERTA", "EN_INVESTIGACION", "RESUELTA"]:
                raise HTTPException(status_code=400, detail="Estado de incidencia inválido")
            incidencia.estado = data.estado
        if data.resolucion is not None:
            incidencia.resolucion = data.resolucion
        if data.fecha_resolucion is not None:
            incidencia.fecha_resolucion = data.fecha_resolucion

        incidencia.updated_by = usuario_id
        await self.db.commit()
        await self.db.refresh(incidencia)
        return incidencia

    async def resolver(self, id: int, data: IncidenciaResolver, usuario_id: int) -> Incidencia:
        """Resuelve una incidencia de forma específica."""
        incidencia = await self.db.get(Incidencia, id)
        if not incidencia or not incidencia.is_active:
            raise HTTPException(status_code=404, detail="Incidencia no encontrada")

        if incidencia.estado == "RESUELTA":
            raise HTTPException(status_code=400, detail="La incidencia ya se encuentra resuelta")

        incidencia.estado = "RESUELTA"
        incidencia.resolucion = data.resolucion
        incidencia.fecha_resolucion = data.fecha_resolucion or date.today()
        incidencia.updated_by = usuario_id

        await self.db.commit()
        await self.db.refresh(incidencia)
        return incidencia

    async def delete(self, id: int, usuario_id: int) -> bool:
        """Desactivación lógica de una incidencia."""
        incidencia = await self.db.get(Incidencia, id)
        if not incidencia or not incidencia.is_active:
            raise HTTPException(status_code=404, detail="Incidencia no encontrada")

        incidencia.is_active = False
        incidencia.updated_by = usuario_id
        await self.db.commit()
        return True
