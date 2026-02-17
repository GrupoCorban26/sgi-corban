from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from datetime import datetime

from app.models.administrativo import LineaCorporativa, LineaHistorial, Activo, Empleado, EmpleadoActivo
from app.schemas.organizacion.lineas import (
    LineaCreate, LineaUpdate, CambiarCelularRequest
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
        """Lista todas las líneas con paginación y filtros.
        Usa LEFT JOINs explícitos para resolver el empleado responsable
        via la cadena: Línea → Activo → EmpleadoActivo → Empleado.
        """
        offset = (page - 1) * page_size
        
        # Query con LEFT JOINs explícitos para traer todo en un solo viaje
        stmt = (
            select(
                LineaCorporativa,
                Activo.producto.label("activo_producto"),
                Activo.marca.label("activo_marca"),
                Activo.serie.label("activo_serie"),
                Empleado.id.label("resp_id"),
                Empleado.nombres.label("resp_nombres"),
                Empleado.apellido_paterno.label("resp_apellido"),
            )
            .outerjoin(Activo, LineaCorporativa.activo_id == Activo.id)
            .outerjoin(
                EmpleadoActivo,
                (Activo.id == EmpleadoActivo.activo_id) & (EmpleadoActivo.fecha_devolucion.is_(None))
            )
            .outerjoin(Empleado, EmpleadoActivo.empleado_id == Empleado.id)
            .where(LineaCorporativa.is_active == True)
        )
        
        if busqueda:
            stmt = stmt.where(or_(
                LineaCorporativa.numero.ilike(f"%{busqueda}%"),
                LineaCorporativa.gmail.ilike(f"%{busqueda}%"),
                LineaCorporativa.operador.ilike(f"%{busqueda}%")
            ))
            
        if empleado_id is not None:
            stmt = stmt.where(Empleado.id == empleado_id)
        
        # Data sorting & pagination
        stmt = stmt.order_by(LineaCorporativa.numero).offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        rows = result.all()
        
        # Count
        count_stmt = select(func.count()).select_from(LineaCorporativa).where(LineaCorporativa.is_active == True)
        if busqueda:
            count_stmt = count_stmt.where(or_(
                LineaCorporativa.numero.ilike(f"%{busqueda}%"),
                LineaCorporativa.gmail.ilike(f"%{busqueda}%")
            ))
        total = (await self.db.execute(count_stmt)).scalar() or 0
        
        data = []
        for row in rows:
            l = row[0]  # LineaCorporativa object
            
            activo_nombre = None
            if row.activo_producto:
                activo_nombre = f"{row.activo_producto} {row.activo_marca or ''}".strip()
            
            data.append({
                "id": l.id,
                "numero": l.numero,
                "gmail": l.gmail,
                "operador": l.operador,
                "plan": l.plan,
                "proveedor": l.proveedor,
                "activo_id": l.activo_id,
                "activo_nombre": activo_nombre,
                "activo_serie": row.activo_serie,
                "empleado_id": row.resp_id,
                "empleado_nombre": f"{row.resp_nombres} {row.resp_apellido}" if row.resp_id else None,
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
        """Obtiene una línea por ID con JOINs explícitos"""
        stmt = (
            select(
                LineaCorporativa,
                Activo.producto.label("activo_producto"),
                Activo.marca.label("activo_marca"),
                Activo.serie.label("activo_serie"),
                Empleado.id.label("resp_id"),
                Empleado.nombres.label("resp_nombres"),
                Empleado.apellido_paterno.label("resp_apellido"),
            )
            .outerjoin(Activo, LineaCorporativa.activo_id == Activo.id)
            .outerjoin(
                EmpleadoActivo,
                (Activo.id == EmpleadoActivo.activo_id) & (EmpleadoActivo.fecha_devolucion.is_(None))
            )
            .outerjoin(Empleado, EmpleadoActivo.empleado_id == Empleado.id)
            .where(LineaCorporativa.id == linea_id)
        )
        
        result = await self.db.execute(stmt)
        row = result.first()
        
        if not row:
            return None
        
        l = row[0]
        activo_nombre = None
        if row.activo_producto:
            activo_nombre = f"{row.activo_producto} {row.activo_marca or ''}".strip()
        
        return {
            "id": l.id,
            "numero": l.numero,
            "gmail": l.gmail,
            "operador": l.operador,
            "plan": l.plan,
            "proveedor": l.proveedor,
            "activo_id": l.activo_id,
            "activo_nombre": activo_nombre,
            "activo_serie": row.activo_serie,
            "empleado_id": row.resp_id,
            "empleado_nombre": f"{row.resp_nombres} {row.resp_apellido}" if row.resp_id else None,
            "fecha_asignacion": l.fecha_asignacion,
            "is_active": l.is_active,
            "observaciones": l.observaciones,
            "created_at": l.created_at,
            "updated_at": l.updated_at
        }
    
    
    async def get_historial(self, linea_id: int) -> list:
        """Obtiene el historial de cambios de una línea"""
        stmt = select(LineaHistorial).options(
            selectinload(LineaHistorial.usuario),
            selectinload(LineaHistorial.activo_anterior),
            selectinload(LineaHistorial.activo_nuevo),
            selectinload(LineaHistorial.empleado_anterior),
            selectinload(LineaHistorial.empleado_nuevo)
        ).where(LineaHistorial.linea_id == linea_id).order_by(LineaHistorial.fecha_cambio.desc())

        result = await self.db.execute(stmt)
        historial = result.scalars().all()

        return [
            {
                "id": h.id,
                "tipo_cambio": h.tipo_cambio,
                "fecha_cambio": h.fecha_cambio,
                "observaciones": h.observaciones,
                "registrado_por_nombre": h.usuario.correo_corp if h.usuario else "Sistema",
                "activo_anterior_nombre": f"{h.activo_anterior.producto} {h.activo_anterior.marca}" if h.activo_anterior else None,
                "activo_nuevo_nombre": f"{h.activo_nuevo.producto} {h.activo_nuevo.marca}" if h.activo_nuevo else None,
                "empleado_anterior_nombre": f"{h.empleado_anterior.nombres} {h.empleado_anterior.apellido_paterno}" if h.empleado_anterior else None,
                "empleado_nuevo_nombre": f"{h.empleado_nuevo.nombres} {h.empleado_nuevo.apellido_paterno}" if h.empleado_nuevo else None,
            }
            for h in historial
        ]

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
        
        # En Device-Centric, NO guardamos empleado_id en la tabla.
        # Se deriva dinámicamente.
        
        linea = LineaCorporativa(
            numero=data.numero,
            gmail=data.gmail,
            operador=data.operador,
            plan=data.plan,
            proveedor=data.proveedor,
            activo_id=data.activo_id,
            fecha_asignacion=datetime.now(),
            observaciones=data.observaciones
        )
        
        self.db.add(linea)
        await self.db.flush()
        
        # Registrar historial
        await self._registrar_historial(
            linea_id=linea.id,
            tipo_cambio="CREACION",
            activo_nuevo_id=data.activo_id,
            empleado_nuevo_id=None, # No tracking redundant employee history on line
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
        # empleado_anterior_id deprecado
        
        linea.activo_id = data.nuevo_activo_id
        
        # Registrar historial
        await self._registrar_historial(
            linea_id=linea_id,
            tipo_cambio="CAMBIO_CELULAR",
            activo_anterior_id=activo_anterior_id,
            activo_nuevo_id=data.nuevo_activo_id,
            observaciones=data.observaciones or "Cambio de celular",
            usuario_id=usuario_id
        )
        
        await self.db.commit()
        
        return {"success": True, "message": "Línea movida a nuevo celular correctamente", "id": linea_id}

    async def desasignar_empleado(self, linea_id: int, observaciones: str = None, usuario_id: int = None) -> dict:
        """
        [DEPRECATED FLOW]
        En el modelo Device-Centric, se desasigna devolviendo el activo en Inventario.
        """
        linea = await self.db.get(LineaCorporativa, linea_id)
        if not linea:
            raise HTTPException(status_code=404, detail="Línea no encontrada")
        
        if linea.activo_id:
            raise HTTPException(
                status_code=400,
                detail="Esta línea está en un celular. Realice la devolución del celular en el módulo de Inventario."
            )
        
        # Chip suelto sin activo: ya está desasignado por definición
        return {"success": True, "message": "Línea desasignada", "id": linea_id}

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
            LineaCorporativa.activo_id.is_(None)
        ).order_by(LineaCorporativa.numero)
        
        result = await self.db.execute(stmt)
        lineas = result.scalars().all()
        
        return [{"id": l.id, "numero": l.numero, "gmail": l.gmail} for l in lineas]
