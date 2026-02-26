from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base
from .administrativo import Empleado

# Association Tables
usuarios_roles = Table(
    'usuarios_roles',
    Base.metadata,
    Column('usuario_id', Integer, ForeignKey('seg.usuarios.id'), primary_key=True),
    Column('rol_id', Integer, ForeignKey('seg.roles.id'), primary_key=True),
    schema='seg'
)

rol_permiso = Table(
    'rol_permiso',
    Base.metadata,
    Column('rol_id', Integer, ForeignKey('seg.roles.id'), primary_key=True),
    Column('permiso_id', Integer, ForeignKey('seg.permisos.id'), primary_key=True),
    schema='seg'
)

class Permiso(Base):
    __tablename__ = "permisos"
    __table_args__ = {"schema": "seg"}

    id = Column(Integer, primary_key=True, index=True)
    nombre_tecnico = Column(String(100), nullable=False)
    nombre_display = Column(String(150), nullable=False)
    modulo = Column(String(100))
    descripcion = Column(String(300))
    is_active = Column(Boolean, default=True, nullable=False)
    
class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "seg"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(300))
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    permisos = relationship("Permiso", secondary=rol_permiso, backref="roles")

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "seg"}

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("adm.empleados.id"), nullable=True)
    correo_corp = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_bloqueado = Column(Boolean, default=False, nullable=False)
    intentos_fallidos = Column(Integer, default=0, nullable=False)
    reset_token = Column(String(255))
    reset_token_expira = Column(DateTime(timezone=True))
    ultimo_acceso = Column(DateTime(timezone=True))
    debe_cambiar_pass = Column(Boolean, default=False, nullable=False)
    disponible_buzon = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    empleado = relationship("Empleado", backref="usuario")
    roles = relationship("Rol", secondary=usuarios_roles, backref="usuarios")

class Sesion(Base):
    __tablename__ = "sesiones"
    __table_args__ = {"schema": "seg"}

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False)
    refresh_token = Column(String(500), nullable=False) # Usaremos este campo para guardar el access_token o una firma del mismo
    user_agent = Column(String(255))
    ip_address = Column(String(45))
    expira_en = Column(DateTime(timezone=True), nullable=False)
    es_revocado = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

