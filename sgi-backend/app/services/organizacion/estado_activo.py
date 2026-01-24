from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.schemas.organizacion.estado_activo import (
    EstadoActivoCreate, 
    EstadoActivoUpdate
)
from app.models.administrativo import EstadoActivo


class EstadoActivoService:
    """
    Servicio de Estados de Activos - CRUD ORM
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # HELPERS
    # =========================================================================

    async def _estado_existe(self, estado_id: int) -> bool:
        stmt = select(func.count()).select_from(EstadoActivo).where(EstadoActivo.id == estado_id)
        return (await self.db.execute(stmt)).scalar() > 0

    async def _nombre_duplicado(self, nombre: str, exclude_id: int = None) -> bool:
        stmt = select(func.count()).select_from(EstadoActivo).where(
            func.upper(EstadoActivo.nombre) == func.upper(nombre)
        )
        if exclude_id:
            stmt = stmt.where(EstadoActivo.id != exclude_id)
        return (await self.db.execute(stmt)).scalar() > 0

    async def _estado_en_uso(self, estado_id: int) -> bool:
        """Verifica si el estado está siendo usado por activos"""
        from app.models.administrativo import Activo
        stmt = select(func.count()).select_from(Activo).where(Activo.estado_id == estado_id)
        return (await self.db.execute(stmt)).scalar() > 0

    # =========================================================================
    # CRUD
    # =========================================================================

    async def get_all(self, busqueda: str = None, page: int = 1, page_size: int = 15) -> dict:
        """Lista estados con paginación"""
        offset = (page - 1) * page_size
        
        stmt = select(EstadoActivo)
        
        if busqueda:
            stmt = stmt.where(EstadoActivo.nombre.ilike(f"%{busqueda}%"))
        
        # Count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0
        
        # Data
        stmt = stmt.order_by(EstadoActivo.id).offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        estados = result.scalars().all()
        
        data = [{
            "id": e.id,
            "nombre": e.nombre,
            "descripcion": e.descripcion,
            "created_at": e.created_at,
            "updated_at": e.updated_at
        } for e in estados]
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            "data": data
        }

    async def get_by_id(self, estado_id: int) -> dict | None:
        """Obtiene un estado por su ID"""
        stmt = select(EstadoActivo).where(EstadoActivo.id == estado_id)
        result = await self.db.execute(stmt)
        estado = result.scalars().first()
        
        if not estado:
            return None
        
        return {
            "id": estado.id,
            "nombre": estado.nombre,
            "descripcion": estado.descripcion,
            "created_at": estado.created_at,
            "updated_at": estado.updated_at
        }

    async def get_by_nombre(self, nombre: str) -> EstadoActivo | None:
        """Obtiene un estado por su nombre (para uso interno)"""
        stmt = select(EstadoActivo).where(func.upper(EstadoActivo.nombre) == func.upper(nombre))
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create(self, estado: EstadoActivoCreate) -> dict:
        """Crea un nuevo estado"""
        if await self._nombre_duplicado(estado.nombre.strip()):
            raise HTTPException(400, f'Ya existe un estado con el nombre "{estado.nombre}".')
        
        nuevo_estado = EstadoActivo(
            nombre=estado.nombre.strip().upper(),
            descripcion=estado.descripcion
        )
        self.db.add(nuevo_estado)
        await self.db.commit()
        await self.db.refresh(nuevo_estado)
        
        return {"success": True, "id": nuevo_estado.id, "message": "Estado creado exitosamente"}

    async def update(self, estado_id: int, estado: EstadoActivoUpdate) -> dict:
        """Actualiza un estado existente"""
        stmt = select(EstadoActivo).where(EstadoActivo.id == estado_id)
        result = await self.db.execute(stmt)
        estado_db = result.scalars().first()
        
        if not estado_db:
            raise HTTPException(404, "Estado no encontrado")
        
        if estado.nombre and await self._nombre_duplicado(estado.nombre.strip(), estado_id):
            raise HTTPException(400, f'Ya existe otro estado con el nombre "{estado.nombre}".')
        
        if estado.nombre is not None:
            estado_db.nombre = estado.nombre.strip().upper()
        if estado.descripcion is not None:
            estado_db.descripcion = estado.descripcion
        
        estado_db.updated_at = func.now()
        await self.db.commit()
        
        return {"success": True, "id": estado_id, "message": "Estado actualizado correctamente"}

    async def delete(self, estado_id: int) -> dict:
        """Elimina un estado (si no está en uso)"""
        if not await self._estado_existe(estado_id):
            raise HTTPException(404, "Estado no encontrado")
        
        if await self._estado_en_uso(estado_id):
            raise HTTPException(400, "No se puede eliminar un estado que está siendo usado por activos.")
        
        stmt = select(EstadoActivo).where(EstadoActivo.id == estado_id)
        estado_db = (await self.db.execute(stmt)).scalars().first()
        
        await self.db.delete(estado_db)
        await self.db.commit()
        
        return {"success": True, "id": estado_id, "message": "Estado eliminado correctamente"}

    async def get_dropdown(self) -> list:
        """Lista simple de estados para dropdown"""
        stmt = select(EstadoActivo).order_by(EstadoActivo.nombre)
        result = await self.db.execute(stmt)
        estados = result.scalars().all()
        return [{"id": e.id, "nombre": e.nombre} for e in estados]
