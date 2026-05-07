from sqlalchemy import Column, Integer, String, Boolean
from .base import Base


class EstadoCliente(Base):
    """Catálogo: PROSPECTO, EN_NEGOCIACION, CERRADA, EN_OPERACION, CARGA_ENTREGADA, CAIDO, INACTIVO"""
    __tablename__ = "estado_cliente"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(30), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class OrigenCliente(Base):
    """Catálogo: BASE_DATOS, PUBLICIDAD_META, CARTERA_PROPIA, WHATSAPP, REFERIDO, OTRO"""
    __tablename__ = "origen_cliente"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class MedioGestion(Base):
    """Catálogo: Llamada, WhatsApp, Correo"""
    __tablename__ = "medio_gestion"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(30), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class MotivoGestion(Base):
    """Catálogo: DUDAS_CLIENTE, FIDELIZACION, QUIERE_COTIZACION, SEGUIMIENTO_CARGA"""
    __tablename__ = "motivo_gestion"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class EstadoContacto(Base):
    """Catálogo: DISPONIBLE, ASIGNADO, EN_GESTION, GESTIONADO"""
    __tablename__ = "estado_contacto"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class EstadoCita(Base):
    """Catálogo: PENDIENTE, APROBADO, RECHAZADO, TERMINADO"""
    __tablename__ = "estado_cita"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class MotivoDescarteInbox(Base):
    """Catálogo de motivos de descarte para leads de WhatsApp"""
    __tablename__ = "motivo_descarte_inbox"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
