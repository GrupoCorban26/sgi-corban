from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException
from app.schemas.organizacion.departamentos import (
    DepartamentoCreate, 
    DepartamentoUpdate, 
    OperationResult,
    DepartamentoPaginationResponse,
    DepartamentoDropDown
)
from app.services.validators import CommonValidators


class DepartamentoService:
    """
    Servicio de Departamentos - Patrón Python-Native
    Usa CommonValidators para validaciones compartidas.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.validators = CommonValidators(db)

    # =========================================================================
    # OPERACIONES CRUD
    # =========================================================================

    async def get_all(self, busqueda: str = None, page: int = 1, page_size: int = 15) -> dict:
        """Lista departamentos con paginación y búsqueda"""
        offset = (page - 1) * page_size
        
        where_clauses = ["d.is_active = 1"]
        params = {"offset": offset, "page_size": page_size}
        
        if busqueda:
            where_clauses.append("d.nombre LIKE '%' + :busqueda + '%'")
            params["busqueda"] = busqueda
        
        where_sql = " AND ".join(where_clauses)
        
        # Contar total
        count_query = text(f"SELECT COUNT(*) FROM adm.departamentos d WHERE {where_sql}")
        count_result = await self.db.execute(count_query, params)
        total = count_result.scalar() or 0
        
        # Obtener datos
        data_query = text(f"""
            SELECT 
                d.id, 
                d.nombre, 
                d.descripcion, 
                d.responsable_id,
                ISNULL(e.nombres + ' ' + e.apellido_paterno, 'Sin asignar') AS responsable_nombre,
                d.is_active, 
                d.created_at,
                d.updated_at
            FROM adm.departamentos d
            LEFT JOIN adm.empleados e ON e.id = d.responsable_id
            WHERE {where_sql}
            ORDER BY d.id
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
        """)
        
        result = await self.db.execute(data_query, params)
        data = result.mappings().all()
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            "data": [dict(row) for row in data]
        }

    async def get_by_id(self, depto_id: int) -> dict:
        """Obtiene un departamento por su ID"""
        query = text("""
            SELECT 
                d.id, d.nombre, d.descripcion, d.responsable_id,
                ISNULL(e.nombres + ' ' + e.apellido_paterno, 'Sin asignar') AS responsable_nombre,
                d.is_active, d.created_at, d.updated_at
            FROM adm.departamentos d
            LEFT JOIN adm.empleados e ON e.id = d.responsable_id
            WHERE d.id = :id
        """)
        result = await self.db.execute(query, {"id": depto_id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def create(self, depto: DepartamentoCreate) -> dict:
        """Crea un nuevo departamento"""
        
        # Validación: Nombre único
        if await self.validators.nombre_duplicado_departamento(depto.nombre.strip()):
            raise HTTPException(400, f'Ya existe un departamento activo con el nombre "{depto.nombre}".')
        
        # Validación: Responsable existe
        if depto.responsable_id and not await self.validators.empleado_existe(depto.responsable_id):
            raise HTTPException(400, "El empleado responsable especificado no existe o está inactivo.")
        
        query = text("""
            INSERT INTO adm.departamentos (nombre, descripcion, responsable_id)
            OUTPUT INSERTED.id
            VALUES (LTRIM(RTRIM(:nombre)), :descripcion, :responsable_id)
        """)
        
        result = await self.db.execute(query, {
            "nombre": depto.nombre,
            "descripcion": depto.descripcion,
            "responsable_id": depto.responsable_id
        })
        await self.db.commit()
        
        row = result.first()
        return {"success": True, "id": row[0], "message": "Departamento creado exitosamente"}

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
        
        query = text("""
            UPDATE adm.departamentos
            SET nombre = LTRIM(RTRIM(:nombre)),
                descripcion = :descripcion,
                responsable_id = :responsable_id,
                updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {
            "id": depto_id,
            "nombre": depto.nombre,
            "descripcion": depto.descripcion,
            "responsable_id": depto.responsable_id
        })
        await self.db.commit()
        
        return {"success": True, "id": depto_id, "message": "Departamento actualizado correctamente"}

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
        
        query = text("""
            UPDATE adm.departamentos
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {"id": depto_id})
        await self.db.commit()
        
        return {"success": True, "id": depto_id, "message": "Departamento desactivado correctamente"}

    async def reactivate(self, depto_id: int) -> dict:
        """Reactiva un departamento"""
        
        query = text("SELECT COUNT(*) FROM adm.departamentos WHERE id = :id")
        result = await self.db.execute(query, {"id": depto_id})
        if result.scalar() == 0:
            raise HTTPException(404, "El departamento especificado no existe.")
        
        query = text("""
            UPDATE adm.departamentos
            SET is_active = 1, updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {"id": depto_id})
        await self.db.commit()
        
        return {"success": True, "id": depto_id, "message": "Departamento reactivado correctamente"}

    async def get_dropdown(self) -> list:
        """Lista simple de departamentos activos para dropdowns"""
        query = text("""
            SELECT id, nombre
            FROM adm.departamentos
            WHERE is_active = 1
            ORDER BY nombre ASC
        """)
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]