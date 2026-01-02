import json
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.areas import AreaCreate, AreaUpdate
from fastapi import HTTPException

# Configuración de logs para capturar errores de base de datos
logger = logging.getLogger(__name__)

# --- 1. LISTAR ÁREAS (Con paginación y búsqueda) ---
async def listar_areas(db: AsyncSession, page: int, page_size: int, busqueda: str = None):
    try:
        query = text("EXEC adm.sp_listar_areas @page=:page, @page_size=:page_size, @busqueda=:busqueda")
        result = await db.execute(query, {
            "page": page, 
            "page_size": page_size, 
            "busqueda": busqueda
        })
        
        # SQL Server trunca JSON largos, por eso unimos todas las filas
        rows = result.fetchall()
        json_completo = "".join([row[0] for row in rows if row[0] is not None])
        
        if not json_completo:
            return {"total": 0, "page": page, "page_size": page_size, "total_pages": 0, "data": []}
            
        return json.loads(json_completo)
    except Exception as e:
        logger.error(f"Error en listar_areas: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener listado de áreas")

# --- 2. OBTENER UNA ÁREA POR ID ---
async def obtener_area_por_id(db: AsyncSession, id: int):
    try:
        query = text("EXEC adm.sp_obtener_area @id=:id")
        result = await db.execute(query, {"id": id})
        json_data = result.scalar() # Devuelve la primera columna de la primera fila
        
        return json.loads(json_data) if json_data else None
    except Exception as e:
        logger.error(f"Error en obtener_area_por_id: {e}")
        return None

# --- 3. CREAR ÁREA (POST) ---
async def crear_area(db: AsyncSession, payload: AreaCreate, usuario_id: int):
    try:
        query = text("""
            EXEC adm.sp_crear_area 
                @nombre=:n, @descripcion=:d, 
                @parent_area_id=:p, @responsable_id=:r, 
                @comisiona_ventas=:c, @is_active=:a,
                @usuario_id=:u
        """)
        params = {
            "n": payload.nombre, "d": payload.descripcion,
            "p": getattr(payload, 'parent_area_id', None), 
            "r": getattr(payload, 'responsable_id', None),
            "c": payload.comisiona_ventas, "a": payload.is_active,
            "u": usuario_id # Auditoría de creación
        }
        
        result = await db.execute(query, params)
        await db.commit() # Confirmamos la transacción
        
        res_json = result.scalar()
        return json.loads(res_json) if res_json else {"success": 0, "message": "No se recibió respuesta del SP"}
    except Exception as e:
        await db.rollback() # Si algo falla, revertimos
        logger.error(f"Error en crear_area: {e}")
        raise HTTPException(status_code=500, detail="Error al crear el área")

# --- 4. ACTUALIZAR ÁREA (PUT) ---
async def actualizar_area(db: AsyncSession, payload: AreaUpdate, usuario_id: int):
    try:
        query = text("""
            EXEC adm.sp_editar_area 
                @id=:id, @nombre=:n, @descripcion=:d, 
                @parent_area_id=:p, @responsable_id=:r, 
                @comisiona_ventas=:c, @is_active=:a,
                @usuario_id=:u
        """)
        params = {
            "id": payload.area_id,
            "n": payload.nombre, "d": payload.descripcion,
            "p": getattr(payload, 'parent_area_id', None),
            "r": getattr(payload, 'responsable_id', None),
            "c": payload.comisiona_ventas, "a": payload.is_active,
            "u": usuario_id # Auditoría de modificación
        }
        
        result = await db.execute(query, params)
        await db.commit()
        
        res_json = result.scalar()
        return json.loads(res_json) if res_json else {"success": 0, "message": "No se recibió respuesta del SP"}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error en actualizar_area: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar el área")

# --- 5. CAMBIAR ESTADO (Inactivar / Activar) ---
async def cambiar_estado_area(db: AsyncSession, id: int, is_active: bool, usuario_id: int):
    try:
        query = text("EXEC adm.sp_estado_area @id=:id, @is_active=:a, @usuario_id=:u")
        result = await db.execute(query, {"id": id, "a": is_active, "u": usuario_id})
        await db.commit()
        
        json_data = result.scalar()
        return json.loads(json_data) if json_data else None
    except Exception as e:
        await db.rollback()
        logger.error(f"Error en cambiar_estado_area: {e}")
        raise HTTPException(status_code=500, detail="Error al cambiar estado")