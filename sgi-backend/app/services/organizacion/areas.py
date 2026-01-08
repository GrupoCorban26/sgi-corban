from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.organizacion.areas import (
    AreaCreate, 
    AreaUpdate, 
    OperationResult,
    AreaPaginationResponse
)

class AreaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, busqueda: str = None, departamento_id: int = None, page: int = 1, page_size: int = 15) -> dict:
        """Obtiene todas las áreas con paginación y filtros"""
        query = text("""
            EXEC adm.usp_listar_areas
                @busqueda=:b,
                @departamento_id=:d,
                @page=:p,
                @registro_por_pagina=:r
        """)
        result = await self.db.execute(query, {"b": busqueda, "d": departamento_id, "p": page, "r": page_size})
        data = result.mappings().all()

        total_records = data[0]["total_registros"] if data else 0

        return {
            "total": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_records + page_size - 1) // page_size if total_records > 0 else 1,
            "data": data
        }

    async def get_by_departamento(self, departamento_id: int) -> list:
        """Obtiene todas las áreas de un departamento específico (sin paginación)"""
        query = text("""
            EXEC adm.usp_listar_areas 
                @departamento_id=:d, 
                @page=1, 
                @registro_por_pagina=100
        """)
        result = await self.db.execute(query, {"d": departamento_id})
        data = result.mappings().all()
        return [dict(row) for row in data]
    
    async def get_areas_dropdown(self) -> list:
        """Obtiene lista simple de áreas para dropdown"""
        query = text("EXEC adm.usp_dropdown_areas")
        result = await self.db.execute(query)
        data = result.mappings().all()
        return data

    async def create(self, area: AreaCreate) -> dict:
        """Crea una nueva área"""
        query = text("""
            EXEC adm.usp_crear_areas
                @nombre=:nombre,
                @descripcion=:descripcion,
                @departamento_id=:departamento_id,
                @area_parent_id=:area_parent_id,
                @responsable_id=:responsable_id
        """)
        result = await self.db.execute(query, {
            "nombre": area.nombre,
            "descripcion": area.descripcion,
            "departamento_id": area.departamento_id,
            "area_parent_id": area.area_parent_id,
            "responsable_id": area.responsable_id
        })
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al crear área"}

    async def update(self, id: int, area: AreaUpdate) -> dict:
        """Actualiza un área existente"""
        query = text("""
            EXEC adm.usp_editar_areas
                @id=:id,
                @nombre=:nombre,
                @descripcion=:descripcion,
                @departamento_id=:departamento_id,
                @area_parent_id=:area_parent_id,
                @responsable_id=:responsable_id
        """)
        result = await self.db.execute(query, {
            "id": id,
            "nombre": area.nombre,
            "descripcion": area.descripcion,
            "departamento_id": area.departamento_id,
            "area_parent_id": area.area_parent_id,
            "responsable_id": area.responsable_id
        })
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al actualizar área"}

    async def delete(self, id: int) -> dict:
        """Desactiva un área (soft delete)"""
        query = text("EXEC adm.usp_desactivar_areas @id=:id, @estado=0")
        result = await self.db.execute(query, {"id": id})
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al desactivar área"}