"""
Validadores Compartidos para Servicios de Organización

Este módulo centraliza las validaciones de existencia de entidades
para evitar duplicación de código en los diferentes services.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


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
        query = text("SELECT COUNT(*) FROM adm.empleados WHERE id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": empleado_id})
        return result.scalar() > 0

    async def departamento_existe(self, depto_id: int) -> bool:
        """Verifica si un departamento existe y está activo"""
        if not depto_id:
            return False
        query = text("SELECT COUNT(*) FROM adm.departamentos WHERE id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": depto_id})
        return result.scalar() > 0

    async def area_existe(self, area_id: int) -> bool:
        """Verifica si un área existe y está activa"""
        if not area_id:
            return False
        query = text("SELECT COUNT(*) FROM adm.areas WHERE id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": area_id})
        return result.scalar() > 0

    async def cargo_existe(self, cargo_id: int) -> bool:
        """Verifica si un cargo existe y está activo"""
        if not cargo_id:
            return False
        query = text("SELECT COUNT(*) FROM adm.cargos WHERE id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": cargo_id})
        return result.scalar() > 0

    async def distrito_existe(self, distrito_id: int) -> bool:
        """Verifica si un distrito existe"""
        if not distrito_id:
            return False
        query = text("SELECT COUNT(*) FROM core.distritos WHERE id = :id")
        result = await self.db.execute(query, {"id": distrito_id})
        return result.scalar() > 0

    # =========================================================================
    # VALIDACIONES DE UNICIDAD
    # =========================================================================

    async def nombre_duplicado_departamento(self, nombre: str, exclude_id: int = None) -> bool:
        """Verifica si ya existe un departamento activo con ese nombre"""
        if exclude_id:
            query = text("""
                SELECT COUNT(*) FROM adm.departamentos 
                WHERE nombre = :nombre AND is_active = 1 AND id <> :exclude_id
            """)
            result = await self.db.execute(query, {"nombre": nombre, "exclude_id": exclude_id})
        else:
            query = text("""
                SELECT COUNT(*) FROM adm.departamentos 
                WHERE nombre = :nombre AND is_active = 1
            """)
            result = await self.db.execute(query, {"nombre": nombre})
        return result.scalar() > 0

    async def nombre_duplicado_area(self, nombre: str, exclude_id: int = None) -> bool:
        """Verifica si ya existe un área activa con ese nombre"""
        if exclude_id:
            query = text("""
                SELECT COUNT(*) FROM adm.areas 
                WHERE nombre = :nombre AND is_active = 1 AND id <> :exclude_id
            """)
            result = await self.db.execute(query, {"nombre": nombre, "exclude_id": exclude_id})
        else:
            query = text("""
                SELECT COUNT(*) FROM adm.areas 
                WHERE nombre = :nombre AND is_active = 1
            """)
            result = await self.db.execute(query, {"nombre": nombre})
        return result.scalar() > 0

    async def nombre_duplicado_cargo(self, nombre: str, exclude_id: int = None) -> bool:
        """Verifica si ya existe un cargo activo con ese nombre"""
        if exclude_id:
            query = text("""
                SELECT COUNT(*) FROM adm.cargos 
                WHERE nombre = :nombre AND is_active = 1 AND id <> :exclude_id
            """)
            result = await self.db.execute(query, {"nombre": nombre, "exclude_id": exclude_id})
        else:
            query = text("""
                SELECT COUNT(*) FROM adm.cargos 
                WHERE nombre = :nombre AND is_active = 1
            """)
            result = await self.db.execute(query, {"nombre": nombre})
        return result.scalar() > 0

    async def documento_duplicado_empleado(self, nro_documento: str, exclude_id: int = None) -> bool:
        """Verifica si ya existe un empleado activo con ese número de documento"""
        if exclude_id:
            query = text("""
                SELECT COUNT(*) FROM adm.empleados 
                WHERE nro_documento = :nro_documento AND is_active = 1 AND id <> :exclude_id
            """)
            result = await self.db.execute(query, {"nro_documento": nro_documento, "exclude_id": exclude_id})
        else:
            query = text("""
                SELECT COUNT(*) FROM adm.empleados 
                WHERE nro_documento = :nro_documento AND is_active = 1
            """)
            result = await self.db.execute(query, {"nro_documento": nro_documento})
        return result.scalar() > 0

    # =========================================================================
    # VALIDACIONES DE DEPENDENCIAS (para soft delete)
    # =========================================================================

    async def departamento_tiene_areas_activas(self, depto_id: int) -> bool:
        """Verifica si el departamento tiene áreas activas"""
        query = text("SELECT COUNT(*) FROM adm.areas WHERE departamento_id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": depto_id})
        return result.scalar() > 0

    async def departamento_tiene_empleados_activos(self, depto_id: int) -> bool:
        """Verifica si el departamento tiene empleados activos"""
        query = text("SELECT COUNT(*) FROM adm.empleados left join adm.cargos on adm.empleados.cargo_id = adm.cargos.id inner join adm.areas on adm.cargos.area_id = adm.areas.id WHERE adm.areas.departamento_id = :id AND adm.empleados.is_active = 1")
        result = await self.db.execute(query, {"id": depto_id})
        return result.scalar() > 0

    async def area_tiene_subareas_activas(self, area_id: int) -> bool:
        """Verifica si el área tiene sub-áreas activas"""
        query = text("SELECT COUNT(*) FROM adm.areas WHERE area_padre_id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": area_id})
        return result.scalar() > 0

    async def area_tiene_empleados_activos(self, area_id: int) -> bool:
        """Verifica si el área tiene empleados activos"""
        query = text("SELECT COUNT(*) FROM adm.empleados left join adm.cargos on adm.empleados.cargo_id = adm.cargos.id WHERE adm.cargos.area_id = :id AND adm.empleados.is_active = 1")
        result = await self.db.execute(query, {"id": area_id})
        return result.scalar() > 0

    async def cargo_tiene_empleados_activos(self, cargo_id: int) -> bool:
        """Verifica si el cargo tiene empleados activos"""
        query = text("SELECT COUNT(*) FROM adm.empleados WHERE cargo_id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": cargo_id})
        return result.scalar() > 0

    async def empleado_es_jefe_de_otros(self, empleado_id: int) -> bool:
        """Verifica si el empleado es jefe de otros empleados activos"""
        query = text("SELECT COUNT(*) FROM adm.empleados WHERE jefe_id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": empleado_id})
        return result.scalar() > 0

    async def empleado_es_responsable_departamento(self, empleado_id: int) -> bool:
        """Verifica si el empleado es responsable de algún departamento"""
        query = text("SELECT COUNT(*) FROM adm.departamentos WHERE responsable_id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": empleado_id})
        return result.scalar() > 0

    async def empleado_es_responsable_area(self, empleado_id: int) -> bool:
        """Verifica si el empleado es responsable de algún área"""
        query = text("SELECT COUNT(*) FROM adm.areas WHERE responsable_id = :id AND is_active = 1")
        result = await self.db.execute(query, {"id": empleado_id})
        return result.scalar() > 0
