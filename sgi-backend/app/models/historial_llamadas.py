from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class HistorialLlamada(Base):
    """Registro de cada gestión telefónica sobre un contacto de la base."""
    __tablename__ = "historial_llamadas"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    base_id = Column(Integer, ForeignKey("comercial.bases.id"), nullable=False, index=True)
    comercial_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False, index=True)
    caso_id = Column(Integer, ForeignKey("comercial.casos_llamada.id"), nullable=True, index=True)
    comentario = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    base = relationship("BaseContacto", back_populates="historial")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_id])
    caso = relationship("app.models.comercial.CasoLlamada", foreign_keys=[caso_id])
