from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class RegistroImportacion(Base):
    __tablename__ = "registro_importaciones"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    ruc = Column(String(11))
    anio = Column(String(4))
    razon_social = Column(String(150))
    aduanas = Column(String(255))
    via_transporte = Column(String(150))
    paises_origen = Column(String(2000))
    puertos_embarque = Column(Text) # varchar(max)
    embarcadores = Column(Text)
    agente_aduanas = Column(Text)
    partida_arancelaria_cod = Column(Text)
    partida_arancelaria_descripcion = Column(Text)
    fob_min = Column(Numeric(12, 2))
    fob_max = Column(Numeric(12, 2))
    fob_prom = Column(Numeric(12, 2))
    fob_anual = Column(Numeric(12, 2))
    total_operaciones = Column(Integer)
    cantidad_agentes = Column(Integer)
    cantidad_paises = Column(Integer)
    cantidad_partidas = Column(Integer)
    primera_importacion = Column(Date)
    ultima_importacion = Column(Date)

class CasoLlamada(Base):
    __tablename__ = "casos_llamada"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100))
    contestado = Column(Boolean, default=False, nullable=False)
    gestionable = Column(Boolean, default=False, nullable=False)
    # is_positive removido para no alterar BD
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Puedo acceder a CasoLlamada.casos_de_llamada
    # Puedo acceder a ClienteContacto.caso
    casos_de_llamada = relationship("ClienteContacto", back_populates="caso")

class Cliente(Base):
    __tablename__ = "clientes"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    ruc = Column(String(11))
    razon_social = Column(String(255), nullable=False)
    nombre_comercial = Column(String(255))
    direccion_fiscal = Column(String(255))
    distrito_id = Column(Integer, ForeignKey("core.distritos.id"))
    area_encargada_id = Column(Integer, ForeignKey("adm.areas.id"))
    comercial_encargado_id = Column(Integer, ForeignKey("seg.usuarios.id"))
    ultimo_contacto = Column(DateTime(timezone=True))
    comentario_ultima_llamada = Column(String(500))
    proxima_fecha_contacto = Column(Date)
    
    # Pipeline de Ventas
    motivo_perdida = Column(String(50), nullable=True)
    fecha_perdida = Column(Date, nullable=True)
    fecha_reactivacion = Column(Date, nullable=True)
    
    tipo_estado = Column(String(20), default="PROSPECTO", nullable=False)
    origen = Column(String(50))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer)
    updated_by = Column(Integer)

    distrito = relationship("app.models.core.Distrito")
    area_encargada = relationship("app.models.administrativo.Area")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_encargado_id])

class ClienteContacto(Base):
    __tablename__ = "cliente_contactos"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    ruc = Column(String(11), nullable=False)
    nombre = Column(String(150))
    cargo = Column(String(100))
    telefono = Column(String(20), nullable=False)
    correo = Column(String(100))
    origen = Column(String(30))
    is_client = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Asignación
    asignado_a = Column(Integer, ForeignKey("seg.usuarios.id"))
    fecha_asignacion = Column(DateTime(timezone=True))
    lote_asignacion = Column(Integer)
    caso_id = Column(Integer, ForeignKey("comercial.casos_llamada.id"))
    estado = Column(String(30), default="DISPONIBLE")
    comentario = Column(String(500))
    fecha_llamada = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    usuario_asignado = relationship("app.models.seguridad.Usuario")
    # Puedo acceder a ClienteContacto.caso 
    # Puedo acceder a CasoLlamada.casos_de_llamada
    caso = relationship("CasoLlamada", back_populates="casos_de_llamada")


class Cita(Base):
    __tablename__ = "citas"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    
    # Tipo de agenda: INDIVIDUAL (comercial con cliente) o SALIDA_CAMPO (jefe sin cliente específico)
    tipo_agenda = Column(String(30), default="INDIVIDUAL", nullable=False)
    
    # Cliente (nullable para salidas a campo)
    cliente_id = Column(Integer, ForeignKey("comercial.clientes.id"), nullable=True)
    comercial_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False)  # Quien solicita/crea
    
    fecha = Column(DateTime, nullable=False)
    hora = Column(String(10), nullable=False)
    
    # Tipo de visita: VISITA_CLIENTE (ir a oficinas del cliente) o VISITA_OFICINA (cliente viene a nosotros)
    tipo_cita = Column(String(50))
    direccion = Column(String(255))
    motivo = Column(String(500))
    con_presente = Column(Boolean, default=False)  # Llevar regalo
    
    # Campo adicional para salida a campo (objetivo de la salida)
    objetivo_campo = Column(String(500), nullable=True)
    
    # Workflow
    estado = Column(String(30), default="PENDIENTE")  # PENDIENTE, APROBADO, RECHAZADO, TERMINADO
    motivo_rechazo = Column(String(500))
    
    # Asignación de recursos (opcional)
    acompanado_por_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    conductor_id = Column(Integer, ForeignKey("logistica.asignacion_vehiculos.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer)
    
    # Relationships
    cliente = relationship("Cliente")
    comercial = relationship("app.models.seguridad.Usuario", foreign_keys=[comercial_id])
    acompanante = relationship("app.models.seguridad.Usuario", foreign_keys=[acompanado_por_id])
    conductor = relationship("app.models.logistica.AsignacionVehiculo")
    comerciales_asignados = relationship("CitaComercial", back_populates="cita", cascade="all, delete-orphan")


class CitaComercial(Base):
    """Tabla intermedia para asignar múltiples comerciales a una salida a campo"""
    __tablename__ = "cita_comerciales"
    __table_args__ = {"schema": "comercial"}

    id = Column(Integer, primary_key=True, index=True)
    cita_id = Column(Integer, ForeignKey("comercial.citas.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=False)
    confirmado = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    cita = relationship("Cita", back_populates="comerciales_asignados")
    usuario = relationship("app.models.seguridad.Usuario")
