from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.organizacion.empleado import EmpleadoCreate, EmpleadoUpdate

class EmpleadoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, busqueda: str = None, departamento_id: int = None, area_id: int = None, page: int = 1, page_size: int = 15) -> dict:
        """Obtiene todos los empleados con paginación y filtros"""
        query = text("""
            EXEC adm.usp_listar_empleados
                @busqueda=:b,
                @departamento_id=:d,
                @area_id=:a,
                @page=:p,
                @registro_por_pagina=:r
        """)
        result = await self.db.execute(query, {
            "b": busqueda, 
            "d": departamento_id, 
            "a": area_id, 
            "p": page, 
            "r": page_size
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
                @nombre=:nombres,
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
                @fecha_cese=:fecha_cese,
                @activo=:activo,
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
            "fecha_cese": empleado.fecha_cese,
            "activo": empleado.activo,
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
                @nombre=:nombres,
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
                @fecha_cese=:fecha_cese,
                @activo=:activo,
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
            "fecha_cese": empleado.fecha_cese,
            "activo": empleado.activo,
            "cargo_id": empleado.cargo_id,
            "area_id": empleado.area_id,
            "departamento_id": empleado.departamento_id,
            "jefe_id": empleado.jefe_id
        })
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al actualizar empleado"}

    async def delete(self, id: int) -> dict:
        """Desactiva un empleado (soft delete)"""
        query = text("EXEC adm.usp_desactivar_empleados @id=:id, @estado=0")
        result = await self.db.execute(query, {"id": id})
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al desactivar empleado"}

    async def get_dropdown(self) -> list:
        """Obtiene lista simple de empleados para dropdown"""
        query = text("EXEC adm.usp_listar_empleados_dropdown")
        result = await self.db.execute(query)
        data = result.mappings().all()
        
        return {
            "success": 1,
            "data": data
        }
