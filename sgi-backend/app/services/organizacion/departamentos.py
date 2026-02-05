from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from fastapi import HTTPException
from app.schemas.organizacion.departamentos import (
    DepartamentoCreate, 
    DepartamentoUpdate, 
    OperationResult,
    DepartamentoPaginationResponse,
    DepartamentoDropDown
)
from app.services.validators import CommonValidators
from app.models.administrativo import Departamento, Empleado


class DepartamentoService:
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.validators = CommonValidators(db)

    # =========================================================================
    # OPERACIONES CRUD
    # =========================================================================

    # Obtener todos los departamentos
    async def get_all(self, busqueda: str = None, page: int = 1, page_size: int = 15) -> dict:
        """Obtiene todos los departamentos con paginación y búsqueda"""
        offset = (page - 1) * page_size
        
        # Query base con join al responsable
        base_query = select(Departamento).options(
            joinedload(Departamento.responsable)
        ).where(Departamento.is_active == True)
        
        # Aplicar filtro de búsqueda
        if busqueda:
            base_query = base_query.where(Departamento.nombre.ilike(f"%{busqueda}%"))
        
        # Contar total
        count_query = select(func.count()).select_from(Departamento).where(Departamento.is_active == True)
        if busqueda:
            count_query = count_query.where(Departamento.nombre.ilike(f"%{busqueda}%"))
        
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Obtener datos paginados
        data_query = base_query.order_by(Departamento.id).offset(offset).limit(page_size)
        result = await self.db.execute(data_query)
        departamentos = result.scalars().unique().all()
        
        # Formatear respuesta
        data = []
        for depto in departamentos:
            responsable_nombre = "Sin asignar"
            if depto.responsable:
                responsable_nombre = f"{depto.responsable.nombres} {depto.responsable.apellido_paterno}"
            
            data.append({
                "id": depto.id,
                "nombre": depto.nombre,
                "descripcion": depto.descripcion,
                "responsable_id": depto.responsable_id,
                "responsable_nombre": responsable_nombre,
                "is_active": depto.is_active,
                "created_at": depto.created_at,
                "updated_at": depto.updated_at
            })
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            "data": data
        }

    # Obtener un departamento por su ID
    async def get_by_id(self, depto_id: int) -> dict:
        """Obtiene un departamento por su ID"""
        query = select(Departamento).options(
            joinedload(Departamento.responsable)
        ).where(Departamento.id == depto_id)
        
        result = await self.db.execute(query)
        depto = result.scalars().first()
        
        if not depto:
            return None
        
        responsable_nombre = "Sin asignar"
        if depto.responsable:
            responsable_nombre = f"{depto.responsable.nombres} {depto.responsable.apellido_paterno}"
        
        return {
            "id": depto.id,
            "nombre": depto.nombre,
            "descripcion": depto.descripcion,
            "responsable_id": depto.responsable_id,
            "responsable_nombre": responsable_nombre,
            "is_active": depto.is_active,
            "created_at": depto.created_at,
            "updated_at": depto.updated_at
        }

    # Crear un nuevo departamento
    async def create(self, depto: DepartamentoCreate) -> dict:
        """Crea un nuevo departamento"""
        
        # Validación: Nombre único
        if await self.validators.nombre_duplicado_departamento(depto.nombre.strip()):
            raise HTTPException(400, f'Ya existe un departamento activo con el nombre "{depto.nombre}".')
        
        # Validación: Responsable existe
        if depto.responsable_id and not await self.validators.empleado_existe(depto.responsable_id):
            raise HTTPException(400, "El empleado responsable especificado no existe o está inactivo.")
        
        # Crear instancia del modelo
        nuevo_depto = Departamento(
            nombre=depto.nombre.strip(),
            descripcion=depto.descripcion,
            responsable_id=depto.responsable_id
        )
        
        self.db.add(nuevo_depto)
        await self.db.commit()
        await self.db.refresh(nuevo_depto)
        
        return {"success": True, "id": nuevo_depto.id, "message": "Departamento creado exitosamente"}

    # Actualizar un departamento
    async def update(self, depto_id: int, depto: DepartamentoUpdate) -> dict:
        """Actualiza un departamento existente"""
        
        # Validación: Existe
        if not await self.validators.departamento_existe(depto_id):
            raise HTTPException(404, "El departamento especificado no existe.")
        
        # Validación: Nombre único
        if await self.validators.nombre_duplicado_departamento(depto.nombre.strip(), exclude_id=depto_id):
            raise HTTPException(400, f'Ya existe otro departamento con el nombre "{depto.nombre}".')
        
        # Validación: Responsable existe
        if depto.responsable_id and not await self.validators.empleado_existe(depto.responsable_id):
            raise HTTPException(400, "El empleado responsable especificado no existe o está inactivo.")
        
        # Obtener y actualizar el departamento
        result = await self.db.execute(
            select(Departamento).where(Departamento.id == depto_id)
        )
        depto_db = result.scalars().first()
        
        depto_db.nombre = depto.nombre.strip()
        depto_db.descripcion = depto.descripcion
        depto_db.responsable_id = depto.responsable_id
        depto_db.updated_at = func.now()
        
        await self.db.commit()
        
        return {"success": True, "id": depto_id, "message": "Departamento actualizado correctamente"}

    # Desactivar un departamento
    async def delete(self, depto_id: int) -> dict:
        """Desactiva un departamento (soft delete)"""
        
        # Validación: Existe
        if not await self.validators.departamento_existe(depto_id):
            raise HTTPException(404, "El departamento especificado no existe.")
        
        # Validación: No tiene áreas activas
        if await self.validators.departamento_tiene_areas_activas(depto_id):
            raise HTTPException(400, "No se puede desactivar un departamento que tiene áreas activas.")
        
        # Validación: No tiene empleados activos
        if await self.validators.departamento_tiene_empleados_activos(depto_id):
            raise HTTPException(400, "No se puede desactivar un departamento que tiene empleados activos asignados.")
        
        # Obtener y desactivar
        result = await self.db.execute(
            select(Departamento).where(Departamento.id == depto_id)
        )
        depto_db = result.scalars().first()
        
        depto_db.is_active = False
        depto_db.updated_at = func.now()
        
        await self.db.commit()
        
        return {"success": True, "id": depto_id, "message": "Departamento desactivado correctamente"}

    # Reactivar un departamento
    async def reactivate(self, depto_id: int) -> dict:
        """Reactiva un departamento"""
        
        # Verificar existencia
        result = await self.db.execute(
            select(Departamento).where(Departamento.id == depto_id)
        )
        depto_db = result.scalars().first()
        
        if not depto_db:
            raise HTTPException(404, "El departamento especificado no existe.")
        
        depto_db.is_active = True
        depto_db.updated_at = func.now()
        
        await self.db.commit()
        
        return {"success": True, "id": depto_id, "message": "Departamento reactivado correctamente"}

    # Lista simple de departamentos activos para dropdowns
    async def get_dropdown(self) -> list:
        """Lista simple de departamentos activos para dropdowns"""
        query = select(Departamento.id, Departamento.nombre).where(
            Departamento.is_active == True
        ).order_by(Departamento.nombre)
        
        result = await self.db.execute(query)
        rows = result.all()
        
        return [{"id": row.id, "nombre": row.nombre} for row in rows]