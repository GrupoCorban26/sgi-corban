from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from fastapi import HTTPException
from app.models.comercial import CasoLlamada
from app.models.comercial import ClienteContacto

class CasosLlamadaService:

    @staticmethod
    async def get_all(db: AsyncSession):
        stmt = select(CasoLlamada).order_by(CasoLlamada.contestado, CasoLlamada.nombre)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, id: int):
        stmt = select(CasoLlamada).where(CasoLlamada.id == id)
        result = await db.execute(stmt)
        caso = result.scalars().first()
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado")
        return caso

    @staticmethod
    async def create(db: AsyncSession, data: dict):
        nuevo_caso = CasoLlamada(
            nombre=data["nombre"],
            contestado=data.get("contestado", False),
            gestionable=data.get("gestionable", False)
        )
        db.add(nuevo_caso)
        await db.commit()
        await db.refresh(nuevo_caso)
        return {"id": nuevo_caso.id}

    @staticmethod
    async def update(db: AsyncSession, id: int, data: dict):
        stmt = select(CasoLlamada).where(CasoLlamada.id == id)
        result = await db.execute(stmt)
        caso = result.scalars().first()
        
        if not caso:
             raise HTTPException(status_code=404, detail="Caso no encontrado")

        if "nombre" in data:
             caso.nombre = data["nombre"]
        if "contestado" in data:
             caso.contestado = data["contestado"]
        if "gestionable" in data:
             caso.gestionable = data["gestionable"]
             
        await db.commit()
        return True

    @staticmethod
    async def delete(db: AsyncSession, id: int):
        # Verificar uso
        stmt_check = select(ClienteContacto).where(ClienteContacto.caso_id == id).limit(1)
        res_check = await db.execute(stmt_check)
        if res_check.scalars().first():
             raise HTTPException(status_code=400, detail="No se puede eliminar: el caso está en uso por contactos.")
        
        stmt = select(CasoLlamada).where(CasoLlamada.id == id)
        result = await db.execute(stmt)
        caso = result.scalars().first()
        
        if caso:
            await db.delete(caso)
            await db.commit()
        return True
