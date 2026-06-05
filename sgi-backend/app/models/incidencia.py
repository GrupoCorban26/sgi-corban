from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Incidencia(Base):
    __tablename__ = "incidencias"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    seguimiento_id = Column(Integer, ForeignKey("comercial.seguimientos.id"), nullable=True, index=True)
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=False, index=True)
    comercial_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False, index=True)
    codigo_operacion = Column(String(20), nullable=True)
    
    descripcion = Column(Text, nullable=False)
    observacion = Column(Text, nullable=True)
    estado = Column(String(20), default="ABIERTA", nullable=False)  # 'ABIERTA', 'EN_INVESTIGACION', 'RESUELTA'
    resolucion = Column(Text, nullable=True)
    fecha_resolucion = Column(Date, nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("seg.usuarios.id"))
    updated_by = Column(Integer, ForeignKey("seg.usuarios.id"))

    # Relationships
    seguimiento = relationship("app.models.seguimiento.Seguimiento")
    cliente = relationship("app.models.comercial.Cliente")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_id])
    creador = relationship("app.models.seguridad.Usuario", foreign_keys=[created_by])
    modificador = relationship("app.models.seguridad.Usuario", foreign_keys=[updated_by])
