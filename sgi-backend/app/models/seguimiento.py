from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class TipoCarga(Base):
    __tablename__ = "tipo_carga"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(20), nullable=False, unique=True)
    orden = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class TipoServicioComercial(Base):
    __tablename__ = "tipo_servicio_comercial"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(30), nullable=False, unique=True)
    orden = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class SegmentacionCierre(Base):
    __tablename__ = "segmentacion_cierre"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(30), nullable=False, unique=True)
    orden = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class Seguimiento(Base):
    __tablename__ = "seguimientos"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=True, index=True)
    comercial_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False, index=True)
    titulo = Column(String(150), nullable=False)
    estado = Column(String(20), default="COTIZADO", nullable=False)  # 'SOLICITUD', 'COTIZADO', 'CIERRE', 'EN_OPERACION', 'CARGA_ENTREGADA', 'CAIDO'
    motivo_caida = Column(Text, nullable=True)

    # Campos para fase operativa (EN_OPERACION)
    fecha_eta = Column(Date, nullable=True)
    fecha_limite_documentos = Column(Date, nullable=True)  # fecha_eta - días según tipo servicio/carga
    contacto_alerta_id = Column(Integer, ForeignKey("comercial.cliente_contactos.id"), nullable=True)

    # Campos temporales para prospectos sin cliente formal registrado
    temp_cliente_nombre = Column(String(150), nullable=True)
    temp_cliente_ruc = Column(String(20), nullable=True)
    temp_cliente_contacto = Column(String(100), nullable=True)
    temp_cliente_correo = Column(String(100), nullable=True)
    temp_cliente_telefono = Column(String(30), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("seg.usuarios.id"))
    updated_by = Column(Integer, ForeignKey("seg.usuarios.id"))

    # Relationships
    cliente = relationship("app.models.comercial.Cliente", lazy="selectin")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_id], lazy="selectin")
    creador = relationship("app.models.seguridad.Usuario", foreign_keys=[created_by])
    modificador = relationship("app.models.seguridad.Usuario", foreign_keys=[updated_by])
    contacto_alerta = relationship("app.models.comercial.ClienteContacto", foreign_keys=[contacto_alerta_id], lazy="selectin")

    cotizaciones = relationship(
        "Cotizacion",
        back_populates="seguimiento",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    comentarios = relationship(
        "SeguimientoComentario",
        back_populates="seguimiento",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    historial = relationship(
        "SeguimientoHistorial",
        back_populates="seguimiento",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    documentos = relationship(
        "SeguimientoDocumento",
        back_populates="seguimiento",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    alertas_enviadas = relationship(
        "SeguimientoAlertaEnviada",
        back_populates="seguimiento",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # ── Propiedades calculadas para serialización Pydantic ──
    @property
    def cliente_razon_social(self) -> str:
        if self.cliente:
            return self.cliente.razon_social
        return self.temp_cliente_nombre or ""

    @property
    def cliente_ruc(self) -> str:
        if self.cliente:
            return self.cliente.ruc
        return self.temp_cliente_ruc or ""

    @property
    def comercial_nombre(self) -> str:
        if self.comercial and self.comercial.empleado:
            emp = self.comercial.empleado
            return f"{emp.nombres} {emp.apellido_paterno}"
        return ""


class Cotizacion(Base):
    __tablename__ = "cotizaciones"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    seguimiento_id = Column(Integer, ForeignKey("comercial.seguimientos.id"), nullable=False, index=True)
    tipo_carga_id = Column(Integer, ForeignKey("comercial.tipo_carga.id"), nullable=False)
    tipo_servicio_id = Column(Integer, ForeignKey("comercial.tipo_servicio_comercial.id"), nullable=False)
    tipo_operacion = Column(String(20), nullable=True)  # 'IMPORTACION', 'EXPORTACION'
    pais_origen = Column(String(50), nullable=True)
    estado = Column(String(20), default="PENDIENTE", nullable=False)  # 'PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'DESCARTADO'

    codigo_operacion = Column(String(20), nullable=True)
    segmentacion_id = Column(Integer, ForeignKey("comercial.segmentacion_cierre.id"), nullable=True)
    fecha_cierre = Column(Date, nullable=True)
    incoterm = Column(String(10), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    seguimiento = relationship("Seguimiento", back_populates="cotizaciones")
    tipo_carga = relationship("TipoCarga", lazy="joined")
    tipo_servicio = relationship("TipoServicioComercial", lazy="joined")
    segmentacion = relationship("SegmentacionCierre", lazy="joined")

    @property
    def tipo_carga_nombre(self) -> str:
        return self.tipo_carga.nombre if self.tipo_carga else ""

    @property
    def tipo_servicio_nombre(self) -> str:
        return self.tipo_servicio.nombre if self.tipo_servicio else ""

    @property
    def segmentacion_nombre(self) -> str:
        return self.segmentacion.nombre if self.segmentacion else ""


class SeguimientoComentario(Base):
    __tablename__ = "seguimiento_comentarios"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    seguimiento_id = Column(Integer, ForeignKey("comercial.seguimientos.id"), nullable=False, index=True)
    comentario = Column(Text, nullable=False)
    medio_gestion_id = Column(Integer, ForeignKey("comercial.medio_gestion.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("seg.usuarios.id"))

    # Relationships
    seguimiento = relationship("Seguimiento", back_populates="comentarios")
    medio = relationship("app.models.comercial_catalogos.MedioGestion")
    creador = relationship("app.models.seguridad.Usuario", foreign_keys=[created_by])


class SeguimientoHistorial(Base):
    __tablename__ = "seguimiento_historial"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    seguimiento_id = Column(Integer, ForeignKey("comercial.seguimientos.id"), nullable=False, index=True)
    estado_anterior = Column(String(20), nullable=True)
    estado_nuevo = Column(String(20), nullable=False)
    comentario = Column(String(500), nullable=True)
    tiempo_en_estado_anterior = Column(Integer, nullable=True)  # en minutos
    fecha_cambio = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    registrado_por = Column(Integer, ForeignKey("seg.usuarios.id"))

    # Relationships
    seguimiento = relationship("Seguimiento", back_populates="historial")
    usuario = relationship("app.models.seguridad.Usuario", foreign_keys=[registrado_por])


# ── Modelos para la fase operativa ──

class DocumentoOperacional(Base):
    """Catálogo de documentos operacionales requeridos para embarques."""
    __tablename__ = "documentos_operacionales"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False, unique=True)
    descripcion = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SeguimientoDocumento(Base):
    """Relación entre un seguimiento y los documentos operacionales que debe completar."""
    __tablename__ = "seguimiento_documentos"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    seguimiento_id = Column(Integer, ForeignKey("comercial.seguimientos.id"), nullable=False, index=True)
    documento_id = Column(Integer, ForeignKey("comercial.documentos_operacionales.id"), nullable=False)
    completado = Column(Boolean, default=False, nullable=False)
    fecha_recepcion = Column(DateTime(timezone=True), nullable=True)
    registrado_por = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)

    # Relationships
    seguimiento = relationship("Seguimiento", back_populates="documentos")
    documento = relationship("DocumentoOperacional", lazy="joined")
    usuario = relationship("app.models.seguridad.Usuario", foreign_keys=[registrado_por])

    @property
    def documento_nombre(self) -> str:
        return self.documento.nombre if self.documento else ""


class SeguimientoAlertaEnviada(Base):
    """Registro de alertas de documentos pendientes enviadas por email."""
    __tablename__ = "seguimiento_alertas_enviadas"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    seguimiento_id = Column(Integer, ForeignKey("comercial.seguimientos.id"), nullable=False, index=True)
    dias_antes_eta = Column(Integer, nullable=False)
    fecha_envio = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    tipo = Column(String(20), nullable=False)  # 'ALERTA_PENDIENTES' o 'CONFIRMACION_COMPLETA'
    canal = Column(String(10), nullable=False, server_default="EMAIL")  # EMAIL, WHATSAPP, AMBOS

    # Relationships
    seguimiento = relationship("Seguimiento", back_populates="alertas_enviadas")
