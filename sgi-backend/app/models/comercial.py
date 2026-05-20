from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base





class CasoLlamada(Base):
    __tablename__ = "casos_llamada"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100))
    contestado = Column(Boolean, default=False, nullable=False)
    gestionable = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Cliente(Base):
    __tablename__ = "clientes"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    ruc = Column(String(11), index=True)
    razon_social = Column(String(255), nullable=False)
    direccion_fiscal = Column(String(255))
    distrito_id = Column(Integer, ForeignKey("core.distritos.id"))
    comercial_encargado_id = Column(Integer, ForeignKey("seg.usuarios.id"))
    proxima_fecha_contacto = Column(Date)
    estado_id = Column(Integer, ForeignKey("comercial.estado_cliente.id"), index=True)
    origen_id = Column(Integer, ForeignKey("comercial.origen_cliente.id"))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("seg.usuarios.id"))
    updated_by = Column(Integer, ForeignKey("seg.usuarios.id"))

    # Relationships
    distrito = relationship("app.models.core.Distrito")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_encargado_id])
    estado = relationship("app.models.comercial_catalogos.EstadoCliente")
    origen = relationship("app.models.comercial_catalogos.OrigenCliente")
    usuario_creador = relationship("app.models.seguridad.Usuario", foreign_keys=[created_by])
    usuario_modificador = relationship("app.models.seguridad.Usuario", foreign_keys=[updated_by])
    contactos = relationship("ClienteContacto", back_populates="cliente")


class ClienteContacto(Base):
    __tablename__ = "cliente_contactos"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=True, index=True)
    ruc = Column(String(11), nullable=False, index=True)
    nombre = Column(String(150))
    cargo = Column(String(100))
    telefono = Column(String(20), nullable=False, index=True)
    correo = Column(String(100))
    origen = Column(String(30))
    estado_id = Column(Integer, ForeignKey("comercial.estado_contacto.id"), index=True)
    lote_id = Column(Integer, index=True)
    is_principal = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    estado = relationship("app.models.comercial_catalogos.EstadoContacto")
    cliente = relationship("Cliente", back_populates="contactos")


class Cita(Base):
    __tablename__ = "citas"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    tipo_cita = Column(String(50))
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=True)
    comercial_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False, index=True)
    fecha = Column(DateTime, nullable=False)
    hora = Column(String(10), nullable=False)
    direccion = Column(String(255))
    detalles = Column(String(500))
    con_presente = Column(Boolean, default=False)
    estado_id = Column(Integer, ForeignKey("comercial.estado_cita.id"), index=True)
    is_confirmado = Column(Boolean, default=False, nullable=False)
    acompanado_por_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    observacion = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("seg.usuarios.id"))
    updated_by = Column(Integer, ForeignKey("seg.usuarios.id"))

    # Relationships
    cliente = relationship("Cliente")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_id])
    acompanante = relationship("app.models.seguridad.Usuario", foreign_keys=[acompanado_por_id])
    estado = relationship("app.models.comercial_catalogos.EstadoCita")
    usuario_creador = relationship("app.models.seguridad.Usuario", foreign_keys=[created_by])
    usuario_modificador = relationship("app.models.seguridad.Usuario", foreign_keys=[updated_by])
