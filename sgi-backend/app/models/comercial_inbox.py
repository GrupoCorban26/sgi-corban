from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Unicode, UnicodeText
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Inbox(Base):
    __tablename__ = "inbox"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    telefono = Column(String(20), nullable=False, index=True)
    mensaje_inicial = Column(UnicodeText)
    nombre_whatsapp = Column(Unicode(100))
    asignado_a = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    estado = Column(String(20), default="NUEVO", nullable=False, index=True)  # NUEVO, PENDIENTE, EN_GESTION, COTIZADO, CIERRE, DESCARTADO
    tipo_interes = Column(String(30), nullable=True)  # ASESORIA, COTIZACION, CARGA_LISTA
    tipo_asignacion = Column(String(20), nullable=True)  # MANUAL, AUTOMATICA
    fecha_recepcion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_gestion = Column(DateTime(timezone=True), nullable=True)
    modo = Column(String(10), default="BOT", nullable=False)  # BOT, ASESOR
    ultimo_mensaje_at = Column(DateTime(timezone=True), nullable=True)
    ultimo_mensaje_cliente_at = Column(DateTime(timezone=True), nullable=True)  # Ventana 24h

    # Escalación: el comercial comparte su número corporativo
    escalado_a_directo = Column(Boolean, default=False)
    fecha_escalacion = Column(DateTime(timezone=True), nullable=True)

    # Asignación
    fecha_asignacion = Column(DateTime(timezone=True), nullable=True)
    tiempo_respuesta_segundos = Column(Integer, nullable=True)

    # Descarte
    motivo_descarte_id = Column(Integer, ForeignKey("comercial.motivo_descarte_inbox.id"), nullable=True)
    comentario_descarte = Column(UnicodeText, nullable=True)

    # Cierre / Conversión
    fecha_cierre = Column(DateTime(timezone=True), nullable=True)

    # Bot de origen (multi-bot)
    bot_config_id = Column(Integer, ForeignKey("comercial.whatsapp_bot_config.id"), nullable=True)

    # Relationships
    usuario_asignado = relationship("app.models.seguridad.Usuario", foreign_keys=[asignado_a])
    motivo_descarte = relationship("app.models.comercial_catalogos.MotivoDescarteInbox")
    mensajes = relationship("app.models.chat_message.ChatMessage", back_populates="inbox", cascade="all, delete-orphan")
    bot_config = relationship("app.models.whatsapp_bot_config.WhatsAppBotConfig", foreign_keys=[bot_config_id])
