from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class HistorialLlamada(Base):
    """Historial de llamadas a contactos, sin sobreescribir datos al reasignar o cargar base."""
    __tablename__ = "historial_llamadas"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    contacto_id = Column(Integer, ForeignKey("comercial.cliente_contactos.id", ondelete="CASCADE"), nullable=False)
    ruc = Column(String(11), nullable=False)
    comercial_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False)
    caso_id = Column(Integer, ForeignKey("comercial.casos_llamada.id"), nullable=False)
    comentario = Column(String(500), nullable=True)
    fecha_llamada = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    contacto = relationship("app.models.comercial.ClienteContacto", backref="historial_llamadas")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_id])
    caso = relationship("app.models.comercial.CasoLlamada", foreign_keys=[caso_id])
