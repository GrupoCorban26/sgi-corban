from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from .base import Base


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    telefono = Column(String(20), nullable=False, index=True)
    estado = Column(String(50), nullable=False, default="MENU")
    datos = Column(Text, nullable=True)  # JSON string (NVARCHAR compatible)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
