from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, or_, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.schemas.organizacion.activos import (
    ActivoCreate, 
    ActivoUpdate,
    CambioEstadoRequest,
    AsignacionActivoRequest,
    DevolucionActivoRequest
)
from app.services.validators import CommonValidators
from app.models.administrativo import Activo, EmpleadoActivo, Empleado, EstadoActivo, ActivoHistorial
from datetime import datetime


class ActivoService:
    """
    Servicio de Activos - Refactored to use estado_id (FK) instead of estado_fisico (String)
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.validators = CommonValidators(db)

    # =========================================================================
    # HELPERS
    # =========================================================================
    
    async def _activo_existe(self, activo_id: int) -> bool:
        stmt = select(func.count()).select_from(Activo).where(Activo.id == activo_id)
        return (await self.db.execute(stmt)).scalar() > 0
    
    async def _codigo_inventario_duplicado(self, codigo: str, exclude_id: int = None) -> bool:
        if not codigo: return False
        stmt = select(func.count()).select_from(Activo).where(
            Activo.codigo_inventario == codigo,
            Activo.is_active == True
        )
        if exclude_id:
            stmt = stmt.where(Activo.id != exclude_id)
        return (await self.db.execute(stmt)).scalar() > 0
    
    async def _activo_tiene_asignacion_activa(self, activo_id: int) -> bool:
        stmt = select(func.count()).select_from(EmpleadoActivo).where(
            EmpleadoActivo.activo_id == activo_id,
            EmpleadoActivo.fecha_devolucion.is_(None)
        )
        return (await self.db.execute(stmt)).scalar() > 0

    async def _get_estado_by_nombre(self, nombre: str) -> EstadoActivo | None:
        """Obtiene un estado por nombre (para lookup)"""
        stmt = select(EstadoActivo).where(func.upper(EstadoActivo.nombre) == func.upper(nombre))
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def _get_estado_default(self) -> int:
        """Obtiene el ID del estado por defecto (BUENO)"""
        estado = await self._get_estado_by_nombre("BUENO")
        if estado:
            return estado.id
        # Si no existe, obtener el primero disponible
        stmt = select(EstadoActivo).limit(1)
        result = await self.db.execute(stmt)
        estado = result.scalars().first()
        return estado.id if estado else None

    async def _get_estado_baja(self) -> int:
        """Obtiene el ID del estado BAJA"""
        estado = await self._get_estado_by_nombre("BAJA")
        if estado:
            return estado.id
        raise HTTPException(500, "Estado 'BAJA' no encontrado en el sistema")

    async def _registrar_historial(
        self, 
        activo_id: int, 
        estado_anterior_id: int | None, 
        estado_nuevo_id: int, 
        motivo: str, 
        observaciones: str = None, 
        empleado_activo_id: int = None, 
        registrado_por: int = None
    ):
        """Registra un cambio de estado en el historial usando ORM"""
        historial = ActivoHistorial(
            activo_id=activo_id,
            estado_anterior_id=estado_anterior_id,
            estado_nuevo_id=estado_nuevo_id,
            motivo=motivo,
            observaciones=observaciones,
            empleado_activo_id=empleado_activo_id,
            registrado_por=registrado_por
        )
        self.db.add(historial)

    # =========================================================================
    # CRUD
    # =========================================================================

    async def get_all(
        self, 
        busqueda: str = None, 
        estado_id: int = None, 
        is_disponible: bool = None, 
        page: int = 1, 
        page_size: int = 15
    ) -> dict:
        offset = (page - 1) * page_size
        
        stmt = select(Activo).options(selectinload(Activo.estado)).where(Activo.is_active == True)
        
        if busqueda:
            stmt = stmt.where(or_(
                Activo.producto.ilike(f"%{busqueda}%"),
                Activo.marca.ilike(f"%{busqueda}%"),
                Activo.modelo.ilike(f"%{busqueda}%"),
                Activo.serie.ilike(f"%{busqueda}%"),
                Activo.codigo_inventario.ilike(f"%{busqueda}%")
            ))
            
        if estado_id:
            stmt = stmt.where(Activo.estado_id == estado_id)
            
        if is_disponible is not None:
            stmt = stmt.where(Activo.is_disponible == is_disponible)
            
        # Total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0
        
        # Data
        stmt = stmt.order_by(Activo.id.desc()).offset(offset).limit(page_size)
        
        result = await self.db.execute(stmt)
        activos = result.scalars().all()
        
        data = []
        for a in activos:
            # Check for current assignment
            stmt_asign = select(EmpleadoActivo).options(selectinload(EmpleadoActivo.empleado)).where(
                EmpleadoActivo.activo_id == a.id,
                EmpleadoActivo.fecha_devolucion.is_(None)
            )
            res_asign = await self.db.execute(stmt_asign)
            asign = res_asign.scalars().first()
            
            data.append({
                "id": a.id,
                "producto": a.producto,
                "marca": a.marca,
                "modelo": a.modelo,
                "serie": a.serie,
                "codigo_inventario": a.codigo_inventario,
                "estado_id": a.estado_id,
                "estado_nombre": a.estado.nombre if a.estado else None,
                "is_disponible": a.is_disponible,
                "is_active": a.is_active,
                "observaciones": a.observaciones,
                "created_at": a.created_at,
                "updated_at": a.updated_at,
                "empleado_asignado_id": asign.empleado_id if asign else None,
                "empleado_asignado_nombre": f"{asign.empleado.nombres} {asign.empleado.apellido_paterno}" if asign and asign.empleado else None,
                "fecha_asignacion": asign.fecha_entrega if asign else None
            })
            
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            "data": data
        }

    async def get_by_id(self, activo_id: int) -> dict:
        stmt = select(Activo).options(selectinload(Activo.estado)).where(Activo.id == activo_id)
        result = await self.db.execute(stmt)
        activo = result.scalars().first()
        
        if not activo: return None
        
        # Get active assignment
        stmt_asign = select(EmpleadoActivo).options(selectinload(EmpleadoActivo.empleado)).where(
            EmpleadoActivo.activo_id == activo.id,
            EmpleadoActivo.fecha_devolucion.is_(None)
        )
        res_asign = await self.db.execute(stmt_asign)
        asign = res_asign.scalars().first()
        
        return {
            "id": activo.id,
            "producto": activo.producto,
            "marca": activo.marca,
            "modelo": activo.modelo,
            "serie": activo.serie,
            "codigo_inventario": activo.codigo_inventario,
            "estado_id": activo.estado_id,
            "estado_nombre": activo.estado.nombre if activo.estado else None,
            "is_disponible": activo.is_disponible,
            "is_active": activo.is_active,
            "observaciones": activo.observaciones,
            "created_at": activo.created_at,
            "updated_at": activo.updated_at,
            "empleado_asignado_id": asign.empleado_id if asign else None,
            "empleado_asignado_nombre": f"{asign.empleado.nombres} {asign.empleado.apellido_paterno}" if asign and asign.empleado else None,
            "fecha_asignacion": asign.fecha_entrega if asign else None
        }

    async def get_historial(self, activo_id: int) -> list:
        """Obtiene el historial de cambios de un activo"""
        if not await self._activo_existe(activo_id):
            raise HTTPException(404, "Activo no encontrado")
        
        stmt = select(ActivoHistorial).options(
            selectinload(ActivoHistorial.estado_anterior),
            selectinload(ActivoHistorial.estado_nuevo),
            selectinload(ActivoHistorial.usuario)
        ).where(
            ActivoHistorial.activo_id == activo_id
        ).order_by(ActivoHistorial.fecha_cambio.desc())
        
        result = await self.db.execute(stmt)
        historiales = result.scalars().all()
        
        data = []
        for h in historiales:
            usuario_nombre = None
            if h.usuario:
                # Cargar empleado del usuario para obtener nombre
                from app.models.seguridad import Usuario
                stmt_user = select(Usuario).options(selectinload(Usuario.empleado)).where(Usuario.id == h.registrado_por)
                user_result = await self.db.execute(stmt_user)
                user = user_result.scalars().first()
                if user and user.empleado:
                    usuario_nombre = f"{user.empleado.nombres} {user.empleado.apellido_paterno}"
            
            data.append({
                "id": h.id,
                "activo_id": h.activo_id,
                "estado_anterior_id": h.estado_anterior_id,
                "estado_anterior_nombre": h.estado_anterior.nombre if h.estado_anterior else None,
                "estado_nuevo_id": h.estado_nuevo_id,
                "estado_nuevo_nombre": h.estado_nuevo.nombre if h.estado_nuevo else None,
                "motivo": h.motivo,
                "observaciones": h.observaciones,
                "empleado_activo_id": h.empleado_activo_id,
                "registrado_por": h.registrado_por,
                "registrado_por_nombre": usuario_nombre,
                "fecha_cambio": h.fecha_cambio
            })
        
        return data

    async def create(self, activo: ActivoCreate, usuario_id: int = None) -> dict:
        if activo.codigo_inventario and await self._codigo_inventario_duplicado(activo.codigo_inventario):
            raise HTTPException(400, f'Ya existe un activo con el código de inventario "{activo.codigo_inventario}".')
        
        # Determinar estado_id
        estado_id = activo.estado_id
        
        # Validar que el estado existe
        stmt = select(func.count()).select_from(EstadoActivo).where(EstadoActivo.id == estado_id)
        if (await self.db.execute(stmt)).scalar() == 0:
            raise HTTPException(400, "El estado especificado no existe")
        
        nuevo_activo = Activo(
            producto=activo.producto.strip(),
            marca=activo.marca,
            modelo=activo.modelo,
            serie=activo.serie,
            codigo_inventario=activo.codigo_inventario,
            estado_id=estado_id,
            is_disponible=True,
            is_active=True,
            observaciones=activo.observaciones
        )
        self.db.add(nuevo_activo)
        await self.db.commit()
        await self.db.refresh(nuevo_activo)
        
        await self._registrar_historial(
            nuevo_activo.id, 
            None, 
            estado_id, 
            "CREACION", 
            "Activo creado", 
            None, 
            usuario_id
        )
        await self.db.commit()
        
        return {"success": True, "id": nuevo_activo.id, "message": "Activo creado exitosamente"}

    async def update(self, activo_id: int, activo: ActivoUpdate) -> dict:
        stmt = select(Activo).where(Activo.id == activo_id)
        res = await self.db.execute(stmt)
        activo_db = res.scalars().first()
        
        if not activo_db: raise HTTPException(404, "Activo no encontrado")
        
        if activo.codigo_inventario and await self._codigo_inventario_duplicado(activo.codigo_inventario, activo_id):
             raise HTTPException(400, f'Ya existe otro activo con el código de inventario "{activo.codigo_inventario}".')
             
        if activo.producto is not None: activo_db.producto = activo.producto.strip()
        if activo.marca is not None: activo_db.marca = activo.marca
        if activo.modelo is not None: activo_db.modelo = activo.modelo
        if activo.serie is not None: activo_db.serie = activo.serie
        if activo.codigo_inventario is not None: activo_db.codigo_inventario = activo.codigo_inventario
        if activo.observaciones is not None: activo_db.observaciones = activo.observaciones
        
        await self.db.commit()
        return {"success": True, "id": activo_id, "message": "Activo actualizado correctamente"}

    async def cambiar_estado(self, activo_id: int, cambio: CambioEstadoRequest, usuario_id: int = None) -> dict:
        stmt = select(Activo).options(selectinload(Activo.estado)).where(Activo.id == activo_id)
        res = await self.db.execute(stmt)
        activo_db = res.scalars().first()
        
        if not activo_db: raise HTTPException(404, "Activo no encontrado")
        
        # Validar que el nuevo estado existe
        stmt_estado = select(EstadoActivo).where(EstadoActivo.id == cambio.estado_nuevo_id)
        nuevo_estado = (await self.db.execute(stmt_estado)).scalars().first()
        if not nuevo_estado:
            raise HTTPException(400, "El estado especificado no existe")
        
        estado_anterior_id = activo_db.estado_id
        activo_db.estado_id = cambio.estado_nuevo_id
        activo_db.updated_at = func.now()
        
        await self._registrar_historial(
            activo_id, 
            estado_anterior_id, 
            cambio.estado_nuevo_id, 
            cambio.motivo, 
            cambio.observaciones, 
            None, 
            usuario_id
        )
        await self.db.commit()
        
        estado_anterior_nombre = activo_db.estado.nombre if activo_db.estado else "N/A"
        return {
            "success": True, 
            "id": activo_id, 
            "message": f"Estado cambiado de {estado_anterior_nombre} a {nuevo_estado.nombre}"
        }

    async def delete(self, activo_id: int) -> dict:
        """Dar de baja un activo (soft delete) usando is_active"""
        if not await self._activo_existe(activo_id): raise HTTPException(404, "Activo no encontrado")
        
        # OJO: Permitimos dar de baja aunque tenga asignación?
        # Por seguridad, mejor forzar la devolución primero para mantener consistencia.
        if await self._activo_tiene_asignacion_activa(activo_id):
            raise HTTPException(400, "No se puede dar de baja un activo asignado. Registre la devolución primero.")
        
        stmt = select(Activo).where(Activo.id == activo_id)
        activo_db = (await self.db.execute(stmt)).scalars().first()
        
        estado_actual_id = activo_db.estado_id
        
        # Desactivamos el activo
        activo_db.is_active = False
        activo_db.is_disponible = False
        activo_db.updated_at = func.now()
        
        # Registramos historial de la baja
        await self._registrar_historial(
            activo_id, 
            estado_actual_id, 
            estado_actual_id,   # Mantenemos el mismo estado físico
            "BAJA", 
            "Activo desactivado del sistema (Eliminación Lógica)", 
            None, 
            None
        )
        await self.db.commit()
        
        return {"success": True, "id": activo_id, "message": "Activo dado de baja correctamente"}

    async def get_dropdown(self) -> list:
        """Activos disponibles para asignar (excluye BAJA y DAÑADO)"""
        estado_baja = await self._get_estado_by_nombre("BAJA")
        estado_danado = await self._get_estado_by_nombre("DAÑADO")
        
        excluir_ids = []
        if estado_baja: excluir_ids.append(estado_baja.id)
        if estado_danado: excluir_ids.append(estado_danado.id)
        
        stmt = select(Activo).where(
            Activo.is_disponible == True,
            Activo.is_active == True
        )
        if excluir_ids:
            stmt = stmt.where(Activo.estado_id.notin_(excluir_ids))
        stmt = stmt.order_by(Activo.producto)
        
        res = await self.db.execute(stmt)
        activos = res.scalars().all()
        return [{
            "id": a.id, 
            "descripcion": f"{a.producto} {a.marca or ''} {a.modelo or ''} - S/N: {a.serie or ''}".strip()
        } for a in activos]
        
    async def get_dropdown_todos(self) -> list:
        """Todos los activos excepto los dados de baja"""
        estado_baja = await self._get_estado_by_nombre("BAJA")
        
        stmt = select(Activo).where(Activo.is_active == True)
        if estado_baja:
            stmt = stmt.where(Activo.estado_id != estado_baja.id)
        stmt = stmt.order_by(Activo.producto)
        
        res = await self.db.execute(stmt)
        activos = res.scalars().all()
        result = []
        for a in activos:
            suffix = ""
            if not a.is_disponible: suffix = " [ASIGNADO]"
            result.append({"id": a.id, "descripcion": f"{a.producto} {a.marca or ''}{suffix}".strip()})
        return result

    async def asignar_a_empleado(self, activo_id: int, asignacion: AsignacionActivoRequest, usuario_id: int = None) -> dict:
        stmt = select(Activo).where(Activo.id == activo_id)
        activo_db = (await self.db.execute(stmt)).scalars().first()
        
        if not activo_db: raise HTTPException(404, "Activo no encontrado")
        if not activo_db.is_disponible: raise HTTPException(400, "El activo no está disponible.")
        
        # Verify employee exists
        stmt_emp = select(func.count()).select_from(Empleado).where(Empleado.id == asignacion.empleado_id)
        if (await self.db.execute(stmt_emp)).scalar() == 0: raise HTTPException(404, "Empleado no encontrado")
        
        # Validar estado_entrega_id si se proporciona
        estado_entrega_id = asignacion.estado_entrega_id
        if estado_entrega_id:
            stmt_estado = select(func.count()).select_from(EstadoActivo).where(EstadoActivo.id == estado_entrega_id)
            if (await self.db.execute(stmt_estado)).scalar() == 0:
                raise HTTPException(400, "El estado de entrega especificado no existe")
        
        nueva_asignacion = EmpleadoActivo(
            empleado_id=asignacion.empleado_id,
            activo_id=activo_id,
            observaciones=asignacion.observaciones,
            asignado_por=usuario_id,
            fecha_entrega=func.now(),
            estado_entrega_id=estado_entrega_id
        )
        self.db.add(nueva_asignacion)
        
        activo_db.is_disponible = False
        activo_db.updated_at = func.now()
        
        await self.db.flush()  # get id
        
        # Obtener estado para historial
        estado_asignado = await self._get_estado_by_nombre("ASIGNADO")
        estado_nuevo_id = estado_asignado.id if estado_asignado else activo_db.estado_id
        
        await self._registrar_historial(
            activo_id, 
            activo_db.estado_id, 
            estado_nuevo_id, 
            "ASIGNACION", 
            f"Asignado a empleado {asignacion.empleado_id}", 
            nueva_asignacion.id, 
            usuario_id
        )
        await self.db.commit()
        
        return {"success": True, "message": "Activo asignado correctamente"}

    async def devolver_activo(self, activo_id: int, devolucion: DevolucionActivoRequest, usuario_id: int = None) -> dict:
        if not await self._activo_existe(activo_id): raise HTTPException(404, "Activo no encontrado")
        
        # Find assignment
        stmt = select(EmpleadoActivo).where(EmpleadoActivo.activo_id == activo_id, EmpleadoActivo.fecha_devolucion.is_(None))
        asignacion = (await self.db.execute(stmt)).scalars().first()
        
        if not asignacion: raise HTTPException(400, "El activo no tiene asignación activa.")
        
        stmt_act = select(Activo).options(selectinload(Activo.estado)).where(Activo.id == activo_id)
        activo_db = (await self.db.execute(stmt_act)).scalars().first()
        estado_anterior_id = activo_db.estado_id
        
        # Validar estado_devolucion_id
        estado_devolucion_id = devolucion.estado_devolucion_id
        stmt_estado = select(EstadoActivo).where(EstadoActivo.id == estado_devolucion_id)
        nuevo_estado = (await self.db.execute(stmt_estado)).scalars().first()
        if not nuevo_estado:
            raise HTTPException(400, "El estado de devolución especificado no existe")
        
        # Update Assignment
        asignacion.fecha_devolucion = func.now()
        asignacion.estado_devolucion_id = estado_devolucion_id
        if devolucion.observaciones:
            asignacion.observaciones = (asignacion.observaciones or "") + f" | Devolución: {devolucion.observaciones}"
            
        # Update Activo
        activo_db.is_disponible = True
        activo_db.estado_id = estado_devolucion_id
        activo_db.updated_at = func.now()
        
        await self._registrar_historial(
            activo_id, 
            estado_anterior_id, 
            estado_devolucion_id, 
            devolucion.motivo, 
            f"Devolución: {devolucion.observaciones}", 
            asignacion.id, 
            usuario_id
        )
        await self.db.commit()
        
        return {"success": True, "message": "Devolución registrada correctamente"}

    async def get_activos_empleado(self, empleado_id: int) -> list:
        stmt = select(Activo, EmpleadoActivo).options(
            selectinload(Activo.estado)
        ).join(EmpleadoActivo).where(
            EmpleadoActivo.empleado_id == empleado_id,
            EmpleadoActivo.fecha_devolucion.is_(None)
        ).order_by(EmpleadoActivo.fecha_entrega.desc())
        
        result = await self.db.execute(stmt)
        data = []
        for act, asig in result.all():
            data.append({
                "id": act.id,
                "producto": act.producto,
                "marca": act.marca,
                "modelo": act.modelo,
                "serie": act.serie,
                "codigo_inventario": act.codigo_inventario,
                "estado_id": act.estado_id,
                "estado_nombre": act.estado.nombre if act.estado else None,
                "fecha_entrega": asig.fecha_entrega,
                "asignacion_id": asig.id
            })
        return data
