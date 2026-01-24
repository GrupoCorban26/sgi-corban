from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException
from app.schemas.organizacion.empleados import EmpleadoCreate, EmpleadoUpdate
from app.services.validators import CommonValidators


class EmpleadoService:
    """
    Servicio de Empleados - Refactorizado
    - Eliminadas referencias a area_id y departamento_id (columnas eliminadas)
    - Área y departamento se derivan via cargo → area → departamento
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.validators = CommonValidators(db)

    # =========================================================================
    # OPERACIONES CRUD
    # =========================================================================

    async def get_all(
        self, 
        busqueda: str = None, 
        departamento_id: int = None, 
        area_id: int = None, 
        page: int = 1, 
        page_size: int = 15
    ) -> dict:
        """Lista empleados con paginación y filtros (area/depto via cargo)"""
        offset = (page - 1) * page_size
        
        where_clauses = ["e.is_active = 1"]
        params = {"offset": offset, "page_size": page_size}
        
        if busqueda:
            where_clauses.append("""
                (e.nombres LIKE '%' + :busqueda + '%' 
                 OR e.apellido_paterno LIKE '%' + :busqueda + '%'
                 OR e.apellido_materno LIKE '%' + :busqueda + '%'
                 OR e.nro_documento LIKE '%' + :busqueda + '%')
            """)
            params["busqueda"] = busqueda
        
        # Filtrar por departamento via cargo → area → departamento
        if departamento_id:
            where_clauses.append("a.departamento_id = :departamento_id")
            params["departamento_id"] = departamento_id
        
        # Filtrar por área via cargo
        if area_id:
            where_clauses.append("c.area_id = :area_id")
            params["area_id"] = area_id
        
        where_sql = " AND ".join(where_clauses)
        
        # Contar total
        count_query = text(f"""
            SELECT COUNT(*) 
            FROM adm.empleados e
            LEFT JOIN adm.cargos c ON c.id = e.cargo_id
            LEFT JOIN adm.areas a ON a.id = c.area_id
            WHERE {where_sql}
        """)
        count_result = await self.db.execute(count_query, params)
        total = count_result.scalar() or 0
        
        # Obtener datos (area y departamento derivados de cargo)
        data_query = text(f"""
            SELECT
                e.id,
                e.nombres,
                e.apellido_paterno,
                e.apellido_materno,
                e.fecha_nacimiento,
                e.tipo_documento,
                e.nro_documento,
                e.celular,
                e.email_personal,
                e.distrito_id,
                dist.nombre AS distrito,
                p.nombre AS provincia,
                dept_ub.nombre AS departamento_ubigeo,
                e.direccion,
                e.fecha_ingreso,
                e.fecha_cese,
                e.is_active,
                e.cargo_id,
                c.nombre AS cargo_nombre,
                c.area_id AS area_id,
                a.nombre AS area_nombre,
                a.departamento_id AS departamento_id,
                d.nombre AS departamento_nombre,
                e.jefe_id,
                ISNULL(emp_jefe.nombres + ' ' + emp_jefe.apellido_paterno, 'Sin jefe') AS jefe_nombre
            FROM adm.empleados e
            LEFT JOIN core.distritos dist ON dist.id = e.distrito_id
            LEFT JOIN core.provincias p ON p.id = dist.provincia_id
            LEFT JOIN core.departamentos dept_ub ON dept_ub.id = p.departamento_id
            LEFT JOIN adm.cargos c ON c.id = e.cargo_id
            LEFT JOIN adm.areas a ON a.id = c.area_id
            LEFT JOIN adm.departamentos d ON d.id = a.departamento_id
            LEFT JOIN adm.empleados emp_jefe ON emp_jefe.id = e.jefe_id
            WHERE {where_sql}
            ORDER BY e.id
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
        """)
        
        result = await self.db.execute(data_query, params)
        data = result.mappings().all()
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            "data": [dict(row) for row in data]
        }

    async def get_by_id(self, empleado_id: int) -> dict:
        """Obtiene un empleado por su ID (area/depto derivados de cargo)"""
        query = text("""
            SELECT
                e.id, e.nombres, e.apellido_paterno, e.apellido_materno,
                e.fecha_nacimiento, e.tipo_documento, e.nro_documento,
                e.celular, e.email_personal, e.distrito_id,
                dist.nombre AS distrito, p.nombre AS provincia, dept_ub.nombre AS departamento_ubigeo,
                p.id AS provincia_id, dept_ub.id AS departamento_ubigeo_id,
                e.direccion, e.fecha_ingreso, e.fecha_cese, e.is_active,
                e.cargo_id, c.nombre AS cargo_nombre,
                c.area_id AS area_id, a.nombre AS area_nombre,
                a.departamento_id AS departamento_id, d.nombre AS departamento_nombre,
                e.jefe_id, ISNULL(emp_jefe.nombres + ' ' + emp_jefe.apellido_paterno, 'Sin jefe') AS jefe_nombre
            FROM adm.empleados e
            LEFT JOIN core.distritos dist ON dist.id = e.distrito_id
            LEFT JOIN core.provincias p ON p.id = dist.provincia_id
            LEFT JOIN core.departamentos dept_ub ON dept_ub.id = p.departamento_id
            LEFT JOIN adm.cargos c ON c.id = e.cargo_id
            LEFT JOIN adm.areas a ON a.id = c.area_id
            LEFT JOIN adm.departamentos d ON d.id = a.departamento_id
            LEFT JOIN adm.empleados emp_jefe ON emp_jefe.id = e.jefe_id
            WHERE e.id = :id
        """)
        result = await self.db.execute(query, {"id": empleado_id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def create(self, empleado: EmpleadoCreate) -> dict:
        """Crea un nuevo empleado (sin area_id ni departamento_id)"""
        
        # Validación: Cargo existe
        if not await self.validators.cargo_existe(empleado.cargo_id):
            raise HTTPException(400, "El cargo especificado no existe o está inactivo.")
        
        # Validación: Jefe existe (si se especifica)
        if empleado.jefe_id and not await self.validators.empleado_existe(empleado.jefe_id):
            raise HTTPException(400, "El jefe especificado no existe o está inactivo.")
        
        # Validación: Distrito existe
        if empleado.distrito_id and not await self.validators.distrito_existe(empleado.distrito_id):
            raise HTTPException(400, "El distrito especificado no existe.")
        
        # Validación: Documento único
        if await self.validators.documento_duplicado_empleado(empleado.nro_documento):
            raise HTTPException(400, "Ya existe un empleado con el número de documento especificado.")
        
        query = text("""
            INSERT INTO adm.empleados (
                nombres, apellido_paterno, apellido_materno, fecha_nacimiento, 
                tipo_documento, nro_documento, celular, email_personal, 
                distrito_id, direccion, fecha_ingreso, fecha_cese, is_active, 
                cargo_id, jefe_id
            )
            OUTPUT INSERTED.id
            VALUES (
                :nombres, :apellido_paterno, :apellido_materno, :fecha_nacimiento, 
                :tipo_documento, :nro_documento, :celular, :email_personal, 
                :distrito_id, :direccion, :fecha_ingreso, NULL, 1, 
                :cargo_id, :jefe_id
            )
        """)
        
        result = await self.db.execute(query, {
            "nombres": empleado.nombres,
            "apellido_paterno": empleado.apellido_paterno,
            "apellido_materno": empleado.apellido_materno,
            "fecha_nacimiento": empleado.fecha_nacimiento,
            "tipo_documento": empleado.tipo_documento,
            "nro_documento": empleado.nro_documento,
            "celular": empleado.celular,
            "email_personal": empleado.email_personal,
            "distrito_id": empleado.distrito_id,
            "direccion": empleado.direccion,
            "fecha_ingreso": empleado.fecha_ingreso,
            "cargo_id": empleado.cargo_id,
            "jefe_id": empleado.jefe_id
        })
        await self.db.commit()
        
        row = result.first()
        return {"success": True, "id": row[0], "message": "Empleado creado exitosamente"}

    async def update(self, empleado_id: int, empleado: EmpleadoUpdate) -> dict:
        """Actualiza un empleado existente (sin area_id ni departamento_id)"""
        
        # Validación: Empleado existe
        if not await self.validators.empleado_existe(empleado_id):
            raise HTTPException(404, "El empleado especificado no existe.")
        
        # Validación: Cargo existe
        if not await self.validators.cargo_existe(empleado.cargo_id):
            raise HTTPException(400, "El cargo especificado no existe o está inactivo.")
        
        # Validación: Jefe existe (si se especifica)
        if empleado.jefe_id and not await self.validators.empleado_existe(empleado.jefe_id):
            raise HTTPException(400, "El jefe especificado no existe o está inactivo.")
        
        # Validación: Distrito existe
        if empleado.distrito_id and not await self.validators.distrito_existe(empleado.distrito_id):
            raise HTTPException(400, "El distrito especificado no existe.")
        
        # Validación: Documento único (excluyendo actual)
        if await self.validators.documento_duplicado_empleado(empleado.nro_documento, exclude_id=empleado_id):
            raise HTTPException(400, "Ya existe otro empleado con el número de documento especificado.")
        
        query = text("""
            UPDATE adm.empleados
            SET nombres = :nombres,
                apellido_paterno = :apellido_paterno,
                apellido_materno = :apellido_materno,
                fecha_nacimiento = :fecha_nacimiento,
                tipo_documento = :tipo_documento,
                nro_documento = :nro_documento,
                celular = :celular,
                email_personal = :email_personal,
                distrito_id = :distrito_id,
                direccion = :direccion,
                fecha_ingreso = :fecha_ingreso,
                cargo_id = :cargo_id,
                jefe_id = :jefe_id,
                updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {
            "id": empleado_id,
            "nombres": empleado.nombres,
            "apellido_paterno": empleado.apellido_paterno,
            "apellido_materno": empleado.apellido_materno,
            "fecha_nacimiento": empleado.fecha_nacimiento,
            "tipo_documento": empleado.tipo_documento,
            "nro_documento": empleado.nro_documento,
            "celular": empleado.celular,
            "email_personal": empleado.email_personal,
            "distrito_id": empleado.distrito_id,
            "direccion": empleado.direccion,
            "fecha_ingreso": empleado.fecha_ingreso,
            "cargo_id": empleado.cargo_id,
            "jefe_id": empleado.jefe_id
        })
        await self.db.commit()
        
        return {"success": True, "id": empleado_id, "message": "Empleado actualizado exitosamente"}

    async def delete(self, empleado_id: int) -> dict:
        """Desactiva un empleado (soft delete) - asigna fecha_cese automáticamente"""
        
        # Validación: Empleado existe
        if not await self.validators.empleado_existe(empleado_id):
            raise HTTPException(404, "El empleado especificado no existe o ya está desactivado.")
        
        # Validación: No es jefe de otros
        if await self.validators.empleado_es_jefe_de_otros(empleado_id):
            raise HTTPException(400, "No se puede desactivar un empleado que es jefe de otros empleados activos.")
        
        # Validación: No es responsable de departamento
        if await self.validators.empleado_es_responsable_departamento(empleado_id):
            raise HTTPException(400, "No se puede desactivar un empleado que es responsable de un departamento.")
        
        # Validación: No es responsable de área
        if await self.validators.empleado_es_responsable_area(empleado_id):
            raise HTTPException(400, "No se puede desactivar un empleado que es responsable de un área.")
        
        query = text("""
            UPDATE adm.empleados
            SET is_active = 0,
                fecha_cese = CAST(GETDATE() AS DATE),
                updated_at = GETDATE()
            WHERE id = :id;

            -- Desactivar usuario asociado si existe
            UPDATE seg.usuarios
            SET is_active = 0,
                updated_at = GETDATE()
            WHERE empleado_id = :id AND is_active = 1;
        """)
        
        await self.db.execute(query, {"id": empleado_id})
        await self.db.commit()
        
        return {"success": True, "id": empleado_id, "message": "Empleado desactivado exitosamente"}

    async def reactivate(self, empleado_id: int) -> dict:
        """Reactiva un empleado - limpia fecha_cese"""
        
        # Verificar que existe (incluso inactivo)
        query = text("SELECT is_active FROM adm.empleados WHERE id = :id")
        result = await self.db.execute(query, {"id": empleado_id})
        row = result.first()
        
        if not row:
            raise HTTPException(404, "El empleado especificado no existe.")
        
        if row[0] == 1:
            raise HTTPException(400, "El empleado ya se encuentra activo.")
        
        query = text("""
            UPDATE adm.empleados
            SET is_active = 1,
                fecha_cese = NULL,
                updated_at = GETDATE()
            WHERE id = :id
        """)
        
        await self.db.execute(query, {"id": empleado_id})
        await self.db.commit()
        
        return {"success": True, "id": empleado_id, "message": "Empleado reactivado exitosamente"}

    async def get_dropdown(self) -> list:
        """Lista simple de empleados activos para dropdown"""
        query = text("""
            SELECT 
                id, 
                CONCAT(nombres, ' ', apellido_paterno, ' ', ISNULL(apellido_materno, '')) AS nombre_completo
            FROM adm.empleados
            WHERE is_active = 1
            ORDER BY nombres ASC
        """)
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def get_dropdown_by_area(self, area_id: int) -> list:
        """Lista de empleados activos filtrados por área (via cargo)"""
        query = text("""
            SELECT 
                e.id, 
                CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', ISNULL(e.apellido_materno, '')) AS nombre_completo
            FROM adm.empleados e
            INNER JOIN adm.cargos c ON c.id = e.cargo_id
            WHERE e.is_active = 1 AND c.area_id = :area_id
            ORDER BY e.nombres ASC
        """)
        result = await self.db.execute(query, {"area_id": area_id})
        return [dict(row) for row in result.mappings().all()]

    async def get_dropdown_by_departamento(self, departamento_id: int) -> list:
        """Lista de empleados activos filtrados por departamento (via cargo → area)"""
        query = text("""
            SELECT 
                e.id, 
                CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', ISNULL(e.apellido_materno, '')) AS nombre_completo
            FROM adm.empleados e
            INNER JOIN adm.cargos c ON c.id = e.cargo_id
            INNER JOIN adm.areas a ON a.id = c.area_id
            WHERE e.is_active = 1 AND a.departamento_id = :departamento_id
            ORDER BY e.nombres ASC
        """)
        result = await self.db.execute(query, {"departamento_id": departamento_id})
        return [dict(row) for row in result.mappings().all()]
