from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class Inbox(Base):
    __tablename__ = "inbox"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    telefono = Column(String(20), nullable=False)
    mensaje_inicial = Column(Text)
    nombre_whatsapp = Column(String(100))
    asignado_a = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    estado = Column(String(20), default="PENDIENTE", nullable=False) # PENDIENTE, CONVERTIDO, DESCARTADO
    tipo_interes = Column(String(30), nullable=True) # IMPORTACION, ASESORIA, DUDAS
    fecha_recepcion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_gestion = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    usuario_asignado = relationship("app.models.seguridad.Usuario", foreign_keys=[asignado_a])

    @property
    def nombre_asignado(self):
        if self.usuario_asignado:
            if self.usuario_asignado.empleado:
                return f"{self.usuario_asignado.empleado.nombres} {self.usuario_asignado.empleado.apellido_paterno}"
            return self.usuario_asignado.correo_corp
        return None

    @property
    def telefono_asignado(self):
        if self.usuario_asignado and self.usuario_asignado.empleado:
            return self.usuario_asignado.empleado.celular
        return None

