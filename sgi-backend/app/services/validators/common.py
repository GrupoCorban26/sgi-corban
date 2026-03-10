"""
Validadores Compartidos para Servicios de Organización

Este módulo centraliza las validaciones de existencia de entidades
para evitar duplicación de código en los diferentes services.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

# Importamos modelos para usar ORM
from app.models.administrativo import Empleado, Departamento, Area, Cargo
from app.models.core import Distrito


class CommonValidators:
    """
    Validadores comunes reutilizables por todos los services.
    
    Uso:
        from app.services.validators import CommonValidators
        
        class MiService:
            def __init__(self, db: AsyncSession):
                self.db = db
                self.validators = CommonValidators(db)
            
            async def create(self, data):
                if not await self.validators.empleado_existe(data.jefe_id):
                    raise HTTPException(400, "El jefe no existe")
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # VALIDACIONES DE EXISTENCIA
    # =========================================================================

    async def empleado_existe(self, empleado_id: int) -> bool:
        """Verifica si un empleado existe y está activo"""
        if not empleado_id:
            return False
        stmt = select(func.count()).select_from(Empleado).where(
            and_(Empleado.id == empleado_id, Empleado.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def departamento_existe(self, depto_id: int) -> bool:
        """Verifica si un departamento existe y está activo"""
        if not depto_id:
            return False
        stmt = select(func.count()).select_from(Departamento).where(
            and_(Departamento.id == depto_id, Departamento.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def area_existe(self, area_id: int) -> bool:
        """Verifica si un área existe y está activa"""
        if not area_id:
            return False
        stmt = select(func.count()).select_from(Area).where(
            and_(Area.id == area_id, Area.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def cargo_existe(self, cargo_id: int) -> bool:
        """Verifica si un cargo existe y está activo"""
        if not cargo_id:
            return False
        stmt = select(func.count()).select_from(Cargo).where(
            and_(Cargo.id == cargo_id, Cargo.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def distrito_existe(self, distrito_id: int) -> bool:
        """Verifica si un distrito existe"""
        if not distrito_id:
            return False
        stmt = select(func.count()).select_from(Distrito).where(Distrito.id == distrito_id)
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    # =========================================================================
    # VALIDACIONES DE UNICIDAD
    # =========================================================================

    async def nombre_duplicado_departamento(self, nombre: str, exclude_id: int = None) -> bool:
        """Verifica si ya existe un departamento activo con ese nombre"""
        condiciones = [Departamento.nombre == nombre, Departamento.is_active == True]
        if exclude_id:
            condiciones.append(Departamento.id != exclude_id)
            
        stmt = select(func.count()).select_from(Departamento).where(and_(*condiciones))
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def nombre_duplicado_area(self, nombre: str, exclude_id: int = None) -> bool:
        """Verifica si ya existe un área activa con ese nombre"""
        condiciones = [Area.nombre == nombre, Area.is_active == True]
        if exclude_id:
            condiciones.append(Area.id != exclude_id)
            
        stmt = select(func.count()).select_from(Area).where(and_(*condiciones))
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def nombre_duplicado_cargo(self, nombre: str, exclude_id: int = None) -> bool:
        """Verifica si ya existe un cargo activo con ese nombre"""
        condiciones = [Cargo.nombre == nombre, Cargo.is_active == True]
        if exclude_id:
            condiciones.append(Cargo.id != exclude_id)
            
        stmt = select(func.count()).select_from(Cargo).where(and_(*condiciones))
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def documento_duplicado_empleado(self, nro_documento: str, exclude_id: int = None) -> bool:
        """Verifica si ya existe un empleado con ese número de documento (activo o inactivo)"""
        condiciones = [Empleado.nro_documento == nro_documento]
        if exclude_id:
            condiciones.append(Empleado.id != exclude_id)
            
        stmt = select(func.count()).select_from(Empleado).where(and_(*condiciones))
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    # =========================================================================
    # VALIDACIONES DE DEPENDENCIAS (para soft delete)
    # =========================================================================

    async def departamento_tiene_areas_activas(self, depto_id: int) -> bool:
        """Verifica si el departamento tiene áreas activas"""
        stmt = select(func.count()).select_from(Area).where(
            and_(Area.departamento_id == depto_id, Area.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def departamento_tiene_empleados_activos(self, depto_id: int) -> bool:
        """Verifica si el departamento tiene empleados activos"""
        stmt = select(func.count()).select_from(Empleado).join(
            Cargo, Empleado.cargo_id == Cargo.id
        ).join(
            Area, Cargo.area_id == Area.id
        ).where(
            and_(Area.departamento_id == depto_id, Empleado.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def area_tiene_subareas_activas(self, area_id: int) -> bool:
        """Verifica si el área tiene sub-áreas activas"""
        stmt = select(func.count()).select_from(Area).where(
            and_(Area.area_padre_id == area_id, Area.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def area_tiene_empleados_activos(self, area_id: int) -> bool:
        """Verifica si el área tiene empleados activos"""
        stmt = select(func.count()).select_from(Empleado).join(
            Cargo, Empleado.cargo_id == Cargo.id
        ).where(
            and_(Cargo.area_id == area_id, Empleado.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def cargo_tiene_empleados_activos(self, cargo_id: int) -> bool:
        """Verifica si el cargo tiene empleados activos"""
        stmt = select(func.count()).select_from(Empleado).where(
            and_(Empleado.cargo_id == cargo_id, Empleado.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def empleado_es_jefe_de_otros(self, empleado_id: int) -> bool:
        """Verifica si el empleado es jefe de otros empleados activos"""
        stmt = select(func.count()).select_from(Empleado).where(
            and_(Empleado.jefe_id == empleado_id, Empleado.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def empleado_es_responsable_departamento(self, empleado_id: int) -> bool:
        """Verifica si el empleado es responsable de algún departamento"""
        stmt = select(func.count()).select_from(Departamento).where(
            and_(Departamento.responsable_id == empleado_id, Departamento.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0

    async def empleado_es_responsable_area(self, empleado_id: int) -> bool:
        """Verifica si el empleado es responsable de algún área"""
        stmt = select(func.count()).select_from(Area).where(
            and_(Area.responsable_id == empleado_id, Area.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar() > 0
