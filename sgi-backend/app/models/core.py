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
    clave = Column(String(100), nullable=False)
    valor = Column(String(500))
    tipo_dato = Column(String(20), default="STRING", nullable=False)
    categoria = Column(String(100))
    descripcion = Column(String(300))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Notificacion(Base):
    __tablename__ = "notificaciones"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False)
    tipo = Column(String(50), nullable=False)
    titulo = Column(String(150), nullable=False)
    mensaje = Column(String(500))
    url_destino = Column(String(300))
    leida = Column(Boolean, default=False, nullable=False)
    fecha_lectura = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # usuario relationship defined in seg.usuarios if needed, or here:
    usuario = relationship("app.models.seguridad.Usuario", backref="notificaciones")

class Incoterm(Base):
    __tablename__ = "incoterms"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(3), nullable=False)
    nombre_largo = Column(String(100), nullable=False)
    tipo = Column(String(100))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class TipoContenedor(Base):
    __tablename__ = "tipo_contenedores"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(100))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Via(Base):
    __tablename__ = "via"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(100))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class TipoMercaderia(Base):
    __tablename__ = "tipo_mercaderia"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(100))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Servicios(Base):
    __tablename__ = "servicios"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(100))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())