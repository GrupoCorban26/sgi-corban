from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException
from app.schemas.organizacion.cargo import (
    CargoCreate, 
    CargoUpdate, 
    OperationResult,
    CargoPaginationResponse
)
from app.services.validators import CommonValidators


class CargoService:
    """
    Servicio de Cargos - Patrón Python-Native
    Usa CommonValidators para validaciones compartidas.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.validators = CommonValidators(db)

    # =========================================================================
    # OPERACIONES CRUD
    # =========================================================================

    async def get_all(self, busqueda: str = None, area_id: int = None, page: int = 1, page_size: int = 15) -> dict:
        """Lista cargos con paginación y filtros"""
        offset = (page - 1) * page_size
        
        where_clauses = ["c.is_active = 1"]
        params = {"offset": offset, "page_size": page_size}
        
        if busqueda:
            where_clauses.append("c.nombre LIKE '%' + :busqueda + '%'")
            params["busqueda"] = busqueda
        
        if area_id:
            where_clauses.append("c.area_id = :area_id")
            params["area_id"] = area_id
        
        where_sql = " AND ".join(where_clauses)
        
        # Contar total
        count_query = text(f"""
            SELECT COUNT(*) 
            FROM adm.cargos c
            INNER JOIN adm.areas a ON a.id = c.area_id
            WHERE {where_sql}
        """)
        count_result = await self.db.execute(count_query, params)
        total = count_result.scalar() or 0
        
        # Obtener datos
        data_query = text(f"""
            SELECT 
                c.id, 
                c.nombre, 
                c.descripcion, 
                c.area_id,
                a.nombre AS area_nombre,
                c.is_active, 
                c.created_at,
                c.updated_at
            FROM adm.cargos c
            INNER JOIN adm.areas a ON a.id = c.area_id
            WHERE {where_sql}
            ORDER BY c.id
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

    async def get_by_id(self, cargo_id: int) -> dict:
        """Obtiene un cargo por su ID"""
        query = text("""
            SELECT 
                c.id, c.nombre, c.descripcion, 
                c.area_id, a.nombre AS area_nombre,
                c.is_active, c.created_at, c.updated_at
            FROM adm.cargos c
            INNER JOIN adm.areas a ON a.id = c.area_id
            WHERE c.id = :id
        """)
        result = await self.db.execute(query, {"id": cargo_id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_by_area(self, area_id: int) -> list:
        """Obtiene todos los cargos de un área (para expandir en árbol)"""
        query = text("""
            SELECT 
                c.id, c.nombre, c.descripcion, 
                c.area_id, a.nombre AS area_nombre,
                c.is_active, c.created_at, c.updated_at
            FROM adm.cargos c
            INNER JOIN adm.areas a ON a.id = c.area_id
            WHERE c.is_active = 1 AND c.area_id = :area_id
            ORDER BY c.nombre
        """)
        result = await self.db.execute(query, {"area_id": area_id})
        return [dict(row) for row in result.mappings().all()]

    async def create(self, cargo: CargoCreate) -> dict:
        """Crea un nuevo cargo"""
        
        # Validación: Área existe
        if not await self.validators.area_existe(cargo.area_id):
            raise HTTPException(400, "El área especificada no existe o está inactiva.")
        
        # Validación: Nombre único
        if await self.validators.nombre_duplicado_cargo(cargo.nombre.strip()):
            raise HTTPException(400, f'Ya existe un cargo activo con el nombre "{cargo.nombre}".')
        
        query = text("""
            INSERT INTO adm.cargos (nombre, descripcion, area_id)
            OUTPUT INSERTED.id
            VALUES (:nombre, :descripcion, :area_id)
        """)
        
        result = await self.db.execute(query, {
            "nombre": cargo.nombre.strip(),
            "descripcion": cargo.descripcion,
            "area_id": cargo.area_id
        })
        await self.db.commit()
        
        row = result.first()
        return {"success": True, "id": row[0], "message": "Cargo creado exitosamente"}

    async def update(self, cargo_id: int, cargo: CargoUpdate) -> dict:
        """Actualiza un cargo existente"""
        
        # Validación: Cargo existe
        if not await self.validators.cargo_existe(cargo_id):
            raise HTTPException(404, "El cargo especificado no existe.")
        
        # Validación: Área existe
        if not await self.validators.area_existe(cargo.area_id):
            raise HTTPException(400, "El área especificada no existe o está inactiva.")
        
        # Validación: Nombre único (excluyendo actual)
        if await self.validators.nombre_duplicado_cargo(cargo.nombre.strip(), exclude_id=cargo_id):
            raise HTTPException(400, f'Ya existe otro cargo con el nombre "{cargo.nombre}".')
        
        query = text("""
            UPDATE adm.cargos
            SET nombre = :nombre,
                descripcion = :descripcion,
                area_id = :area_id,
                updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {
            "id": cargo_id,
            "nombre": cargo.nombre.strip(),
            "descripcion": cargo.descripcion,
            "area_id": cargo.area_id
        })
        await self.db.commit()
        
        return {"success": True, "id": cargo_id, "message": "Cargo actualizado correctamente"}

    async def delete(self, cargo_id: int) -> dict:
        """Desactiva un cargo (soft delete)"""
        
        # Validación: Cargo existe
        if not await self.validators.cargo_existe(cargo_id):
            raise HTTPException(404, "El cargo especificado no existe.")
        
        # Validación: No tiene empleados activos
        if await self.validators.cargo_tiene_empleados_activos(cargo_id):
            raise HTTPException(400, "No se puede desactivar un cargo que tiene empleados activos asignados.")
        
        query = text("""
            UPDATE adm.cargos
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {"id": cargo_id})
        await self.db.commit()
        
        return {"success": True, "id": cargo_id, "message": "Cargo desactivado correctamente"}

    async def reactivate(self, cargo_id: int) -> dict:
        """Reactiva un cargo"""
        
        query = text("SELECT COUNT(*) FROM adm.cargos WHERE id = :id")
        result = await self.db.execute(query, {"id": cargo_id})
        if result.scalar() == 0:
            raise HTTPException(404, "El cargo especificado no existe.")
        
        query = text("""
            UPDATE adm.cargos
            SET is_active = 1, updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {"id": cargo_id})
        await self.db.commit()
        
        return {"success": True, "id": cargo_id, "message": "Cargo reactivado correctamente"}

    async def get_dropdown(self) -> list:
        """Lista simple de cargos activos para dropdowns"""
        query = text("""
            SELECT id, nombre
            FROM adm.cargos
            WHERE is_active = 1
            ORDER BY nombre ASC
        """)
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def get_dropdown_by_area(self, area_id: int) -> list:
        """Lista de cargos activos filtrados por área"""
        query = text("""
            SELECT id, area_id, nombre
            FROM adm.cargos
            WHERE is_active = 1 AND area_id = :area_id
            ORDER BY nombre ASC
        """)
        result = await self.db.execute(query, {"area_id": area_id})
        return [dict(row) for row in result.mappings().all()]
