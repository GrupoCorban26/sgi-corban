from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class ClienteGestion(Base):
    """Registro de cada gestión/interacción del comercial con un cliente."""
    __tablename__ = "cliente_gestiones"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=False)
    medio_id = Column(Integer, ForeignKey("comercial.medio_gestion.id"), nullable=False)
    motivo_id = Column(Integer, ForeignKey("comercial.motivo_gestion.id"), nullable=False)
    comentario = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    cliente = relationship("app.models.comercial.Cliente", backref="gestiones")
    medio = relationship("app.models.comercial_catalogos.MedioGestion")
    motivo = relationship("app.models.comercial_catalogos.MotivoGestion")
