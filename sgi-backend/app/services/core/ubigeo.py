from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.models.core import DepartamentoGeo, Provincia, Distrito

class UbigeoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_departamentos(self) -> List[dict]:
        """Obtiene todos los departamentos geográficos"""
        stmt = select(DepartamentoGeo).order_by(DepartamentoGeo.nombre)
        result = await self.db.execute(stmt)
        return [
            {"id": d.id, "nombre": d.nombre, "ubigeo": d.ubigeo} 
            for d in result.scalars().all()
        ]

    async def get_provincias(self, departamento_id: int = None) -> List[dict]:
        """Obtiene provincias, opcionalmente filtradas por departamento"""
        stmt = select(Provincia).order_by(Provincia.nombre)
        if departamento_id:
            stmt = stmt.where(Provincia.departamento_id == departamento_id)
            
        result = await self.db.execute(stmt)
        return [
            {"id": p.id, "nombre": p.nombre, "ubigeo": p.ubigeo, "departamento_id": p.departamento_id} 
            for p in result.scalars().all()
        ]

    async def get_distritos(self, provincia_id: int = None) -> List[dict]:
        """Obtiene distritos, opcionalmente filtrados por provincia"""
        stmt = select(Distrito).order_by(Distrito.nombre)
        if provincia_id:
            stmt = stmt.where(Distrito.provincia_id == provincia_id)
            
        result = await self.db.execute(stmt)
        return [
            {"id": d.id, "nombre": d.nombre, "ubigeo": d.ubigeo, "provincia_id": d.provincia_id} 
            for d in result.scalars().all()
        ]
