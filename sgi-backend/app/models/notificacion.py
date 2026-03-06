from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, UnicodeText
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"
    __table_args__ = {"schema": "seg"}

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False, index=True)
    tipo = Column(String(50), nullable=False)  # LEAD_ASIGNADO, LEAD_REASIGNADO, etc.
    titulo = Column(String(200), nullable=False)
    mensaje = Column(UnicodeText, nullable=True)
    leida = Column(Boolean, default=False, nullable=False)
    url_destino = Column(String(300), nullable=True)  # Ruta del frontend para navegar al hacer clic
    datos_extra = Column(Text, nullable=True)  # JSON con datos adicionales (inbox_id, telefono, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usuario = relationship("app.models.seguridad.Usuario", foreign_keys=[usuario_id])
