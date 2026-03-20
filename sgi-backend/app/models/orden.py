from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Orden(Base):
    """Orden importada desde SISPAC (Carga/Logístico) o SINTAD (Aduanas)."""
    __tablename__ = "ordenes"
    __table_args__ = (
        UniqueConstraint("numero_base", "empresa_origen", name="uq_orden_numero_empresa"),
        {"schema": "comercial"},
    )

    id = Column(Integer, primary_key=True, index=True)
    
    # Clave de homologación
    numero_base = Column(Integer, nullable=False, index=True)  # Folio numérico: 6851
    empresa_origen = Column(String(10), nullable=False)  # CORBAN / EBL
    
    # Códigos originales de cada sistema
    codigo_sispac = Column(String(20), nullable=True)  # CB0006851
    codigo_sintad = Column(String(20), nullable=True)  # COR6851 / EBL00636
    nro_orden_sintad = Column(String(20), nullable=True)  # 26/00000151
    
    # Datos de la orden
    fecha_ingreso = Column(Date, nullable=True)
    tipo_servicio = Column(String(30), nullable=False)  # CARGA, LOGISTICO, ADUANAS, INTEGRAL
    consignatario = Column(String(255), nullable=True)
    
    # Asignación comercial
    comercial_iniciales = Column(String(10), nullable=True)  # Iniciales del Excel SISPAC
    comercial_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=True)
    
    # Estados
    estado_sispac = Column(String(20), nullable=True)  # PENDIENTE, CANCELADO
    estado_sintad = Column(String(30), nullable=True)  # NUMERADA, CON LEVANTE, APERTURADA, EMBARCADA
    
    # Flags
    es_casa = Column(Boolean, default=False, nullable=False)  # True = cliente interno (no cuenta para meta)
    
    # Agrupación
    periodo = Column(String(7), nullable=False, index=True)  # 2026-03
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    importado_por = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)

    # Relationships
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_id])
    cliente = relationship("app.models.comercial.Cliente", foreign_keys=[cliente_id])
    usuario_importador = relationship("app.models.seguridad.Usuario", foreign_keys=[importado_por])
