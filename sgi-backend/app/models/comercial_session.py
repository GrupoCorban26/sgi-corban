from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    inbox_id = Column(Integer, ForeignKey("comercial.inbox.id"), nullable=True, index=True)
    estado = Column(String(50), nullable=False, default="MENU")
    datos = Column(Text, nullable=True)  # JSON string (NVARCHAR compatible)
    bot_config_id = Column(Integer, ForeignKey("comercial.whatsapp_bot_config.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    bot_config = relationship("app.models.whatsapp_bot_config.WhatsAppBotConfig", foreign_keys=[bot_config_id])
