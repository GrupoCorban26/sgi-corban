from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class ClienteHistorial(Base):
    """Registro de auditoría para cada cambio de estado en el ciclo de vida del cliente."""
    __tablename__ = "cliente_historial"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=False)
    estado_anterior = Column(String(20), nullable=True)  # NULL en la primera creación
    estado_nuevo = Column(String(20), nullable=False)
    motivo = Column(String(500), nullable=True)
    origen_cambio = Column(String(30), nullable=False, default="MANUAL")  # MANUAL, SISTEMA, WHATSAPP, REACTIVACION
    tiempo_en_estado_anterior = Column(Integer, nullable=True)  # Minutos en el estado previo
    registrado_por = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    cliente = relationship("app.models.comercial.Cliente", backref="historial")
    usuario = relationship("app.models.seguridad.Usuario")
