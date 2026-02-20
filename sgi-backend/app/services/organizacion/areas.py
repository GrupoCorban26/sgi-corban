from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException
from app.schemas.organizacion.areas import (
    AreaCreate, 
    AreaUpdate, 
    OperationResult,
    AreaPaginationResponse
)
from app.services.validators import CommonValidators


class AreaService:
    """
    Servicio de Áreas - Patrón Python-Native
    Usa CommonValidators para validaciones compartidas.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.validators = CommonValidators(db)

    # =========================================================================
    # OPERACIONES CRUD
    # =========================================================================

    async def get_all(self, busqueda: str = None, departamento_id: int = None, page: int = 1, page_size: int = 15) -> dict:
        """Lista áreas con paginación y filtros"""
        offset = (page - 1) * page_size
        
        where_clauses = ["a.is_active = 1"]
        params = {"offset": offset, "page_size": page_size}
        
        if busqueda:
            where_clauses.append("(a.nombre LIKE '%' + :busqueda + '%' OR d.nombre LIKE '%' + :busqueda + '%')")
            params["busqueda"] = busqueda
        
        if departamento_id:
            where_clauses.append("a.departamento_id = :departamento_id")
            params["departamento_id"] = departamento_id
        
        where_sql = " AND ".join(where_clauses)
        
        # Contar total
        count_query = text(f"""
            SELECT COUNT(*) 
            FROM adm.areas a
            INNER JOIN adm.departamentos d ON d.id = a.departamento_id
            WHERE {where_sql}
        """)
        count_result = await self.db.execute(count_query, params)
        total = count_result.scalar() or 0
        
        # Obtener datos
        data_query = text(f"""
            SELECT 
                a.id, 
                a.nombre, 
                a.descripcion, 
                a.departamento_id,
                d.nombre AS departamento_nombre, 
                a.area_padre_id, 
                ap.nombre AS area_padre_nombre,
                a.responsable_id,
                ISNULL(e.nombres + ' ' + e.apellido_paterno, 'Sin asignar') AS responsable_nombre,
                a.is_active, 
                a.created_at,
                a.updated_at
            FROM adm.areas a
            INNER JOIN adm.departamentos d ON d.id = a.departamento_id
            LEFT JOIN adm.empleados e ON e.id = a.responsable_id
            LEFT JOIN adm.areas ap ON ap.id = a.area_padre_id
            WHERE {where_sql}
            ORDER BY a.id
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

    async def get_by_id(self, area_id: int) -> dict:
        """Obtiene un área por su ID"""
        query = text("""
            SELECT 
                a.id, a.nombre, a.descripcion, 
                a.departamento_id, d.nombre AS departamento_nombre,
                a.area_padre_id, ap.nombre AS area_padre_nombre,
                a.responsable_id,
                ISNULL(e.nombres + ' ' + e.apellido_paterno, 'Sin asignar') AS responsable_nombre,
                a.is_active, a.created_at, a.updated_at
            FROM adm.areas a
            INNER JOIN adm.departamentos d ON d.id = a.departamento_id
            LEFT JOIN adm.empleados e ON e.id = a.responsable_id
            LEFT JOIN adm.areas ap ON ap.id = a.area_padre_id
            WHERE a.id = :id
        """)
        result = await self.db.execute(query, {"id": area_id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_by_departamento(self, departamento_id: int) -> list:
        """Obtiene todas las áreas de un departamento (sin paginación)"""
        query = text("""
            SELECT 
                a.id, a.nombre, a.descripcion, 
                a.departamento_id, d.nombre AS departamento_nombre,
                a.area_padre_id, ap.nombre AS area_padre_nombre,
                a.responsable_id,
                ISNULL(e.nombres + ' ' + e.apellido_paterno, 'Sin asignar') AS responsable_nombre,
                a.is_active 
            FROM adm.areas a
            INNER JOIN adm.departamentos d ON d.id = a.departamento_id
            LEFT JOIN adm.empleados e ON e.id = a.responsable_id
            LEFT JOIN adm.areas ap ON ap.id = a.area_padre_id
            WHERE a.is_active = 1 AND a.departamento_id = :departamento_id
            ORDER BY a.nombre
        """)
        result = await self.db.execute(query, {"departamento_id": departamento_id})
        return [dict(row) for row in result.mappings().all()]

    async def create(self, area: AreaCreate) -> dict:
        """Crea una nueva área"""
        
        # Validación: Departamento existe
        if not await self.validators.departamento_existe(area.departamento_id):
            raise HTTPException(400, "El departamento especificado no existe o está inactivo.")
        
        # Validación: Área padre existe (si se especifica)
        if area.area_padre_id and not await self.validators.area_existe(area.area_padre_id):
            raise HTTPException(400, "El área padre especificada no existe o está inactiva.")
        
        # Validación: Nombre único
        if await self.validators.nombre_duplicado_area(area.nombre.strip()):
            raise HTTPException(400, f'Ya existe un área activa con el nombre "{area.nombre}".')
        
        # Validación: Responsable existe (si se especifica)
        if area.responsable_id and not await self.validators.empleado_existe(area.responsable_id):
            raise HTTPException(400, "El empleado responsable especificado no existe o está inactivo.")
        
        query = text("""
            INSERT INTO adm.areas (nombre, descripcion, departamento_id, area_padre_id, responsable_id, is_active)
            OUTPUT INSERTED.id
            VALUES (:nombre, :descripcion, :departamento_id, :area_padre_id, :responsable_id, 1)
        """)
        
        result = await self.db.execute(query, {
            "nombre": area.nombre.strip(),
            "descripcion": area.descripcion,
            "departamento_id": area.departamento_id,
            "area_padre_id": area.area_padre_id,
            "responsable_id": area.responsable_id
        })
        await self.db.commit()
        
        row = result.first()
        return {"success": True, "id": row[0], "message": "Área creada exitosamente"}

    async def update(self, area_id: int, area: AreaUpdate) -> dict:
        """Actualiza un área existente"""
        
        # Validación: Área existe
        if not await self.validators.area_existe(area_id):
            raise HTTPException(404, "El área especificada no existe.")
        
        # Validación: Departamento existe
        if not await self.validators.departamento_existe(area.departamento_id):
            raise HTTPException(400, "El departamento especificado no existe o está inactivo.")
        
        # Validación: No puede ser su propio padre
        if area.area_padre_id and area.area_padre_id == area_id:
            raise HTTPException(400, "Un área no puede ser su propio padre.")
        
        # Validación: Área padre existe (si se especifica)
        if area.area_padre_id and not await self.validators.area_existe(area.area_padre_id):
            raise HTTPException(400, "El área padre especificada no existe o está inactiva.")
        
        # Validación: Nombre único (excluyendo actual)
        if await self.validators.nombre_duplicado_area(area.nombre.strip(), exclude_id=area_id):
            raise HTTPException(400, f'Ya existe otra área con el nombre "{area.nombre}".')
        
        # Validación: Responsable existe (si se especifica)
        if area.responsable_id and not await self.validators.empleado_existe(area.responsable_id):
            raise HTTPException(400, "El empleado responsable especificado no existe o está inactivo.")
        
        query = text("""
            UPDATE adm.areas
            SET nombre = :nombre,
                descripcion = :descripcion,
                departamento_id = :departamento_id,
                area_padre_id = :area_padre_id,
                responsable_id = :responsable_id,
                updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {
            "id": area_id,
            "nombre": area.nombre.strip(),
            "descripcion": area.descripcion,
            "departamento_id": area.departamento_id,
            "area_padre_id": area.area_padre_id,
            "responsable_id": area.responsable_id
        })
        await self.db.commit()
        
        return {"success": True, "id": area_id, "message": "Área actualizada correctamente"}

    async def delete(self, area_id: int) -> dict:
        """Desactiva un área (soft delete)"""
        
        # Validación: Área existe
        if not await self.validators.area_existe(area_id):
            raise HTTPException(404, "El área especificada no existe.")
        
        # Validación: No tiene sub-áreas activas
        if await self.validators.area_tiene_subareas_activas(area_id):
            raise HTTPException(400, "No se puede desactivar un área que tiene sub-áreas activas.")
        
        # Validación: No tiene empleados activos
        if await self.validators.area_tiene_empleados_activos(area_id):
            raise HTTPException(400, "No se puede desactivar un área que tiene empleados activos asignados.")
        
        query = text("""
            UPDATE adm.areas
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {"id": area_id})
        await self.db.commit()
        
        return {"success": True, "id": area_id, "message": "Área desactivada correctamente"}

    async def reactivate(self, area_id: int) -> dict:
        """Reactiva un área"""
        
        query = text("SELECT COUNT(*) FROM adm.areas WHERE id = :id")
        result = await self.db.execute(query, {"id": area_id})
        if result.scalar() == 0:
            raise HTTPException(404, "El área especificada no existe.")
        
        query = text("""
            UPDATE adm.areas
            SET is_active = 1, updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {"id": area_id})
        await self.db.commit()
        
        return {"success": True, "id": area_id, "message": "Área reactivada correctamente"}

    async def get_dropdown(self) -> list:
        """Lista simple de áreas activas para dropdowns"""
        query = text("""
            SELECT id, nombre
            FROM adm.areas
            WHERE is_active = 1
            ORDER BY nombre ASC
        """)
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def get_dropdown_by_departamento(self, departamento_id: int) -> list:
        """Lista de áreas activas filtradas por departamento"""
        query = text("""
            SELECT id, departamento_id, nombre
            FROM adm.areas
            WHERE is_active = 1 AND departamento_id = :departamento_id
            ORDER BY nombre ASC
        """)
        result = await self.db.execute(query, {"departamento_id": departamento_id})
        return [dict(row) for row in result.mappings().all()]