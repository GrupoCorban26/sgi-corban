from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Unicode, UnicodeText
from sqlalchemy.orm import relationship, synonym
from sqlalchemy.sql import func
from .base import Base


class Inbox(Base):
    __tablename__ = "inbox"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    telefono = Column(String(20), nullable=False, index=True)
    nombre_whatsapp = Column(Unicode(100))
    asignado_a = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    ultimo_estado = Column(String(20), default="BOT", nullable=False, index=True)  # BOT, NUEVO, PENDIENTE, EN_GESTION, COTIZADO, CERRADO, DESCARTADO
    tipo_interes = Column(String(30), nullable=True)  # ASESORIA, COTIZACION, CARGA_LISTA
    tipo_asignacion = Column(String(20), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Bot de origen (multi-bot)
    bot_config_id = Column(Integer, ForeignKey("comercial.whatsapp_bot_config.id"), nullable=True)

    # Origen del lead (Campaña Meta vs Orgánico)
    origen_lead = Column(String(20), default="ORGANICO", nullable=False)  # ORGANICO, CAMPAÑA
    referral_source_id = Column(String(100), nullable=True)   # ID del anuncio de Meta
    referral_headline = Column(String(300), nullable=True)    # Título del anuncio

    # Relationships
    usuario_asignado = relationship("app.models.seguridad.Usuario", foreign_keys=[asignado_a])
    mensajes = relationship("app.models.chat_message.ChatMessage", back_populates="inbox", cascade="all, delete-orphan")
    bot_config = relationship("app.models.whatsapp_bot_config.WhatsAppBotConfig", foreign_keys=[bot_config_id])
    historial = relationship("app.models.historial_inbox.HistorialInbox", back_populates="inbox", cascade="all, delete-orphan")

    estado = synonym("ultimo_estado")
