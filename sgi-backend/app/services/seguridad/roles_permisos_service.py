import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from app.models.seguridad import Permiso, Rol
from app.core.permisos_list import PERMISOS_BASE

logger = logging.getLogger(__name__)

class RolesPermisosService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # SINCRONIZACIÓN DE PERMISOS
    # =========================================================================
    async def sync_permisos_from_code(self):
        """
        Lee el listado de PERMISOS_BASE y asegura que todos existan en la BD.
        Actualiza nombre_display o descripcion si han cambiado.
        """
        logger.info("Iniciando sincronización de permisos...")
        count_nuevos = 0
        count_actualizados = 0

        # Obtener todos los permisos actuales
        result = await self.db.execute(select(Permiso))
        permisos_db = {p.nombre_tecnico: p for p in result.scalars().all()}

        for p_data in PERMISOS_BASE:
            tecnico = p_data["nombre_tecnico"]
            if tecnico in permisos_db:
                # Verificar si algo cambió
                p_obj = permisos_db[tecnico]
                cambios = False
                if p_obj.nombre_display != p_data["nombre_display"]:
                    p_obj.nombre_display = p_data["nombre_display"]
                    cambios = True
                if p_obj.descripcion != p_data["descripcion"]:
                    p_obj.descripcion = p_data["descripcion"]
                    cambios = True
                if p_obj.modulo != p_data["modulo"]:
                    p_obj.modulo = p_data["modulo"]
                    cambios = True
                
                if cambios:
                    count_actualizados += 1
            else:
                # Es un permiso nuevo
                nuevo_permiso = Permiso(
                    nombre_tecnico=p_data["nombre_tecnico"],
                    nombre_display=p_data["nombre_display"],
                    modulo=p_data["modulo"],
                    descripcion=p_data["descripcion"]
                )
                self.db.add(nuevo_permiso)
                count_nuevos += 1

        await self.db.commit()
        logger.info(f"Sync de permisos finalizado: {count_nuevos} nuevos, {count_actualizados} actualizados.")
        return {"nuevos": count_nuevos, "actualizados": count_actualizados}

    # =========================================================================
    # CRUD ROLES
    # =========================================================================
    async def get_roles(self):
        result = await self.db.execute(select(Rol).order_by(Rol.id))
        return result.scalars().all()

    async def get_permisos(self):
        result = await self.db.execute(select(Permiso).order_by(Permiso.modulo, Permiso.id))
        return result.scalars().all()

    async def create_rol(self, nombre: str, descripcion: str, permiso_ids: list[int]):
        # Validar si ya existe
        exists = (await self.db.execute(select(Rol).where(Rol.nombre == nombre))).scalars().first()
        if exists:
            return None # O lanzar excepción

        nuevo_rol = Rol(nombre=nombre, descripcion=descripcion)
        
        # Asignar permisos si existen
        if permiso_ids:
            permisos = (await self.db.execute(select(Permiso).where(Permiso.id.in_(permiso_ids)))).scalars().all()
            nuevo_rol.permisos = permisos

        self.db.add(nuevo_rol)
        await self.db.commit()
        await self.db.refresh(nuevo_rol)
        return nuevo_rol

    async def update_rol(self, rol_id: int, nombre: str, descripcion: str, permiso_ids: list[int], is_active: bool = True):
        rol = await self.db.get(Rol, rol_id)
        if not rol:
            return None

        rol.nombre = nombre
        rol.descripcion = descripcion
        rol.is_active = is_active

        # Actualizar permisos
        if permiso_ids is not None:
            # Para borrar todos los permisos, permiso_ids vendría como []
            permisos = (await self.db.execute(select(Permiso).where(Permiso.id.in_(permiso_ids)))).scalars().all()
            rol.permisos = permisos

        await self.db.commit()
        await self.db.refresh(rol)
        return rol
