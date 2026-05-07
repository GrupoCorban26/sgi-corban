from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class ClienteHistorial(Base):
    """Registro de auditoría para cada cambio de estado en el ciclo de vida del cliente."""
    __tablename__ = "cliente_historial"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=False, index=True)
    estado_anterior_id = Column(Integer, ForeignKey("comercial.estado_cliente.id"), nullable=True)
    estado_nuevo_id = Column(Integer, ForeignKey("comercial.estado_cliente.id"), nullable=False)
    motivo = Column(String(500), nullable=True)
    tiempo_en_estado_anterior = Column(Integer, nullable=True)  # Minutos en el estado previo
    registrado_por = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    cliente = relationship("app.models.comercial.Cliente", backref="historial")
    estado_anterior = relationship("app.models.comercial_catalogos.EstadoCliente", foreign_keys=[estado_anterior_id])
    estado_nuevo = relationship("app.models.comercial_catalogos.EstadoCliente", foreign_keys=[estado_nuevo_id])
    usuario = relationship("app.models.seguridad.Usuario")
