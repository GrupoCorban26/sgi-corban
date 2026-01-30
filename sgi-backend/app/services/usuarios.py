from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func, or_
from sqlalchemy.orm import selectinload
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.core.security import hashear_password
from app.models.seguridad import Usuario, Rol, usuarios_roles
from app.models.administrativo import Empleado, Cargo

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
        """Lista usuarios con paginación y filtros usando ORM"""
        offset = (page - 1) * page_size
        
        # Base query
        stmt = select(Usuario).options(
            selectinload(Usuario.roles),
            selectinload(Usuario.empleado)
        )
        
        # Filtros
        if busqueda:
            stmt = stmt.join(Usuario.empleado, isouter=True)
            stmt = stmt.where(
                or_(
                    Usuario.correo_corp.ilike(f"%{busqueda}%"),
                    Empleado.nombres.ilike(f"%{busqueda}%"),
                    Empleado.apellido_paterno.ilike(f"%{busqueda}%"),
                    Empleado.nro_documento.ilike(f"%{busqueda}%")
                )
            )
            
        if is_active is not None:
            stmt = stmt.where(Usuario.is_active == is_active)
            
        if rol_id:
            stmt = stmt.join(Usuario.roles).where(Rol.id == rol_id)
            
        # Count query
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total_records = total_result.scalar() or 0
        
        # Apply strict pagination
        stmt = stmt.offset(offset).limit(page_size).order_by(Usuario.id.desc())
        
        result = await self.db.execute(stmt)
        usuarios = result.scalars().all()
        
        # Transform data for response
        data_list = []
        for u in usuarios:
            roles_str = ", ".join([r.nombre for r in u.roles])
            empleado_nombre = f"{u.empleado.nombres} {u.empleado.apellido_paterno}" if u.empleado else "Sin Empleado"
            data_list.append({
                "id": u.id,
                "correo_corp": u.correo_corp,
                "is_active": u.is_active,
                "is_bloqueado": u.is_bloqueado,
                "ultimo_acceso": u.ultimo_acceso,
                "empleado_nombre": empleado_nombre,
                "roles": roles_str
            })

        return {
            "total": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_records + page_size - 1) // page_size if total_records > 0 else 1,
            "data": data_list
        }

    async def get_by_id(self, id: int) -> dict:
        """Obtiene un usuario por ID con sus roles"""
        stmt = select(Usuario).options(
            selectinload(Usuario.roles),
            selectinload(Usuario.empleado)
        ).where(Usuario.id == id)
        
        result = await self.db.execute(stmt)
        usuario = result.scalars().first()
        
        if not usuario:
            return None
            
        user_data = {
            "id": usuario.id,
            "empleado_id": usuario.empleado_id,
            "correo_corp": usuario.correo_corp,
            "is_active": usuario.is_active,
            "is_bloqueado": usuario.is_bloqueado,
            "debe_cambiar_pass": usuario.debe_cambiar_pass,
            "ultimo_acceso": usuario.ultimo_acceso,
            "created_at": usuario.created_at,
            "empleado_nombre": f"{usuario.empleado.nombres} {usuario.empleado.apellido_paterno}" if usuario.empleado else None,
            "roles": [{"id": r.id, "nombre": r.nombre} for r in usuario.roles]
        }
        
        return user_data

    async def create(self, usuario: UsuarioCreate, created_by: int = None) -> dict:
        """Crea un nuevo usuario"""
        # Verificar correo duplicado
        stmt_check = select(Usuario).where(Usuario.correo_corp == usuario.correo_corp)
        res_check = await self.db.execute(stmt_check)
        if res_check.scalars().first():
             return {"success": 0, "message": "El correo ya está registrado"}

        password_hash = hashear_password(usuario.password)
        
        nuevo_usuario = Usuario(
            empleado_id=usuario.empleado_id, # Puede ser None
            correo_corp=usuario.correo_corp,
            password_hash=password_hash,
            is_active=True,
            debe_cambiar_pass=True
        )
        self.db.add(nuevo_usuario)
        await self.db.commit()
        await self.db.refresh(nuevo_usuario)
        
        # Asignar roles
        if usuario.roles:
            await self.assign_roles(nuevo_usuario.id, usuario.roles, created_by)
        
        return {"success": 1, "id": nuevo_usuario.id, "message": "Usuario creado correctamente"}

    async def update(self, id: int, usuario: UsuarioUpdate, updated_by: int = None) -> dict:
        """Actualiza un usuario existente"""
        stmt = select(Usuario).where(Usuario.id == id)
        result = await self.db.execute(stmt)
        user_db = result.scalars().first()
        
        if not user_db:
             return {"success": 0, "message": "Usuario no encontrado"}

        if usuario.correo_corp:
             user_db.correo_corp = usuario.correo_corp
        if usuario.is_active is not None:
             user_db.is_active = usuario.is_active
        if usuario.debe_cambiar_pass is not None:
             user_db.debe_cambiar_pass = usuario.debe_cambiar_pass
        if usuario.is_bloqueado is not None:
             user_db.is_bloqueado = usuario.is_bloqueado
             if not usuario.is_bloqueado:
                 user_db.intentos_fallidos = 0 # Reiniciar intentos al desbloquear
                 
        await self.db.commit()
        
        # Si se actualizaron roles
        if usuario.roles is not None:
            await self.assign_roles(id, usuario.roles, updated_by)
        
        return {"success": 1, "id": id, "message": "Usuario actualizado correctamente"}

    async def delete(self, id: int, updated_by: int = None) -> dict:
        """Desactiva un usuario (soft delete)"""
        stmt = select(Usuario).where(Usuario.id == id)
        result = await self.db.execute(stmt)
        user_db = result.scalars().first()
        
        if not user_db:
             return {"success": 0, "message": "Usuario no encontrado"}
             
        user_db.is_active = False
        await self.db.commit()
        return {"success": 1, "message": "Usuario desactivado correctamente"}

    async def reactivate(self, id: int, updated_by: int = None) -> dict:
        """Reactiva un usuario"""
        stmt = select(Usuario).where(Usuario.id == id)
        result = await self.db.execute(stmt)
        user_db = result.scalars().first()
        
        if not user_db:
             return {"success": 0, "message": "Usuario no encontrado"}
             
        user_db.is_active = True
        await self.db.commit()
        return {"success": 1, "message": "Usuario reactivado correctamente"}

    async def get_roles(self) -> list:
        """Obtiene lista de roles para dropdown"""
        stmt = select(Rol).where(Rol.is_active == True)
        result = await self.db.execute(stmt)
        roles = result.scalars().all()
        return [{"id": r.id, "nombre": r.nombre} for r in roles]

    async def get_empleados_sin_usuario(self) -> list:
        """Obtiene empleados que no tienen usuario asignado"""
        # Subquery: empleados con usuario
        subq = select(Usuario.empleado_id).where(Usuario.empleado_id.isnot(None))
        
        stmt = select(Empleado).options(
            selectinload(Empleado.cargo).selectinload(Cargo.area)
        ).where(
        ).where(
            Empleado.is_active == True,
            Empleado.id.notin_(subq)
        ).order_by(Empleado.apellido_paterno)
        
        result = await self.db.execute(stmt)
        empleados = result.scalars().all()
        
        return [
            {
                "id": e.id, 
                "nombre_completo": f"{e.nombres} {e.apellido_paterno}",
                "cargo_nombre": e.cargo.nombre if e.cargo else None,
                "area_nombre": e.area.nombre if e.area else None,
                "nro_documento": e.nro_documento
            } 
            for e in empleados
        ]

    async def get_comerciales(self) -> list:
        """Obtiene usuarios con rol COMERCIAL o JEFE_COMERCIAL para dropdown"""
        # Obtener usuarios que tengan rol COMERCIAL o JEFE_COMERCIAL
        stmt = select(Usuario).options(
            selectinload(Usuario.roles),
            selectinload(Usuario.empleado)
        ).join(Usuario.roles).where(
            Usuario.is_active == True,
            Rol.nombre == 'COMERCIAL'
        ).distinct()
        
        result = await self.db.execute(stmt)
        usuarios = result.scalars().all()
        
        return [
            {
                "id": u.id,
                "nombre": f"{u.empleado.nombres} {u.empleado.apellido_paterno}" if u.empleado else u.correo_corp
            }
            for u in usuarios
        ]

    async def assign_roles(self, usuario_id: int, roles_ids: list, created_by: int = None) -> dict:
        """Asigna roles a un usuario (Reemplaza asignaciones previas)"""
        stmt = select(Usuario).options(selectinload(Usuario.roles)).where(Usuario.id == usuario_id)
        result = await self.db.execute(stmt)
        usuario = result.scalars().first()
        
        if not usuario:
             return {"success": 0, "message": "Usuario no encontrado"}
             
        # Obtener objetos Rol
        stmt_roles = select(Rol).where(Rol.id.in_(roles_ids))
        res_roles = await self.db.execute(stmt_roles)
        nuevos_roles = res_roles.scalars().all()
        
        # SQLAlchemy maneja la tabla intermedia automáticamente
        usuario.roles = nuevos_roles
        await self.db.commit()
        
        return {"success": 1, "message": "Roles asignados correctamente"}

    async def change_password(self, id: int, password: str, updated_by: int = None) -> dict:
        """Cambia la contraseña de un usuario"""
        stmt = select(Usuario).where(Usuario.id == id)
        result = await self.db.execute(stmt)
        user_db = result.scalars().first()
        
        if not user_db:
            return {"success": 0, "message": "Usuario no encontrado"}
            
        user_db.password_hash = hashear_password(password)
        user_db.debe_cambiar_pass = False # Asumimos que si la cambia admin, o usuario, ya cumplió
        await self.db.commit()
        
        return {"success": 1, "message": "Contraseña actualizada correctamente"}
