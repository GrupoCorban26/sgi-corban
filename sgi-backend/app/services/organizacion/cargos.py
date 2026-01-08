from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.organizacion.cargo import (
    CargoCreate, 
    CargoUpdate, 
    OperationResult,
    CargoPaginationResponse
)

class CargoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, busqueda: str = None, area_id: int = None, page: int = 1, page_size: int = 15) -> dict:
        """Obtiene todos los cargos con paginación y filtros"""
        query = text("""
            EXEC adm.usp_listar_cargos
                @busqueda=:b,
                @area_id=:a,
                @page=:p,
                @registro_por_pagina=:r
        """)
        result = await self.db.execute(query, {"b": busqueda, "a": area_id, "p": page, "r": page_size})
        data = result.mappings().all()

        total_records = data[0]["total_registros"] if data else 0

        return {
            "total": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_records + page_size - 1) // page_size if total_records > 0 else 1,
            "data": data
        }

    async def get_by_area(self, area_id: int) -> list:
        """Obtiene todos los cargos de un área específica (para expandir en árbol)"""
        query = text("EXEC adm.usp_cargos_por_area @area_id=:a")
        result = await self.db.execute(query, {"a": area_id})
        data = result.mappings().all()
        return [dict(row) for row in data]

    async def create(self, cargo: CargoCreate) -> dict:
        """Crea un nuevo cargo"""
        query = text("""
            EXEC adm.usp_crear_cargo
                @nombre=:nombre,
                @descripcion=:descripcion,
                @area_id=:area_id
        """)
        result = await self.db.execute(query, {
            "nombre": cargo.nombre,
            "descripcion": cargo.descripcion,
            "area_id": cargo.area_id
        })
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al crear cargo"}

    async def update(self, id: int, cargo: CargoUpdate) -> dict:
        """Actualiza un cargo existente"""
        query = text("""
            EXEC adm.usp_editar_cargo
                @id=:id,
                @nombre=:nombre,
                @descripcion=:descripcion,
                @area_id=:area_id
        """)
        result = await self.db.execute(query, {
            "id": id,
            "nombre": cargo.nombre,
            "descripcion": cargo.descripcion,
            "area_id": cargo.area_id
        })
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al actualizar cargo"}

    async def delete(self, id: int) -> dict:
        """Desactiva un cargo (soft delete)"""
        query = text("EXEC adm.usp_desactivar_cargo @id=:id, @estado=0")
        result = await self.db.execute(query, {"id": id})
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al desactivar cargo"}

    async def get_dropdown(self) -> list:
        """Obtiene lista simple de cargos para dropdown"""
        query = text("EXEC adm.usp_dropdown_cargos")
        result = await self.db.execute(query)
        data = result.mappings().all()
        return data
