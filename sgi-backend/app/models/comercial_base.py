from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, VARCHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Lote(Base):
    """Cada Excel subido = 1 lote de prospección."""
    __tablename__ = "lotes"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre_archivo = Column(String(200), nullable=False)
    empresa = Column(String(30), nullable=True)  # 'CORBAN' | 'EBL' | NULL
    estado = Column(String(20), nullable=False, default='DISPONIBLE')
    created_by = Column(Integer, ForeignKey("seg.usuarios.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    usuario_creador = relationship("app.models.seguridad.Usuario", foreign_keys=[created_by])
    contactos = relationship("BaseContacto", back_populates="lote")


class BaseContacto(Base):
    """Contacto de prospección desglosado de un Excel."""
    __tablename__ = "bases"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    lote_id = Column(Integer, ForeignKey("comercial.lotes.id"), nullable=False, index=True)
    ruc = Column(VARCHAR(11), nullable=False, index=True)
    razon_social = Column(String(250))
    sector = Column(String(500))
    paises = Column(String(500))
    telefono = Column(VARCHAR(20), nullable=False, index=True)
    nombre = Column(String(150))
    correo = Column(String(100))
    estado = Column(String(20), nullable=False, default='DISPONIBLE', index=True)
    asignado_a = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True, index=True)
    veces_llamadas = Column(Integer, nullable=False, default=0)
    fecha_asignacion = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lote = relationship("Lote", back_populates="contactos")
    usuario_asignado = relationship("app.models.seguridad.Usuario", foreign_keys=[asignado_a])
    historial = relationship("HistorialLlamada", back_populates="base")
