from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from datetime import datetime

from app.models.administrativo import LineaCorporativa, LineaHistorial, Activo, Empleado, EmpleadoActivo
from app.schemas.organizacion.lineas import (
    LineaCreate, LineaUpdate, CambiarCelularRequest, AsignarEmpleadoRequest
)


class LineaService:
    """Servicio para gestión de líneas corporativas"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _registrar_historial(
        self,
        linea_id: int,
        tipo_cambio: str,
        activo_anterior_id: int = None,
        activo_nuevo_id: int = None,
        empleado_anterior_id: int = None,
        empleado_nuevo_id: int = None,
        observaciones: str = None,
        usuario_id: int = None
    ):
        """Registra un cambio en el historial de la línea"""
        historial = LineaHistorial(
            linea_id=linea_id,
            tipo_cambio=tipo_cambio,
            activo_anterior_id=activo_anterior_id,
            activo_nuevo_id=activo_nuevo_id,
            empleado_anterior_id=empleado_anterior_id,
            empleado_nuevo_id=empleado_nuevo_id,
            observaciones=observaciones,
            registrado_por=usuario_id
        )
        self.db.add(historial)

    async def get_all(
        self,
        busqueda: str = None,
        empleado_id: int = None,
        solo_disponibles: bool = None,
        page: int = 1,
        page_size: int = 15
    ) -> dict:
        """Lista todas las líneas con paginación y filtros"""
        offset = (page - 1) * page_size
        
        stmt = select(LineaCorporativa).options(
            selectinload(LineaCorporativa.activo),
            selectinload(LineaCorporativa.empleado)
        ).where(LineaCorporativa.is_active == True)
        
        if busqueda:
            stmt = stmt.where(or_(
                LineaCorporativa.numero.ilike(f"%{busqueda}%"),
                LineaCorporativa.gmail.ilike(f"%{busqueda}%"),
                LineaCorporativa.operador.ilike(f"%{busqueda}%")
            ))
        
        if empleado_id is not None:
            stmt = stmt.where(LineaCorporativa.empleado_id == empleado_id)
        
        if solo_disponibles is True:
            stmt = stmt.where(LineaCorporativa.empleado_id.is_(None))
        elif solo_disponibles is False:
            stmt = stmt.where(LineaCorporativa.empleado_id.isnot(None))
        
        # Count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0
        
        # Data
        stmt = stmt.order_by(LineaCorporativa.numero).offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        lineas = result.scalars().all()
        
        data = []
        for l in lineas:
            data.append({
                "id": l.id,
                "numero": l.numero,
                "gmail": l.gmail,
                "operador": l.operador,
                "plan": l.plan,
                "proveedor": l.proveedor,
                "activo_id": l.activo_id,
                "activo_nombre": f"{l.activo.producto} {l.activo.marca or ''}" if l.activo else None,
                "empleado_id": l.empleado_id,
                "empleado_nombre": f"{l.empleado.nombres} {l.empleado.apellido_paterno}" if l.empleado else None,
                "fecha_asignacion": l.fecha_asignacion,
                "is_active": l.is_active,
                "observaciones": l.observaciones,
                "created_at": l.created_at,
                "updated_at": l.updated_at
            })
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            "data": data
        }

    async def get_by_id(self, linea_id: int) -> dict:
        """Obtiene una línea por ID"""
        stmt = select(LineaCorporativa).options(
            selectinload(LineaCorporativa.activo),
            selectinload(LineaCorporativa.empleado)
        ).where(LineaCorporativa.id == linea_id)
        
        result = await self.db.execute(stmt)
        l = result.scalars().first()
        
        if not l:
            return None
        
        return {
            "id": l.id,
            "numero": l.numero,
            "gmail": l.gmail,
            "operador": l.operador,
            "plan": l.plan,
            "proveedor": l.proveedor,
            "activo_id": l.activo_id,
            "activo_nombre": f"{l.activo.producto} {l.activo.marca or ''}" if l.activo else None,
            "empleado_id": l.empleado_id,
            "empleado_nombre": f"{l.empleado.nombres} {l.empleado.apellido_paterno}" if l.empleado else None,
            "fecha_asignacion": l.fecha_asignacion,
            "is_active": l.is_active,
            "observaciones": l.observaciones,
            "created_at": l.created_at,
            "updated_at": l.updated_at
        }

    async def get_historial(self, linea_id: int) -> list:
        """Obtiene el historial de cambios de una línea"""
        stmt = select(LineaHistorial).where(
            LineaHistorial.linea_id == linea_id
        ).order_by(LineaHistorial.fecha_cambio.desc())
        
        result = await self.db.execute(stmt)
        registros = result.scalars().all()
        
        historial = []
        for h in registros:
            # Get related names
            activo_anterior_nombre = None
            activo_nuevo_nombre = None
            empleado_anterior_nombre = None
            empleado_nuevo_nombre = None
            
            if h.activo_anterior_id:
                activo = await self.db.get(Activo, h.activo_anterior_id)
                if activo:
                    activo_anterior_nombre = f"{activo.producto} {activo.marca or ''}"
            
            if h.activo_nuevo_id:
                activo = await self.db.get(Activo, h.activo_nuevo_id)
                if activo:
                    activo_nuevo_nombre = f"{activo.producto} {activo.marca or ''}"
            
            if h.empleado_anterior_id:
                emp = await self.db.get(Empleado, h.empleado_anterior_id)
                if emp:
                    empleado_anterior_nombre = f"{emp.nombres} {emp.apellido_paterno}"
            
            if h.empleado_nuevo_id:
                emp = await self.db.get(Empleado, h.empleado_nuevo_id)
                if emp:
                    empleado_nuevo_nombre = f"{emp.nombres} {emp.apellido_paterno}"
            
            historial.append({
                "id": h.id,
                "tipo_cambio": h.tipo_cambio,
                "activo_anterior_nombre": activo_anterior_nombre,
                "activo_nuevo_nombre": activo_nuevo_nombre,
                "empleado_anterior_nombre": empleado_anterior_nombre,
                "empleado_nuevo_nombre": empleado_nuevo_nombre,
                "observaciones": h.observaciones,
                "registrado_por_nombre": None,  # TODO: get user name
                "fecha_cambio": h.fecha_cambio
            })
        
        return historial

    async def _get_empleado_del_activo(self, activo_id: int) -> int | None:
        """Obtiene el ID del empleado que tiene asignado el activo actualmente"""
        if not activo_id:
            return None
            
        stmt = select(EmpleadoActivo).where(
            EmpleadoActivo.activo_id == activo_id,
            EmpleadoActivo.fecha_devolucion.is_(None)
        )
        asignacion = (await self.db.execute(stmt)).scalars().first()
        return asignacion.empleado_id if asignacion else None

    async def create(self, data: LineaCreate, usuario_id: int = None) -> dict:
        """Crea una nueva línea corporativa"""
        # Validar que número y gmail no existan
        stmt = select(LineaCorporativa).where(
            or_(
                LineaCorporativa.numero == data.numero,
                LineaCorporativa.gmail == data.gmail
            )
        )
        existing = (await self.db.execute(stmt)).scalars().first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe una línea con ese número o gmail")
        
        # Validar que el celular no tenga otra línea
        if data.activo_id:
            stmt = select(LineaCorporativa).where(
                LineaCorporativa.activo_id == data.activo_id,
                LineaCorporativa.is_active == True
            )
            existing = (await self.db.execute(stmt)).scalars().first()
            if existing:
                raise HTTPException(status_code=400, detail="Ese celular ya tiene una línea asignada")
        
        # Auto-detectar empleado si hay activo asignado
        empleado_id = data.empleado_id
        if data.activo_id:
            empleado_activo_id = await self._get_empleado_del_activo(data.activo_id)
            if empleado_activo_id:
                empleado_id = empleado_activo_id
        
        linea = LineaCorporativa(
            numero=data.numero,
            gmail=data.gmail,
            operador=data.operador,
            plan=data.plan,
            proveedor=data.proveedor,
            activo_id=data.activo_id,
            empleado_id=empleado_id, # Usar el detectado o el original
            fecha_asignacion=datetime.now() if empleado_id else None,
            observaciones=data.observaciones
        )
        
        self.db.add(linea)
        await self.db.flush()
        
        # Registrar historial
        await self._registrar_historial(
            linea_id=linea.id,
            tipo_cambio="CREACION",
            activo_nuevo_id=data.activo_id,
            empleado_nuevo_id=empleado_id,
            observaciones="Línea creada",
            usuario_id=usuario_id
        )
        
        await self.db.commit()
        
        return {"success": True, "message": "Línea creada correctamente", "id": linea.id}

    async def update(self, linea_id: int, data: LineaUpdate) -> dict:
        """Actualiza datos básicos de una línea"""
        linea = await self.db.get(LineaCorporativa, linea_id)
        if not linea:
            raise HTTPException(status_code=404, detail="Línea no encontrada")
        
        if data.numero and data.numero != linea.numero:
            stmt = select(LineaCorporativa).where(
                LineaCorporativa.numero == data.numero,
                LineaCorporativa.id != linea_id
            )
            if (await self.db.execute(stmt)).scalars().first():
                raise HTTPException(status_code=400, detail="Ya existe una línea con ese número")
            linea.numero = data.numero
        
        if data.gmail and data.gmail != linea.gmail:
            stmt = select(LineaCorporativa).where(
                LineaCorporativa.gmail == data.gmail,
                LineaCorporativa.id != linea_id
            )
            if (await self.db.execute(stmt)).scalars().first():
                raise HTTPException(status_code=400, detail="Ya existe una línea con ese gmail")
            linea.gmail = data.gmail
        
        if data.operador is not None:
            linea.operador = data.operador
        if data.plan is not None:
            linea.plan = data.plan
        if data.proveedor is not None:
            linea.proveedor = data.proveedor
        if data.observaciones is not None:
            linea.observaciones = data.observaciones
        
        await self.db.commit()
        
        return {"success": True, "message": "Línea actualizada correctamente", "id": linea_id}

    async def cambiar_celular(self, linea_id: int, data: CambiarCelularRequest, usuario_id: int = None) -> dict:
        """Mueve la línea a otro celular (cuando el anterior se daña)"""
        linea = await self.db.get(LineaCorporativa, linea_id)
        if not linea:
            raise HTTPException(status_code=404, detail="Línea no encontrada")
        
        # Validar que el nuevo celular no tenga otra línea
        stmt = select(LineaCorporativa).where(
            LineaCorporativa.activo_id == data.nuevo_activo_id,
            LineaCorporativa.is_active == True,
            LineaCorporativa.id != linea_id
        )
        existing = (await self.db.execute(stmt)).scalars().first()
        if existing:
            raise HTTPException(status_code=400, detail="Ese celular ya tiene una línea asignada")
        
        activo_anterior_id = linea.activo_id
        empleado_anterior_id = linea.empleado_id
        
        linea.activo_id = data.nuevo_activo_id
        
        # Auto-detectar empleado del nuevo activo
        empleado_activo_id = await self._get_empleado_del_activo(data.nuevo_activo_id)
        
        # Si el nuevo activo tiene empleado, asignamos la línea a ese empleado
        empleado_nuevo_id = empleado_anterior_id
        if empleado_activo_id:
             linea.empleado_id = empleado_activo_id
             if empleado_anterior_id != empleado_activo_id:
                 linea.fecha_asignacion = datetime.now()
             empleado_nuevo_id = empleado_activo_id
        
        # Registrar historial
        await self._registrar_historial(
            linea_id=linea_id,
            tipo_cambio="CAMBIO_CELULAR",
            activo_anterior_id=activo_anterior_id,
            activo_nuevo_id=data.nuevo_activo_id,
            empleado_anterior_id=empleado_anterior_id if empleado_anterior_id != empleado_nuevo_id else None,
            empleado_nuevo_id=empleado_nuevo_id if empleado_anterior_id != empleado_nuevo_id else None,
            observaciones=data.observaciones or "Cambio de celular",
            usuario_id=usuario_id
        )
        
        await self.db.commit()
        
        return {"success": True, "message": "Línea movida a nuevo celular correctamente", "id": linea_id}

    async def asignar_empleado(self, linea_id: int, data: AsignarEmpleadoRequest, usuario_id: int = None) -> dict:
        """Asigna la línea a un empleado"""
        linea = await self.db.get(LineaCorporativa, linea_id)
        if not linea:
            raise HTTPException(status_code=404, detail="Línea no encontrada")
        
        if linea.activo_id:
            raise HTTPException(
                status_code=400, 
                detail="Esta línea está enlazada a un equipo. Para cambiar el responsable, asigne el equipo al empleado correspondiente desde Inventario."
            )
        
        empleado_anterior_id = linea.empleado_id
        linea.empleado_id = data.empleado_id
        linea.fecha_asignacion = datetime.now()
        
        # Registrar historial
        await self._registrar_historial(
            linea_id=linea_id,
            tipo_cambio="ASIGNACION",
            empleado_anterior_id=empleado_anterior_id,
            empleado_nuevo_id=data.empleado_id,
            observaciones=data.observaciones or "Asignación a empleado",
            usuario_id=usuario_id
        )
        
        await self.db.commit()
        
        return {"success": True, "message": "Línea asignada correctamente", "id": linea_id}

    async def desasignar_empleado(self, linea_id: int, observaciones: str = None, usuario_id: int = None) -> dict:
        """Desasigna la línea del empleado actual"""
        linea = await self.db.get(LineaCorporativa, linea_id)
        if not linea:
            raise HTTPException(status_code=404, detail="Línea no encontrada")
        
        if not linea.empleado_id:
            raise HTTPException(status_code=400, detail="La línea no está asignada a ningún empleado")
        
        empleado_anterior_id = linea.empleado_id
        linea.empleado_id = None
        linea.fecha_asignacion = None
        
        # Registrar historial
        await self._registrar_historial(
            linea_id=linea_id,
            tipo_cambio="DESASIGNACION",
            empleado_anterior_id=empleado_anterior_id,
            observaciones=observaciones or "Línea desasignada",
            usuario_id=usuario_id
        )
        
        await self.db.commit()
        
        return {"success": True, "message": "Línea desasignada correctamente", "id": linea_id}

    async def delete(self, linea_id: int, usuario_id: int = None) -> dict:
        """Da de baja una línea (soft delete)"""
        linea = await self.db.get(LineaCorporativa, linea_id)
        if not linea:
            raise HTTPException(status_code=404, detail="Línea no encontrada")
        
        linea.is_active = False
        
        # Registrar historial
        await self._registrar_historial(
            linea_id=linea_id,
            tipo_cambio="BAJA",
            observaciones="Línea dada de baja",
            usuario_id=usuario_id
        )
        
        await self.db.commit()
        
        return {"success": True, "message": "Línea dada de baja correctamente", "id": linea_id}

    async def get_dropdown(self) -> list:
        """Obtiene líneas disponibles para dropdown"""
        stmt = select(LineaCorporativa).where(
            LineaCorporativa.is_active == True,
            LineaCorporativa.empleado_id.is_(None)
        ).order_by(LineaCorporativa.numero)
        
        result = await self.db.execute(stmt)
        lineas = result.scalars().all()
        
        return [{"id": l.id, "numero": l.numero, "gmail": l.gmail} for l in lineas]
