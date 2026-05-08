"""
Modelos SQLAlchemy para el módulo de Supervisión WhatsApp (Evolution API v2).

Esquema: whatsapp_evo
Tablas:
  - instancias:      Una instancia de Evolution API por comercial
  - conversaciones:  Un registro por cada chat (contacto/grupo) capturado
  - mensajes:        Todos los mensajes capturados vía webhook
"""
from sqlalchemy import (
    Column, Integer, BigInteger, String, Boolean, ForeignKey,
    DateTime, Text, Unicode, UnicodeText, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class EvoInstancia(Base):
    """Cada comercial tiene UNA instancia de WhatsApp vinculada vía Evolution API."""
    __tablename__ = "instancias"
    __table_args__ = (
        Index("ix_evo_instancias_usuario", "usuario_id"),
        Index("ix_evo_instancias_estado", "estado"),
        {"schema": "whatsapp_evo"},
    )

    id = Column(Integer, primary_key=True, index=True)
    instance_name = Column(String(100), nullable=False, unique=True)
    instance_id = Column(String(200), nullable=True)  # UUID devuelto por Evolution API
    token = Column(String(300), nullable=True)  # Hash/token de la instancia en Evolution
    usuario_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False)
    telefono = Column(String(20), nullable=True)  # Se llena al conectar (owner JID)
    estado = Column(
        String(20), default="DESCONECTADO", nullable=False
    )  # DESCONECTADO, CONECTANDO, CONECTADO
    qr_code = Column(UnicodeText, nullable=True)  # QR base64 temporal mientras conecta
    profile_name = Column(Unicode(200), nullable=True)  # Nombre del perfil WhatsApp
    profile_pic_url = Column(String(500), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)

    # Relationships
    usuario = relationship(
        "app.models.seguridad.Usuario",
        foreign_keys=[usuario_id],
        backref="evo_instancia",
    )
    creador = relationship(
        "app.models.seguridad.Usuario",
        foreign_keys=[created_by],
    )
    conversaciones = relationship(
        "EvoConversacion", back_populates="instancia", cascade="all, delete-orphan"
    )


class EvoConversacion(Base):
    """Un registro por cada chat (contacto o grupo) capturado de un comercial."""
    __tablename__ = "conversaciones"
    __table_args__ = (
        Index("ix_evo_conv_instancia_ultimo", "instancia_id", "ultimo_mensaje_at"),
        Index("ix_evo_conv_remote_jid", "remote_jid"),
        {"schema": "whatsapp_evo"},
    )

    id = Column(Integer, primary_key=True, index=True)
    instancia_id = Column(
        Integer, ForeignKey("whatsapp_evo.instancias.id", ondelete="CASCADE"),
        nullable=False,
    )
    remote_jid = Column(String(100), nullable=False)  # ej: 51987654321@s.whatsapp.net
    nombre_contacto = Column(Unicode(200), nullable=True)  # Push name o nombre guardado
    es_grupo = Column(Boolean, default=False, nullable=False)
    ultimo_mensaje = Column(UnicodeText, nullable=True)  # Preview del último mensaje
    ultimo_mensaje_at = Column(DateTime(timezone=True), nullable=True)
    mensajes_no_leidos = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    instancia = relationship("EvoInstancia", back_populates="conversaciones")
    mensajes = relationship(
        "EvoMensaje", back_populates="conversacion", cascade="all, delete-orphan"
    )


class EvoMensaje(Base):
    """Todos los mensajes capturados vía webhook de Evolution API."""
    __tablename__ = "mensajes"
    __table_args__ = (
        Index("ix_evo_msg_conv_timestamp", "conversacion_id", "timestamp"),
        Index("ix_evo_msg_instancia", "instancia_id"),
        Index("ix_evo_msg_message_id", "message_id", unique=True),
        {"schema": "whatsapp_evo"},
    )

    id = Column(BigInteger, primary_key=True, index=True)
    conversacion_id = Column(
        Integer, ForeignKey("whatsapp_evo.conversaciones.id", ondelete="CASCADE"),
        nullable=False,
    )
    instancia_id = Column(
        Integer, ForeignKey("whatsapp_evo.instancias.id", ondelete="CASCADE"),
        nullable=False,
    )  # Redundante para queries rápidas sin JOIN a conversaciones
    message_id = Column(String(100), nullable=False)  # ID único de WhatsApp
    from_me = Column(Boolean, default=False, nullable=False)
    tipo = Column(
        String(20), default="text", nullable=False
    )  # text, image, audio, video, document, sticker
    contenido = Column(UnicodeText, nullable=True)  # Texto del mensaje
    participant = Column(String(100), nullable=True)  # JID del integrante si es grupo
    participant_name = Column(Unicode(200), nullable=True)  # Nombre del integrante
    reaccion = Column(Unicode(50), nullable=True)  # Emoji de reacción
    media_url = Column(String(500), nullable=True)  # URL del archivo multimedia
    media_mimetype = Column(String(100), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)  # Fecha del mensaje en WhatsApp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversacion = relationship("EvoConversacion", back_populates="mensajes")
    instancia = relationship("EvoInstancia")
