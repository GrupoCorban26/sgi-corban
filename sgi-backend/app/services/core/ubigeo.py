from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List


class UbigeoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_departamentos(self) -> List[dict]:
        """Obtiene todos los departamentos geográficos"""
        query = text("EXEC core.usp_listar_departamentos_geo")
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def get_provincias(self, departamento_id: int = None) -> List[dict]:
        """Obtiene provincias, opcionalmente filtradas por departamento"""
        query = text("EXEC core.usp_listar_provincias @departamento_id=:dept_id")
        result = await self.db.execute(query, {"dept_id": departamento_id})
        return [dict(row) for row in result.mappings().all()]

    async def get_distritos(self, provincia_id: int = None) -> List[dict]:
        """Obtiene distritos, opcionalmente filtrados por provincia"""
        query = text("EXEC core.usp_listar_distritos @provincia_id=:prov_id")
        result = await self.db.execute(query, {"prov_id": provincia_id})
        return [dict(row) for row in result.mappings().all()]
