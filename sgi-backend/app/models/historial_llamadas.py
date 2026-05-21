from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class HistorialLlamada(Base):
    """Historial de llamadas a contactos, registra cada interacción."""
    __tablename__ = "historial_llamadas"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    contacto_id = Column(Integer, ForeignKey("comercial.cliente_contactos.id", ondelete="CASCADE"), nullable=False, index=True)
    comercial_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False)
    caso_id = Column(Integer, ForeignKey("comercial.casos_llamada.id"), nullable=True)
    estado_id = Column(Integer, ForeignKey("comercial.estado_contacto.id"), nullable=True)
    comentario = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    contacto = relationship("app.models.comercial.ClienteContacto", backref="historial_llamadas")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_id])
    caso = relationship("app.models.comercial.CasoLlamada", foreign_keys=[caso_id])
    estado = relationship("app.models.comercial_catalogos.EstadoContacto")
