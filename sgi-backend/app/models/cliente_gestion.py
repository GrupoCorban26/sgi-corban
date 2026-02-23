from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class ClienteGestion(Base):
    """Registro de cada gestión/interacción del comercial con un cliente."""
    __tablename__ = "cliente_gestiones"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=False)
    comercial_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # LLAMADA, EMAIL, WHATSAPP, VISITA, OTRO
    resultado = Column(String(30), nullable=False)  # CONTESTO, NO_CONTESTO, INTERESADO, COTIZACION_ENVIADA, NO_LE_INTERESA, LLAMAR_DESPUES
    comentario = Column(Text, nullable=True)
    proxima_fecha_contacto = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    cliente = relationship("app.models.comercial.Cliente", backref="gestiones")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_id])
