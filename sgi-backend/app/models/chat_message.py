from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    inbox_id = Column(Integer, ForeignKey("comercial.inbox.id"), nullable=False)
    telefono = Column(String(20), nullable=False)
    direccion = Column(String(10), nullable=False) # 'ENTRANTE' | 'SALIENTE'
    remitente_tipo = Column(String(20), nullable=False) # 'CLIENTE' | 'COMERCIAL' | 'BOT'
    remitente_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    contenido = Column(Text, nullable=False)
    tipo_contenido = Column(String(20), default="text") # 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker'
    media_url = Column(String(500), nullable=True) # Ruta relativa al archivo descargado
    whatsapp_msg_id = Column(String(100), nullable=True)
    estado_envio = Column(String(20), default="ENVIADO")
    leido = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    inbox = relationship("app.models.comercial_inbox.Inbox", back_populates="mensajes")
    remitente = relationship("app.models.seguridad.Usuario", foreign_keys=[remitente_id])
