# database/models/seg.py
"""
Modelos de SQLAlchemy para el schema SEG (Seguridad)
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.db_connection import Base


class Rol(Base):
    """Tabla de roles del sistema"""
    __tablename__ = "roles"
    __table_args__ = {"schema": "seg"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(300), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    permisos = relationship("RolPermiso", back_populates="rol")
    usuarios = relationship("UsuarioRol", back_populates="rol")


class Permiso(Base):
    """Tabla de permisos del sistema"""
    __tablename__ = "permisos"
    __table_args__ = {"schema": "seg"}

    id = Column(Integer, primary_key=True, index=True)
    nombre_tecnico = Column(String(100), unique=True, nullable=False)  # 'rrhh.empleados.ver'
    nombre_display = Column(String(150), nullable=False)  # 'Ver Empleados'
    modulo = Column(String(50), nullable=False)  # 'rrhh', 'comercial', 'seg'
    descripcion = Column(String(300), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    roles = relationship("RolPermiso", back_populates="permiso")


class RolPermiso(Base):
    """Tabla intermedia: Roles y Permisos (N:M)"""
    __tablename__ = "rol_permiso"
    __table_args__ = {"schema": "seg"}

    rol_id = Column(Integer, ForeignKey("seg.roles.id", ondelete="CASCADE"), primary_key=True)
    permiso_id = Column(Integer, ForeignKey("seg.permisos.id", ondelete="CASCADE"), primary_key=True)
    asignado_en = Column(DateTime(timezone=True), server_default=func.now())
    asignado_por = Column(Integer, nullable=True)

    # Relaciones
    rol = relationship("Rol", back_populates="permisos")
    permiso = relationship("Permiso", back_populates="roles")


class Usuario(Base):
    """Tabla de usuarios del sistema"""
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "seg"}

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("rrhh.empleados.id"), unique=True, nullable=False)
    
    # Credenciales
    correo_corp = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Estado
    is_active = Column(Boolean, default=True)
    is_bloqueado = Column(Boolean, default=False)
    intentos_fallidos = Column(Integer, default=0)
    
    # Recuperación de contraseña
    reset_token = Column(String(255), nullable=True)
    reset_token_expira = Column(DateTime(timezone=True), nullable=True)
    
    # Actividad
    ultimo_acceso = Column(DateTime(timezone=True), nullable=True)
    debe_cambiar_password = Column(Boolean, default=True)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    
    # Relaciones
    empleado = relationship("Empleado", back_populates="usuario")
    roles = relationship("UsuarioRol", back_populates="usuario")
    sesiones = relationship("Sesion", back_populates="usuario")
    logs_acceso = relationship("LogAcceso", back_populates="usuario")


class UsuarioRol(Base):
    """Tabla intermedia: Usuarios y Roles (N:M)"""
    __tablename__ = "usuarios_roles"
    __table_args__ = {"schema": "seg"}

    usuario_id = Column(Integer, ForeignKey("seg.usuarios.id", ondelete="CASCADE"), primary_key=True)
    rol_id = Column(Integer, ForeignKey("seg.roles.id", ondelete="CASCADE"), primary_key=True)
    asignado_en = Column(DateTime(timezone=True), server_default=func.now())
    asignado_por = Column(Integer, nullable=True)

    # Relaciones
    usuario = relationship("Usuario", back_populates="roles")
    rol = relationship("Rol", back_populates="usuarios")


class Sesion(Base):
    """Tabla de sesiones activas (refresh tokens)"""
    __tablename__ = "sesiones"
    __table_args__ = {"schema": "seg"}

    id = Column(String(36), primary_key=True)  # GUID
    usuario_id = Column(Integer, ForeignKey("seg.usuarios.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(String(500), nullable=False)
    user_agent = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    is_revocado = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="sesiones")


class LogAcceso(Base):
    """Tabla de logs de intentos de acceso"""
    __tablename__ = "logs_acceso"
    __table_args__ = {"schema": "seg"}

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False)
    fecha_ingreso = Column(DateTime(timezone=True), server_default=func.now())
    exitoso = Column(Boolean, nullable=False)
    ip_address = Column(String(45), nullable=True)

    # Relaciones
    usuario = relationship("Usuario", back_populates="logs_acceso")