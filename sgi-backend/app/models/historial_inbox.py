from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UnicodeText
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class HistorialInbox(Base):
    __tablename__ = "historial_inbox"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    inbox_id = Column(Integer, ForeignKey("comercial.inbox.id"), nullable=False, index=True)
    estado_anterior = Column(String(20), nullable=True)
    estado = Column(String(20), nullable=False, index=True)
    motivo_descarte_id = Column(Integer, ForeignKey("comercial.motivo_descarte_inbox.id"), nullable=True)
    comentario = Column(UnicodeText, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)

    # Relationships
    inbox = relationship("app.models.comercial_inbox.Inbox", back_populates="historial")
    motivo_descarte = relationship("app.models.comercial_catalogos.MotivoDescarteInbox")
    usuario_creador = relationship("app.models.seguridad.Usuario", foreign_keys=[created_by])
