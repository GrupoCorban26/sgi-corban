from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.core.security import hashear_password


class UsuarioService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        busqueda: str = None,
        is_active: bool = None,
        rol_id: int = None,
        page: int = 1,
        page_size: int = 15
    ) -> dict:
        """Lista usuarios con paginación y filtros"""
        query = text("""
            EXEC seg.usp_listar_usuarios
                @busqueda=:busqueda,
                @is_active=:is_active,
                @rol_id=:rol_id,
                @page=:page,
                @registro_por_pagina=:page_size
        """)
        result = await self.db.execute(query, {
            "busqueda": busqueda,
            "is_active": is_active,
            "rol_id": rol_id,
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
            "data": [dict(row) for row in data]
        }

    async def get_by_id(self, id: int) -> dict:
        """Obtiene un usuario por ID con sus roles"""
        query = text("EXEC seg.usp_obtener_usuario @id=:id")
        result = await self.db.execute(query, {"id": id})
        
        # Primer resultset: datos del usuario
        user_row = result.mappings().first()
        if not user_row:
            return None
        
        user_data = dict(user_row)
        
        # Segundo resultset: roles
        result = await self.db.execute(text("SELECT rol_id, rol_nombre FROM seg.usuarios_roles ur INNER JOIN seg.roles r ON ur.rol_id = r.id WHERE ur.usuario_id = :id"), {"id": id})
        roles = [{"id": row.rol_id, "nombre": row.rol_nombre} for row in result.fetchall()]
        user_data["roles"] = roles
        
        return user_data

    async def create(self, usuario: UsuarioCreate, created_by: int = None) -> dict:
        """Crea un nuevo usuario"""
        password_hash = hashear_password(usuario.password)
        
        query = text("""
            EXEC seg.usp_crear_usuario
                @empleado_id=:empleado_id,
                @correo_corp=:correo_corp,
                @password_hash=:password_hash,
                @created_by=:created_by
        """)
        result = await self.db.execute(query, {
            "empleado_id": usuario.empleado_id,
            "correo_corp": usuario.correo_corp,
            "password_hash": password_hash,
            "created_by": created_by
        })
        await self.db.commit()
        row = result.mappings().first()
        
        if row and row["success"] == 1 and usuario.roles:
            # Asignar roles
            await self.assign_roles(row["id"], usuario.roles, created_by)
        
        return dict(row) if row else {"success": 0, "message": "Error al crear usuario"}

    async def update(self, id: int, usuario: UsuarioUpdate, updated_by: int = None) -> dict:
        """Actualiza un usuario existente"""
        query = text("""
            EXEC seg.usp_editar_usuario
                @id=:id,
                @correo_corp=:correo_corp,
                @is_active=:is_active,
                @debe_cambiar_pass=:debe_cambiar_pass,
                @is_bloqueado=:is_bloqueado,
                @updated_by=:updated_by
        """)
        result = await self.db.execute(query, {
            "id": id,
            "correo_corp": usuario.correo_corp,
            "is_active": usuario.is_active,
            "debe_cambiar_pass": usuario.debe_cambiar_pass,
            "is_bloqueado": usuario.is_bloqueado,
            "updated_by": updated_by
        })
        await self.db.commit()
        row = result.mappings().first()
        
        # Si se actualizaron roles
        if row and row["success"] == 1 and usuario.roles is not None:
            await self.assign_roles(id, usuario.roles, updated_by)
        
        return dict(row) if row else {"success": 0, "message": "Error al actualizar usuario"}

    async def delete(self, id: int, updated_by: int = None) -> dict:
        """Desactiva un usuario (soft delete)"""
        query = text("EXEC seg.usp_desactivar_usuario @id=:id, @updated_by=:updated_by")
        result = await self.db.execute(query, {"id": id, "updated_by": updated_by})
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al desactivar usuario"}

    async def reactivate(self, id: int, updated_by: int = None) -> dict:
        """Reactiva un usuario"""
        query = text("EXEC seg.usp_reactivar_usuario @id=:id, @updated_by=:updated_by")
        result = await self.db.execute(query, {"id": id, "updated_by": updated_by})
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al reactivar usuario"}

    async def get_roles(self) -> list:
        """Obtiene lista de roles para dropdown"""
        query = text("EXEC seg.usp_listar_roles")
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def get_empleados_sin_usuario(self) -> list:
        """Obtiene empleados que no tienen usuario asignado"""
        query = text("EXEC seg.usp_listar_empleados_sin_usuario")
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def assign_roles(self, usuario_id: int, roles: list, created_by: int = None) -> dict:
        """Asigna roles a un usuario"""
        roles_str = ",".join(str(r) for r in roles) if roles else ""
        query = text("""
            EXEC seg.usp_asignar_roles_usuario
                @usuario_id=:usuario_id,
                @roles_ids=:roles_ids,
                @created_by=:created_by
        """)
        result = await self.db.execute(query, {
            "usuario_id": usuario_id,
            "roles_ids": roles_str,
            "created_by": created_by
        })
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al asignar roles"}

    async def change_password(self, id: int, password: str, updated_by: int = None) -> dict:
        """Cambia la contraseña de un usuario"""
        password_hash = hashear_password(password)
        query = text("EXEC seg.usp_cambiar_password @id=:id, @password_hash=:password_hash, @updated_by=:updated_by")
        result = await self.db.execute(query, {
            "id": id,
            "password_hash": password_hash,
            "updated_by": updated_by
        })
        await self.db.commit()
        row = result.mappings().first()
        return dict(row) if row else {"success": 0, "message": "Error al cambiar contraseña"}
