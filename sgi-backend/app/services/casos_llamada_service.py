from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException

class CasosLlamadaService:

    @staticmethod
    async def get_all(db: AsyncSession):
        result = await db.execute(text("EXEC comercial.usp_listar_casos_llamada"))
        return result.mappings().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, id: int):
        result = await db.execute(
            text("EXEC comercial.usp_obtener_caso_llamada @Id=:id"),
            {"id": id}
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Caso no encontrado")
        return row

    @staticmethod
    async def create(db: AsyncSession, data: dict):
        result = await db.execute(
            text("EXEC comercial.usp_crear_caso_llamada @Nombre=:nombre, @Contestado=:contestado"),
            {"nombre": data["nombre"], "contestado": data.get("contestado", False)}
        )
        row = result.fetchone()
        await db.commit()
        return {"id": row[0] if row else None}

    @staticmethod
    async def update(db: AsyncSession, id: int, data: dict):
        await db.execute(
            text("EXEC comercial.usp_actualizar_caso_llamada @Id=:id, @Nombre=:nombre, @Contestado=:contestado"),
            {"id": id, "nombre": data.get("nombre"), "contestado": data.get("contestado")}
        )
        await db.commit()
        return True

    @staticmethod
    async def delete(db: AsyncSession, id: int):
        try:
            await db.execute(
                text("EXEC comercial.usp_eliminar_caso_llamada @Id=:id"),
                {"id": id}
            )
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            if "en uso" in str(e):
                raise HTTPException(status_code=400, detail="No se puede eliminar: el caso está en uso")
            raise HTTPException(status_code=500, detail=str(e))
