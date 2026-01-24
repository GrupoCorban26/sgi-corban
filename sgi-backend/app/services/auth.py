import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.seguridad import Usuario, Rol
from app.models.administrativo import Empleado, Area, Cargo

async def obtener_usuario_por_correo(db: AsyncSession, correo: str):
    """
    Obtiene un usuario por su correo corporativo usando ORM de SQLAlchemy.
    Carga ansiosamente (eager load) relaciones necesarias: Empleado, Area, Cargo, Roles, Permisos.
    """
    try:
        # 1. Construir la consulta con todas las relaciones necesarias
        # Usamos selectinload para cargar relaciones "to-many" de forma eficiente
        query = (
            select(Usuario)
            .where(Usuario.correo_corp == correo)
            .options(
                selectinload(Usuario.empleado)
                .selectinload(Empleado.cargo)
                .selectinload(Cargo.area)
                .selectinload(Area.departamento),
                selectinload(Usuario.roles)
                .selectinload(Rol.permisos)
            )
        )

        result = await db.execute(query)
        usuario = result.scalars().first()

        if not usuario:
            return None

        # 2. Transformar al formato de diccionario esperado por el endpoint
        # Extraemos roles de la relación
        roles = [r.nombre for r in usuario.roles] if usuario.roles else []
        
        # Extraemos permisos de todos los roles (aplanar lista)
        permisos = []
        if usuario.roles:
            for rol in usuario.roles:
                if rol.permisos:
                    for permiso in rol.permisos:
                        permisos.append(permiso.nombre_tecnico)
        
        # Eliminar duplicados de permisos
        permisos = list(set(permisos))

        # Datos del empleado (si existe)
        nombre_corto = "Usuario Sistema"
        area_nombre = "Sin Área"
        cargo_nombre = "Sin Cargo"
        
        if usuario.empleado:
            nombre_corto = f"{usuario.empleado.nombres} {usuario.empleado.apellido_paterno}"
            if usuario.empleado.area:
                area_nombre = usuario.empleado.area.nombre
            if usuario.empleado.cargo:
                cargo_nombre = usuario.empleado.cargo.nombre

        user_dict = {
            "usuario_id": usuario.id,
            "correo": usuario.correo_corp,
            "password_hash": usuario.password_hash,
            "is_bloqueado": usuario.is_bloqueado,
            "nombre_corto": nombre_corto,
            "permisos": permisos,
            "roles": roles,
            "area_nombre": area_nombre,
            "cargo_nombre": cargo_nombre,
            "debe_cambiar_pass": usuario.debe_cambiar_pass
        }

        return user_dict
    
    except Exception as e:
        logging.error(f"Error en obtener_usuario_por_correo (ORM): {e}")
        return None

from datetime import datetime, timedelta, timezone
from app.models.seguridad import Sesion

async def registrar_sesion(db: AsyncSession, usuario_id: int, token: str, ip: str = None, user_agent: str = None):
    """Registra una nueva sesión activa en la base de datos."""
    try:
        # Calculamos expiración (30 min por defecto, sincronizar con config)
        expira = datetime.now(timezone.utc) + timedelta(minutes=30) 
        
        nueva_sesion = Sesion(
            usuario_id=usuario_id,
            refresh_token=token, # Por simplicidad guardamos el access_token aquí para validarlo/revocarlo
            ip_address=ip,
            user_agent=user_agent,
            expira_en=expira,
            es_revocado=False
        )
        db.add(nueva_sesion)
        await db.commit()
    except Exception as e:
        logging.error(f"Error registrando sesión: {e}")
        # No bloqueamos el login si falla el registro de sesión, pero es mala práctica
        # En producción deberíamos manejarlo mejor

async def revocar_sesion(db: AsyncSession, token: str):
    """Revoca (marca como inválida) una sesión basada en el token."""
    try:
        # Buscar la sesión con este token
        query = select(Sesion).where(Sesion.refresh_token == token)
        result = await db.execute(query)
        sesion = result.scalars().first()
        
        if sesion:
            sesion.es_revocado = True
            await db.commit()
            return True
        return False
    except Exception as e:
        logging.error(f"Error revocando sesión: {e}")
        return False

async def verificar_sesion_activa(db: AsyncSession, token: str) -> bool:
    """Verifica si existe una sesión activa y no revocada para este token."""
    try:
        query = select(Sesion).where(Sesion.refresh_token == token)
        result = await db.execute(query)
        sesion = result.scalars().first()
        
        if not sesion:
            return False # Sesión no encontrada en BD (posible token antiguo o falsificado)
        
        if sesion.es_revocado:
            return False # Sesión revocada explícitamente
            
        # Opcional: Verificar expiración en BD también
        if sesion.expira_en.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
             return False
             
        return True
    except Exception as e:
        logging.error(f"Error verificando sesión: {e}")
        return False # Ante la duda, denegar

