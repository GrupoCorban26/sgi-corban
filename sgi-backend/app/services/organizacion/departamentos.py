from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.organizacion.departamentos import (
    DepartamentoCreate, 
    DepartamentoUpdate, 
    OperationResult,
    DepartamentoPaginationResponse
)

class DepartamentoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, busqueda: str = None, page: int = 1, page_size: int = 15) -> dict:
        # 1. Llamada al SP de listado (Usando los nombres exactos de los parámetros de SQL)
        query = text("""
            EXEC adm.usp_listar_departamentos 
                @busqueda=:b, 
                @page=:p, 
                @registro_por_pagina=:r
        """)
        
        # SQL Server devolverá los resultados y el parámetro OUTPUT. 
        # Para simplificar con AsyncSession, ejecutamos y luego pedimos el total.
        result = await self.db.execute(query, {"b": busqueda, "p": page, "r": page_size})
        data = result.mappings().all()
        
        # 2. Obtener el total (Para la paginación del frontend)
        query_total = text("SELECT COUNT(*) FROM adm.departamentos WHERE is_active = 1")
        if busqueda:
            query_total = text("SELECT COUNT(*) FROM adm.departamentos WHERE nombre LIKE :b AND is_active = 1")
            result_total = await self.db.execute(query_total, {"b": f"%{busqueda}%"})
        else:
            result_total = await self.db.execute(query_total)
            
        total_records = result_total.scalar() or 0
        
        return {
            "total": total_records,
            "page": page,
            "registro_por_pagina": page_size,
            "total_pages": (total_records + page_size - 1) // page_size,
            "data": data
        }

    async def create(self, depto: DepartamentoCreate) -> dict:
        # IMPORTANTE: El SP usp_crear_departamento que definimos no tenía @created_by
        # Si quieres rastrear quién creó el registro, debes agregarlo al SP en SQL.
        query = text("""
            EXEC adm.usp_crear_departamento 
                @Nombre=:n, @Descripcion=:d, @Responsable_id=:r
        """)
        
        params = {
            "n": depto.nombre, 
            "d": depto.descripcion, 
            "r": depto.responsable_id
        }
        
        execution = await self.db.execute(query, params)
        # El SP devuelve SELECT SCOPE_IDENTITY() AS id
        new_id = execution.mappings().one()
        
        await self.db.commit()
        return {"success": True, "message": "Departamento creado", "id": new_id["id"]}

    async def update(self, depto_id: int, depto: DepartamentoUpdate) -> dict:
        query = text("""
            EXEC adm.usp_editar_departamento 
                @Id=:id, @Nombre=:n, @Descripcion=:d, @Responsable_id=:r
        """)
        params = {
            "id": depto_id, 
            "n": depto.nombre, 
            "d": depto.descripcion, 
            "r": depto.responsable_id
        }
        
        await self.db.execute(query, params)
        await self.db.commit()
        return {"success": True, "message": "Departamento actualizado", "id": depto_id}

    async def delete(self, depto_id: int, estado: bool = False) -> dict:
        # Usamos el SP usp_desactivar_departamento que definimos antes
        query = text("EXEC adm.usp_desactivar_departamento @Id=:id, @Estado=:e")
        params = {"id": depto_id, "e": 1 if estado else 0}
        
        await self.db.execute(query, params)
        await self.db.commit()
        return {"success": True, "message": "Estado del departamento actualizado"}