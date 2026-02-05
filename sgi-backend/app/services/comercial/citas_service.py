from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from sqlalchemy.orm import joinedload
from app.models.comercial import Cita, CitaComercial, Cliente
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.models.logistica import Conductor, Vehiculo
from app.schemas.comercial.cita import CitaCreate, CitaUpdate, SalidaCampoCreate, SalidaCampoUpdate, CitaAprobar
from fastapi import HTTPException
from datetime import datetime


class CitasService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # LISTAR CITAS
    # =========================================================================
    
    async def get_all(
        self,
        comercial_id: int = None,
        estado: str = None,
        tipo_agenda: str = None,
        page: int = 1,
        page_size: int = 20
    ):
        """Lista todas las citas con filtros opcionales"""
        offset = (page - 1) * page_size
        
        # Query base con eager loading
        stmt = select(Cita).options(
            joinedload(Cita.cliente),
            joinedload(Cita.conductor),
            joinedload(Cita.comerciales_asignados)
        ).order_by(desc(Cita.created_at))
        
        # Filtros
        if comercial_id:
            stmt = stmt.where(Cita.comercial_id == comercial_id)
        if estado:
            stmt = stmt.where(Cita.estado == estado)
        if tipo_agenda:
            stmt = stmt.where(Cita.tipo_agenda == tipo_agenda)
        
        stmt = stmt.offset(offset).limit(page_size)
        
        result = await self.db.execute(stmt)
        citas = result.scalars().unique().all()
        
        # Count total
        count_stmt = select(func.count()).select_from(Cita)
        if comercial_id:
            count_stmt = count_stmt.where(Cita.comercial_id == comercial_id)
        if estado:
            count_stmt = count_stmt.where(Cita.estado == estado)
        if tipo_agenda:
            count_stmt = count_stmt.where(Cita.tipo_agenda == tipo_agenda)
        
        total = (await self.db.execute(count_stmt)).scalar() or 0
        
        # Formatear respuesta
        data = []
        for c in citas:
            item = await self._format_cita(c)
            data.append(item)
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "data": data
        }

    async def get_by_id(self, cita_id: int):
        """Obtiene una cita por ID"""
        stmt = select(Cita).options(
            joinedload(Cita.cliente),
            joinedload(Cita.conductor),
            joinedload(Cita.comerciales_asignados)
        ).where(Cita.id == cita_id)
        
        result = await self.db.execute(stmt)
        cita = result.scalars().first()
        
        if not cita:
            return None
        
        return await self._format_cita(cita)

    async def _format_cita(self, c: Cita) -> dict:
        """Formatea una cita para la respuesta"""
        item = {
            "id": c.id,
            "tipo_agenda": c.tipo_agenda,
            "cliente_id": c.cliente_id,
            "comercial_id": c.comercial_id,
            "fecha": c.fecha,
            "hora": c.hora,
            "tipo_cita": c.tipo_cita,
            "direccion": c.direccion,
            "motivo": c.motivo,
            "objetivo_campo": c.objetivo_campo,
            "con_presente": c.con_presente,
            "estado": c.estado,
            "motivo_rechazo": c.motivo_rechazo,
            "acompanado_por_id": c.acompanado_por_id,
            "conductor_id": c.conductor_id,
            "created_at": c.created_at,
            "created_by": c.created_by,
            # Campos expandidos
            "cliente_razon_social": c.cliente.razon_social if c.cliente else None,
            "comercial_nombre": await self._get_empleado_name(c.comercial_id),
            "acompanante_nombre": None,
            "conductor_info": None,
            "comerciales_asignados": []
        }
        
        # Acompañante
        if c.acompanado_por_id:
            item["acompanante_nombre"] = await self._get_empleado_name(c.acompanado_por_id)
        
        # Conductor
        if c.conductor_id:
            item["conductor_info"] = await self._get_conductor_info(c.conductor_id)
        
        # Comerciales asignados (para salidas a campo)
        if c.comerciales_asignados:
            for cc in c.comerciales_asignados:
                nombre = await self._get_empleado_name(cc.usuario_id)
                item["comerciales_asignados"].append({
                    "id": cc.id,
                    "usuario_id": cc.usuario_id,
                    "nombre": nombre,
                    "confirmado": cc.confirmado
                })
        
        return item

    async def _get_empleado_name(self, usuario_id: int) -> str:
        """Obtiene el nombre del empleado por ID de usuario"""
        stmt = select(func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno))\
            .join(Usuario, Usuario.empleado_id == Empleado.id)\
            .where(Usuario.id == usuario_id)
        result = await self.db.execute(stmt)
        return result.scalar() or "Desconocido"

    async def _get_conductor_info(self, conductor_id: int) -> str:
        """Obtiene info del conductor"""
        stmt = select(
            Empleado.nombres,
            Vehiculo.tipo_vehiculo,
            Vehiculo.placa
        ).join(Conductor, Conductor.empleado_id == Empleado.id)\
         .join(Vehiculo, Conductor.vehiculo_id == Vehiculo.id)\
         .where(Conductor.id == conductor_id)
        
        row = (await self.db.execute(stmt)).first()
        if row:
            return f"{row.nombres} - {row.tipo_vehiculo} ({row.placa})"
        return None

    # =========================================================================
    # CREAR CITAS
    # =========================================================================

    async def create(self, data: CitaCreate, comercial_id: int, created_by: int):
        """Crea una cita individual (comercial con cliente)"""
        cita = Cita(
            tipo_agenda="INDIVIDUAL",
            cliente_id=data.cliente_id,
            comercial_id=comercial_id,
            fecha=data.fecha,
            hora=data.hora,
            tipo_cita=data.tipo_cita,
            direccion=data.direccion,
            motivo=data.motivo,
            con_presente=data.con_presente,
            estado="PENDIENTE",
            created_by=created_by
        )
        
        self.db.add(cita)
        await self.db.commit()
        await self.db.refresh(cita)
        
        return await self.get_by_id(cita.id)

    async def create_salida_campo(self, data: SalidaCampoCreate, creador_id: int):
        """Crea una salida a campo (jefe comercial)"""
        # Crear la cita tipo salida a campo
        cita = Cita(
            tipo_agenda="SALIDA_CAMPO",
            cliente_id=None,  # Sin cliente específico
            comercial_id=creador_id,  # El jefe que crea
            fecha=data.fecha,
            hora=data.hora,
            tipo_cita="SALIDA_CAMPO",
            direccion=data.direccion,
            motivo=data.objetivo_campo,
            objetivo_campo=data.objetivo_campo,
            con_presente=data.con_presente,
            estado="APROBADO",  # Las salidas a campo se auto-aprueban (las crea el jefe)
            created_by=creador_id
        )
        
        self.db.add(cita)
        await self.db.commit()
        await self.db.refresh(cita)
        
        # Agregar comerciales asignados
        for usuario_id in data.comerciales_ids:
            comercial = CitaComercial(
                cita_id=cita.id,
                usuario_id=usuario_id,
                confirmado=False
            )
            self.db.add(comercial)
        
        await self.db.commit()
        
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
        
        # Actualizar campos
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(cita, key, value)
        
        # Si se edita, vuelve a pendiente
        cita.estado = "PENDIENTE"
        cita.motivo_rechazo = None
        
        await self.db.commit()
        
        return await self.get_by_id(cita.id)

    async def update_salida_campo(self, id: int, data: SalidaCampoUpdate, updated_by: int):
        """Actualiza una salida a campo"""
        stmt = select(Cita).where(Cita.id == id, Cita.tipo_agenda == "SALIDA_CAMPO")
        result = await self.db.execute(stmt)
        cita = result.scalars().first()
        
        if not cita:
            raise HTTPException(404, "Salida a campo no encontrada")
        
        # Actualizar campos básicos
        if data.fecha:
            cita.fecha = data.fecha
        if data.hora:
            cita.hora = data.hora
        if data.direccion is not None:
            cita.direccion = data.direccion
        if data.objetivo_campo:
            cita.objetivo_campo = data.objetivo_campo
            cita.motivo = data.objetivo_campo
        if data.con_presente is not None:
            cita.con_presente = data.con_presente
        
        # Actualizar comerciales asignados
        if data.comerciales_ids is not None:
            # Eliminar asignaciones actuales
            await self.db.execute(
                select(CitaComercial).where(CitaComercial.cita_id == id)
            )
            for cc in cita.comerciales_asignados:
                await self.db.delete(cc)
            
            # Crear nuevas asignaciones
            for usuario_id in data.comerciales_ids:
                comercial = CitaComercial(
                    cita_id=cita.id,
                    usuario_id=usuario_id,
                    confirmado=False
                )
                self.db.add(comercial)
        
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
        
        if cita.estado != "PENDIENTE":
            raise HTTPException(400, "Solo se pueden aprobar citas pendientes")
        
        cita.estado = "APROBADO"
        
        # Asignar acompañante (si no va solo)
        if not data.ira_solo and data.acompanado_por_id:
            cita.acompanado_por_id = data.acompanado_por_id
        
        # Conductor opcional
        if data.conductor_id:
            cita.conductor_id = data.conductor_id
        
        await self.db.commit()
        
        return {"success": True, "message": "Cita aprobada correctamente"}

    async def rechazar(self, id: int, motivo: str):
        """Rechaza una cita"""
        stmt = select(Cita).where(Cita.id == id)
        result = await self.db.execute(stmt)
        cita = result.scalars().first()
        
        if not cita:
            raise HTTPException(404, "Cita no encontrada")
        
        cita.estado = "RECHAZADO"
        cita.motivo_rechazo = motivo
        
        await self.db.commit()
        
        return {"success": True, "message": "Cita rechazada"}

    async def terminar(self, id: int):
        """Finaliza una cita (solo el día de la cita)"""
        stmt = select(Cita).where(Cita.id == id)
        result = await self.db.execute(stmt)
        cita = result.scalars().first()
        
        if not cita:
            raise HTTPException(404, "Cita no encontrada")
        
        # Validar que sea el día de hoy
        today = datetime.now().date()
        if cita.fecha.date() != today:
            raise HTTPException(400, "Solo puede finalizar citas programadas para el día de hoy")
        
        if cita.estado != "APROBADO":
            raise HTTPException(400, "Solo se pueden finalizar citas aprobadas")
        
        cita.estado = "TERMINADO"
        
        await self.db.commit()
        
        return {"success": True, "message": "Cita finalizada correctamente"}

    # =========================================================================
    # ELIMINAR
    # =========================================================================

    async def delete(self, id: int):
        """Elimina una cita (soft delete o hard delete según preferencia)"""
        stmt = select(Cita).where(Cita.id == id)
        result = await self.db.execute(stmt)
        cita = result.scalars().first()
        
        if not cita:
            raise HTTPException(404, "Cita no encontrada")
        
        await self.db.delete(cita)
        await self.db.commit()
        
        return {"success": True, "message": "Cita eliminada"}
