# database/models/__init__.py
"""
Exportaciones centralizadas de todos los modelos
"""

from database.models.rrhh import Cargo, Area, Empleado
from database.models.seg import Rol, Permiso, RolPermiso, Usuario, UsuarioRol, Sesion, LogAcceso

__all__ = [
    # RRHH
    "Cargo",
    "Area",
    "Empleado",
    
    # Seguridad
    "Rol",
    "Permiso",
    "RolPermiso",
    "Usuario",
    "UsuarioRol",
    "Sesion",
    "LogAcceso",
]