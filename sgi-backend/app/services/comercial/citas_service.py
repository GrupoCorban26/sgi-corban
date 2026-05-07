from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from sqlalchemy.orm import joinedload
from app.models.comercial import Cita, Cliente
from app.models.comercial_catalogos import EstadoCita
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.schemas.comercial.cita import CitaCreate, CitaUpdate, SalidaCampoCreate, SalidaCampoUpdate, CitaAprobar
from fastapi import HTTPException
from datetime import datetime


class CitasService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, comercial_id: int = None, estado_id: str = None, tipo_cita: str = None, page: int = 1, page_size: int = 20, comercial_ids: list[int] = None):
        """Lista todas las citas con filtros opcionales"""
        offset = (page - 1) * page_size
        stmt = select(Cita).options(joinedload(Cita.cliente), joinedload(Cita.estado)).order_by(desc(Cita.created_at))

        # Resolver nombre de estado a ID si se recibe un string
        resolved_estado_id = None
        if estado_id:
            try:
                resolved_estado_id = int(estado_id)
            except (ValueError, TypeError):
                # Es un nombre como "PENDIENTE", resolver a ID
                resolved_estado_id = await self._get_estado_id(estado_id)

        if comercial_id:
            stmt = stmt.where(Cita.comercial_id == comercial_id)
        if comercial_ids:
            stmt = stmt.where(Cita.comercial_id.in_(comercial_ids))
        if resolved_estado_id:
            stmt = stmt.where(Cita.estado_id == resolved_estado_id)
        if tipo_cita:
            stmt = stmt.where(Cita.tipo_cita == tipo_cita)

        stmt = stmt.offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        citas = result.scalars().unique().all()

        count_stmt = select(func.count()).select_from(Cita)
        if comercial_id:
            count_stmt = count_stmt.where(Cita.comercial_id == comercial_id)
        if comercial_ids:
            count_stmt = count_stmt.where(Cita.comercial_id.in_(comercial_ids))
        if resolved_estado_id:
            count_stmt = count_stmt.where(Cita.estado_id == resolved_estado_id)
        if tipo_cita:
            count_stmt = count_stmt.where(Cita.tipo_cita == tipo_cita)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        data = [await self._format_cita(c) for c in citas]
        return {"total": total, "page": page, "page_size": page_size, "data": data}

    async def get_by_id(self, cita_id: int):
        """Obtiene una cita por ID"""
        stmt = select(Cita).options(joinedload(Cita.cliente), joinedload(Cita.estado)).where(Cita.id == cita_id)
        result = await self.db.execute(stmt)
        cita = result.scalars().first()
        if not cita:
            return None
        return await self._format_cita(cita)

    async def _format_cita(self, c: Cita) -> dict:
        """Formatea una cita para la respuesta"""
        return {
            "id": c.id,
            "tipo_cita": c.tipo_cita,
            "cliente_id": c.cliente_id,
            "comercial_id": c.comercial_id,
            "fecha": c.fecha,
            "hora": c.hora,
            "direccion": c.direccion,
            "detalles": c.detalles,
            "con_presente": c.con_presente,
            "estado_id": c.estado_id,
            "estado_nombre": c.estado.nombre if c.estado else None,
            "is_confirmado": c.is_confirmado,
            "observacion": c.observacion,
            "acompanado_por_id": c.acompanado_por_id,
            "created_at": c.created_at,
            "created_by": c.created_by,
            "cliente_razon_social": c.cliente.razon_social if c.cliente else None,
            "comercial_nombre": await self._get_empleado_name(c.comercial_id),
            "acompanante_nombre": await self._get_empleado_name(c.acompanado_por_id) if c.acompanado_por_id else None,
        }

    async def _get_empleado_name(self, usuario_id: int) -> str:
        """Obtiene el nombre del empleado por ID de usuario"""
        stmt = select(func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno))\
            .join(Usuario, Usuario.empleado_id == Empleado.id)\
            .where(Usuario.id == usuario_id)
        result = await self.db.execute(stmt)
        return result.scalar() or "Desconocido"

    # =========================================================================
    # CREAR CITAS
    # =========================================================================

    async def create(self, data: CitaCreate, comercial_id: int, created_by: int):
        """Crea una cita individual (comercial con cliente)"""
        # Obtener estado_id de PENDIENTE
        estado_pendiente = await self._get_estado_id("PENDIENTE")

        cita = Cita(
            tipo_cita=data.tipo_cita,
            cliente_id=data.cliente_id,
            comercial_id=comercial_id,
            fecha=data.fecha,
            hora=data.hora,
            direccion=data.direccion,
            detalles=data.detalles,
            con_presente=data.con_presente,
            estado_id=estado_pendiente,
            created_by=created_by
        )

        self.db.add(cita)
        await self.db.commit()
        await self.db.refresh(cita)
        return await self.get_by_id(cita.id)

    async def create_salida_campo(self, data: SalidaCampoCreate, creador_id: int):
        """Crea una salida a campo (jefe comercial)"""
        estado_aprobado = await self._get_estado_id("APROBADO")

        cita = Cita(
            tipo_cita="SALIDA_CAMPO",
            cliente_id=None,
            comercial_id=creador_id,
            fecha=data.fecha,
            hora=data.hora,
            direccion=data.direccion,
            detalles=data.objetivo_campo,
            con_presente=data.con_presente,
            estado_id=estado_aprobado,
            created_by=creador_id
        )
        self.db.add(cita)
        await self.db.commit()
        await self.db.refresh(cita)
        return await self.get_by_id(cita.id)

    # =========================================================================
    # ACTUALIZAR CITAS
    # =========================================================================

    async def update(self, id: int, data: CitaUpdate, updated_by: int):
        """Actualiza una cita (por el comercial)"""
        stmt = select(Cita).where(Cita.id == id)
        result = await self.db.execute(stmt)
        cita = result.scalars().first()

        if not cita:
            raise HTTPException(404, "Cita no encontrada")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(cita, key, value)

        # Si se edita, vuelve a pendiente
        cita.estado_id = await self._get_estado_id("PENDIENTE")
        cita.observacion = None
        cita.updated_by = updated_by

        await self.db.commit()
        return await self.get_by_id(cita.id)

    async def update_salida_campo(self, id: int, data: SalidaCampoUpdate, updated_by: int):
        """Actualiza una salida a campo"""
        stmt = select(Cita).where(Cita.id == id, Cita.tipo_cita == "SALIDA_CAMPO")
        result = await self.db.execute(stmt)
        cita = result.scalars().first()

        if not cita:
            raise HTTPException(404, "Salida a campo no encontrada")

        if data.fecha:
            cita.fecha = data.fecha
        if data.hora:
            cita.hora = data.hora
        if data.direccion is not None:
            cita.direccion = data.direccion
        if data.objetivo_campo:
            cita.detalles = data.objetivo_campo
        if data.con_presente is not None:
            cita.con_presente = data.con_presente

        cita.updated_by = updated_by
        await self.db.commit()
        return await self.get_by_id(cita.id)

    # =========================================================================
    # WORKFLOW: APROBAR / RECHAZAR / TERMINAR
    # =========================================================================

    async def aprobar(self, id: int, data: CitaAprobar):
        """Aprueba una cita individual"""
        stmt = select(Cita).where(Cita.id == id)
        result = await self.db.execute(stmt)
        cita = result.scalars().first()

        if not cita:
            raise HTTPException(404, "Cita no encontrada")

        estado_pendiente = await self._get_estado_id("PENDIENTE")
        if cita.estado_id != estado_pendiente:
            raise HTTPException(400, "Solo se pueden aprobar citas pendientes")

        cita.estado_id = await self._get_estado_id("APROBADO")
        cita.is_confirmado = True

        if not data.ira_solo and data.acompanado_por_id:
            cita.acompanado_por_id = data.acompanado_por_id

        await self.db.commit()
        return {"success": True, "message": "Cita aprobada correctamente"}

    async def rechazar(self, id: int, motivo: str):
        """Rechaza una cita"""
        stmt = select(Cita).where(Cita.id == id)
        result = await self.db.execute(stmt)
        cita = result.scalars().first()

        if not cita:
            raise HTTPException(404, "Cita no encontrada")

        cita.estado_id = await self._get_estado_id("RECHAZADO")
        cita.observacion = motivo

        await self.db.commit()
        return {"success": True, "message": "Cita rechazada"}

    async def terminar(self, id: int):
        """Finaliza una cita (solo el día de la cita)"""
        stmt = select(Cita).where(Cita.id == id)
        result = await self.db.execute(stmt)
        cita = result.scalars().first()

        if not cita:
            raise HTTPException(404, "Cita no encontrada")

        today = datetime.now().date()
        if cita.fecha.date() != today:
            raise HTTPException(400, "Solo puede finalizar citas programadas para el día de hoy")

        estado_aprobado = await self._get_estado_id("APROBADO")
        if cita.estado_id != estado_aprobado:
            raise HTTPException(400, "Solo se pueden finalizar citas aprobadas")

        cita.estado_id = await self._get_estado_id("TERMINADO")
        await self.db.commit()
        return {"success": True, "message": "Cita finalizada correctamente"}

    # =========================================================================
    # ELIMINAR
    # =========================================================================

    async def delete(self, id: int):
        """Elimina una cita"""
        stmt = select(Cita).where(Cita.id == id)
        result = await self.db.execute(stmt)
        cita = result.scalars().first()

        if not cita:
            raise HTTPException(404, "Cita no encontrada")

        await self.db.delete(cita)
        await self.db.commit()
        return {"success": True, "message": "Cita eliminada"}

    # =========================================================================
    # HELPERS
    # =========================================================================

    async def _get_estado_id(self, nombre: str) -> int:
        """Obtiene el ID de un estado de cita por nombre"""
        stmt = select(EstadoCita.id).where(EstadoCita.nombre == nombre)
        result = await self.db.execute(stmt)
        estado_id = result.scalar()
        if not estado_id:
            raise HTTPException(500, f"Estado de cita '{nombre}' no encontrado en catálogo")
        return estado_id
