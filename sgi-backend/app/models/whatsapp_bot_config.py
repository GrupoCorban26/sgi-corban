"""
Modelo para la configuración de múltiples bots de WhatsApp Business.

Cada registro representa un número de WhatsApp Business con su propia
app de Meta, vinculado a un jefe comercial cuyo equipo recibirá los leads.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Unicode
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class WhatsAppBotConfig(Base):
    __tablename__ = "whatsapp_bot_config"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), nullable=False, unique=True, index=True)
    nombre_bot = Column(Unicode(100), nullable=False)
    jefe_comercial_id = Column(Integer, ForeignKey("adm.empleados.id"), nullable=False)
    whatsapp_token = Column(String(500), nullable=False)
    whatsapp_phone_id = Column(String(50), nullable=False)
    whatsapp_verify_token = Column(String(100), nullable=False, default="sgi_token_123")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    jefe_comercial = relationship("app.models.administrativo.Empleado", foreign_keys=[jefe_comercial_id])
