# app/services/area.py
import json
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.areas import AreaSave

# 1. LISTAR
async def listar_areas(db: AsyncSession, page: int, page_size: int, busqueda: str = None):
    query = text("EXEC adm.sp_listar_areas @page=:p, @page_size=:ps, @busqueda=:b")
    result = await db.execute(query, {"p": page, "ps": page_size, "b": busqueda})
    json_data = result.scalar()
    return json.loads(json_data) if json_data else {"total":0, "data":[]}

# 2. OBTENER UNO
async def obtener_area_por_id(db: AsyncSession, id: int):
    query = text("EXEC adm.sp_obtener_area @id=:id")
    result = await db.execute(query, {"id": id})
    json_data = result.scalar()
    return json.loads(json_data) if json_data else None

# 3. GUARDAR (UPSERT)
async def guardar_area(db: AsyncSession, payload: AreaSave):
    query = text("""
        EXEC adm.sp_crear_area 
            @id=:id, @nombre=:n, @descripcion=:d, 
            @parent_area_id=:p, @responsable_id=:r, 
            @comisiona_ventas=:c, @is_active=:a
    """)
    params = {
        "id": payload.id, "n": payload.nombre, "d": payload.descripcion,
        "p": payload.parent_area_id, "r": payload.responsable_id,
        "c": payload.comisiona_ventas, "a": payload.is_active
    }
    result = await db.execute(query, params)
    await db.commit()
    return json.loads(result.scalar())

# 4. CAMBIAR ESTADO
async def cambiar_estado_area(db: AsyncSession, id: int, is_active: bool):
    query = text("EXEC adm.sp_estado_area @id=:id, @is_active=:a")
    result = await db.execute(query, {"id": id, "a": is_active})
    await db.commit()
    json_data = result.scalar()
    return json.loads(json_data) if json_data else None