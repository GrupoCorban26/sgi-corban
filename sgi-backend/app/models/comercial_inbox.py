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
    fecha_asignacion = Column(DateTime(timezone=True), nullable=True)
    fecha_gestion = Column(DateTime(timezone=True), nullable=True)
    modo = Column(String(10), default="BOT", nullable=False) # BOT, ASESOR
    ultimo_mensaje_at = Column(DateTime(timezone=True), nullable=True)
    
    # Tracking de tiempos
    tiempo_respuesta_segundos = Column(Integer, nullable=True)  # Segundos hasta primera respuesta
    fecha_primera_respuesta = Column(DateTime(timezone=True), nullable=True)
    
    # Escalación: el comercial comparte su número corporativo
    escalado_a_directo = Column(Boolean, default=False)
    fecha_escalacion = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    usuario_asignado = relationship("app.models.seguridad.Usuario", foreign_keys=[asignado_a])
    mensajes = relationship("app.models.chat_message.ChatMessage", back_populates="inbox", cascade="all, delete-orphan")

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
            # Buscar celular corporativo
            # 1. Recorrer los activos asignados al empleado (backref: 'activos_asignados')
            for asignacion in getattr(self.usuario_asignado.empleado, 'activos_asignados', []):
                # 2. Verificar que la asignación esté vigente (sin fecha de devolución) y tenga activo
                if asignacion.fecha_devolucion is None and asignacion.activo:
                    # 3. Verificar si el activo tiene una línea corporativa instalada (backref: 'linea_instalada')
                    # Nota: linea_instalada es una lista de líneas asociadas al activo
                    for linea in getattr(asignacion.activo, 'linea_instalada', []):
                        if linea.is_active:
                            return linea.numero
                            
            # Si no se encuentra línea corporativa activa, retornamos None
            return None
        return None

