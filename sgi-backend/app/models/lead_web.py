from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, UnicodeText
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class LeadWeb(Base):
    """Lead recibido desde formularios de contacto de las páginas web del grupo."""
    __tablename__ = "leads_web"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)

    # Datos del formulario
    nombre = Column(String(150), nullable=False)
    correo = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=False)
    asunto = Column(String(200), nullable=False)
    mensaje = Column(UnicodeText, nullable=False)

    # Origen
    pagina_origen = Column(String(100), nullable=False)  # ej: "corbantranslogistic.com"
    servicio_interes = Column(String(100), nullable=True)  # Opcional, si el formulario lo tiene

    # Asignación
    asignado_a = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    estado = Column(String(20), default="NUEVO", nullable=False)
    # Estados: NUEVO, PENDIENTE, EN_GESTION, CONVERTIDO, DESCARTADO

    # Fechas
    fecha_recepcion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_asignacion = Column(DateTime(timezone=True), nullable=True)
    fecha_gestion = Column(DateTime(timezone=True), nullable=True)

    # Descarte
    motivo_descarte = Column(String(100), nullable=True)
    comentario_descarte = Column(UnicodeText, nullable=True)

    # Notas del comercial
    notas = Column(UnicodeText, nullable=True)

    # Tracking de tiempos
    tiempo_respuesta_segundos = Column(Integer, nullable=True)
    fecha_primera_respuesta = Column(DateTime(timezone=True), nullable=True)

    # Conversión: FK al cliente si se convierte
    cliente_convertido_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    usuario_asignado = relationship("app.models.seguridad.Usuario", foreign_keys=[asignado_a])
    cliente_convertido = relationship("app.models.comercial.Cliente", foreign_keys=[cliente_convertido_id])

    @property
    def nombre_asignado(self):
        if self.usuario_asignado:
            if self.usuario_asignado.empleado:
                return f"{self.usuario_asignado.empleado.nombres} {self.usuario_asignado.empleado.apellido_paterno}"
            return self.usuario_asignado.correo_corp
        return None
