from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.organizacion.empleados import EmpleadoCreate, EmpleadoUpdate

class EmpleadoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self, 
        busqueda: str = None, 
        departamento_id: int = None, 
        area_id: int = None, 
        page: int = 1, 
        page_size: int = 15
    ) -> dict:
        """Obtiene todos los empleados con paginación y filtros"""
        query = text("""
            EXEC adm.usp_listar_empleados
                @busqueda=:busqueda,
                @departamento_id=:departamento_id,
                @area_id=:area_id,
                @page=:page,
                @registro_por_pagina=:page_size
        """)
        result = await self.db.execute(query, {
            "busqueda": busqueda, 
            "departamento_id": departamento_id, 
            "area_id": area_id, 
            "page": page, 
            "page_size": page_size
        })
        data = result.mappings().all()

        total_records = data[0]["total_registros"] if data else 0

        return {
            "total": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_records + page_size - 1) // page_size if total_records > 0 else 1,
            "data": data
        }

    async def create(self, empleado: EmpleadoCreate) -> dict:
        """Crea un nuevo empleado"""
        query = text("""
            EXEC adm.usp_crear_empleados
                @nombres=:nombres,
                @apellido_paterno=:apellido_paterno,
                @apellido_materno=:apellido_materno,
                @fecha_nacimiento=:fecha_nacimiento,
                @tipo_documento=:tipo_documento,
                @nro_documento=:nro_documento,
                @celular=:celular,
                @email_personal=:email_personal,
                @distrito_id=:distrito_id,
                @direccion=:direccion,
                @fecha_ingreso=:fecha_ingreso,
                @cargo_id=:cargo_id,
                @area_id=:area_id,
                @departamento_id=:departamento_id,
                @jefe_id=:jefe_id
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
            "area_id": empleado.area_id,
            "departamento_id": empleado.departamento_id,
            "jefe_id": empleado.jefe_id
        })
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al crear empleado"}

    async def update(self, id: int, empleado: EmpleadoUpdate) -> dict:
        """Actualiza un empleado existente"""
        query = text("""
            EXEC adm.usp_editar_empleados
                @id=:id,
                @nombres=:nombres,
                @apellido_paterno=:apellido_paterno,
                @apellido_materno=:apellido_materno,
                @fecha_nacimiento=:fecha_nacimiento,
                @tipo_documento=:tipo_documento,
                @nro_documento=:nro_documento,
                @celular=:celular,
                @email_personal=:email_personal,
                @distrito_id=:distrito_id,
                @direccion=:direccion,
                @fecha_ingreso=:fecha_ingreso,
                @cargo_id=:cargo_id,
                @area_id=:area_id,
                @departamento_id=:departamento_id,
                @jefe_id=:jefe_id
        """)
        result = await self.db.execute(query, {
            "id": id,
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
            "area_id": empleado.area_id,
            "departamento_id": empleado.departamento_id,
            "jefe_id": empleado.jefe_id
        })
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al actualizar empleado"}

    async def delete(self, id: int) -> dict:
        """Desactiva un empleado (soft delete) - asigna fecha_cese automáticamente"""
        query = text("EXEC adm.usp_desactivar_empleados @id=:id")
        result = await self.db.execute(query, {"id": id})
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al desactivar empleado"}

    async def reactivate(self, id: int) -> dict:
        """Reactiva un empleado - limpia fecha_cese"""
        query = text("EXEC adm.usp_reactivar_empleado @id=:id")
        result = await self.db.execute(query, {"id": id})
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al reactivar empleado"}

    async def get_dropdown(self) -> list:
        """Obtiene lista simple de empleados para dropdown"""
        query = text("EXEC adm.usp_listar_empleados_dropdown")
        result = await self.db.execute(query)
        data = result.mappings().all()
        return [dict(row) for row in data]
