from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class DepartamentoGeo(Base):
    __tablename__ = "departamentos"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    ubigeo = Column(String(2), nullable=False)

class Provincia(Base):
    __tablename__ = "provincias"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    departamento_id = Column(Integer, ForeignKey("core.departamentos.id"), nullable=False)
    ubigeo = Column(String(4), nullable=False)

    departamento = relationship("DepartamentoGeo", backref="provincias")

class Distrito(Base):
    __tablename__ = "distritos"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    provincia_id = Column(Integer, ForeignKey("core.provincias.id"), nullable=False)
    ubigeo = Column(String(6), nullable=False)

    provincia = relationship("Provincia", backref="distritos")

class Configuracion(Base):
    __tablename__ = "configuraciones"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(100), nullable=False, unique=True)
    valor = Column(String(2000))
    tipo_dato = Column(String(20), default="STRING", nullable=False)
    categoria = Column(String(100))
    descripcion = Column(String(300))
    is_sensible = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ConfiguracionHistorial(Base):
    """Auditoría de cambios críticos en las configuraciones del sistema"""
    __tablename__ = "configuraciones_historial"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    configuracion_id = Column(Integer, ForeignKey("core.configuraciones.id"), nullable=False)
    valor_anterior = Column(String(500))
    valor_nuevo = Column(String(500))
    motivo_cambio = Column(String(200))
    modificado_por = Column(Integer, ForeignKey("seg.usuarios.id"))
    fecha_cambio = Column(DateTime(timezone=True), server_default=func.now(), default=func.now(), nullable=False)
    
    configuracion = relationship("Configuracion", backref="historial_cambios")

class Empresa(Base):
    """Modelo para representar las empresas del grupo."""
    __tablename__ = "empresas"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    razon_social = Column(String(255), nullable=False)
    ruc = Column(String(11), nullable=False, unique=True)
    oficina = Column(String(100))
    modulo = Column(String(100))

    # SMTP Credentials (Dynamic Multi-Company)
    smtp_host = Column(String(150), nullable=True)
    smtp_port = Column(Integer, nullable=True, default=587)
    smtp_user = Column(String(150), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    smtp_sender = Column(String(255), nullable=True)