from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class Departamento(Base):
    __tablename__ = "departamentos"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(300))
    responsable_id = Column(Integer, ForeignKey("adm.empleados.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    responsable = relationship("Empleado", foreign_keys=[responsable_id], back_populates="departamentos_a_cargo")
    areas = relationship("Area", back_populates="departamento")

class Area(Base):
    __tablename__ = "areas"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(300))
    departamento_id = Column(Integer, ForeignKey("adm.departamentos.id"), nullable=True)
    area_padre_id = Column(Integer, ForeignKey("adm.areas.id"), nullable=True)
    responsable_id = Column(Integer, ForeignKey("adm.empleados.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    departamento = relationship("Departamento", back_populates="areas")
    responsable = relationship("Empleado", foreign_keys=[responsable_id], back_populates="areas_a_cargo")
    area_padre = relationship("Area", remote_side=[id], backref="subareas")
    cargos = relationship("Cargo", back_populates="area")

class Cargo(Base):
    __tablename__ = "cargos"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(300))
    area_id = Column(Integer, ForeignKey("adm.areas.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    area = relationship("Area", back_populates="cargos")

class Empleado(Base):
    __tablename__ = "empleados"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    nombres = Column(String(100), nullable=False)
    apellido_paterno = Column(String(100), nullable=False)
    apellido_materno = Column(String(100))
    fecha_nacimiento = Column(Date)
    tipo_documento = Column(String(20), default="DNI", nullable=False)
    nro_documento = Column(String(20), nullable=False)
    celular = Column(String(20))
    email_personal = Column(String(100))
    direccion = Column(String(200))
    distrito_id = Column(Integer, ForeignKey("core.distritos.id"))
    fecha_ingreso = Column(Date, nullable=False)
    fecha_cese = Column(Date)
    is_active = Column(Boolean, default=True, nullable=False)
    cargo_id = Column(Integer, ForeignKey("adm.cargos.id"), nullable=True)
    jefe_id = Column(Integer, ForeignKey("adm.empleados.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    cargo = relationship("Cargo", backref="empleados")
    distrito = relationship("app.models.core.Distrito")
    jefe = relationship("Empleado", remote_side=[id], backref="subordinados")
    
    # Áreas y Departamentos que lidera (como responsable)
    departamentos_a_cargo = relationship("Departamento", foreign_keys="[Departamento.responsable_id]", back_populates="responsable")
    areas_a_cargo = relationship("Area", foreign_keys="[Area.responsable_id]", back_populates="responsable")
    
    # Propiedades de conveniencia para acceder a área y departamento via cargo
    @property
    def area(self):
        return self.cargo.area if self.cargo else None
    
    @property
    def departamento(self):
        return self.cargo.area.departamento if self.cargo and self.cargo.area else None


class Activo(Base):
    __tablename__ = "activos"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    producto = Column(String(50), nullable=False)
    marca = Column(String(50))
    modelo = Column(String(50))
    serie = Column(String(100))
    codigo_inventario = Column(String(50))
    estado_id = Column(Integer, ForeignKey("adm.estado_activo.id"), nullable=True)
    is_disponible = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    observaciones = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    estado = relationship("EstadoActivo", back_populates="activos")

class EmpleadoActivo(Base):
    __tablename__ = "empleado_activo"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("adm.empleados.id"), nullable=False)
    activo_id = Column(Integer, ForeignKey("adm.activos.id"), nullable=False)
    fecha_entrega = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha_devolucion = Column(DateTime(timezone=True))
    estado_entrega_id = Column(Integer, ForeignKey("adm.estado_activo.id"))
    estado_devolucion_id = Column(Integer, ForeignKey("adm.estado_activo.id"))
    observaciones = Column(String)
    asignado_por = Column(Integer, ForeignKey("seg.usuarios.id"))

    # Relationships
    empleado = relationship("Empleado", backref="activos_asignados")
    activo = relationship("Activo", backref="asignaciones")
    estado_entrega = relationship("EstadoActivo", foreign_keys=[estado_entrega_id])
    estado_devolucion = relationship("EstadoActivo", foreign_keys=[estado_devolucion_id])
    usuario_asignador = relationship("app.models.seguridad.Usuario")

class EstadoActivo(Base):
    __tablename__ = "estado_activo"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(300))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    activos = relationship("Activo", back_populates="estado")


class ActivoHistorial(Base):
    __tablename__ = "activo_historial"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    activo_id = Column(Integer, ForeignKey("adm.activos.id"), nullable=False)
    estado_anterior_id = Column(Integer, ForeignKey("adm.estado_activo.id"))
    estado_nuevo_id = Column(Integer, ForeignKey("adm.estado_activo.id"), nullable=False)
    motivo = Column(String(100), nullable=False)  # 'CREACION', 'ASIGNACION', 'DEVOLUCION', etc.
    observaciones = Column(String(500))
    empleado_activo_id = Column(Integer, ForeignKey("adm.empleado_activo.id"))
    registrado_por = Column(Integer, ForeignKey("seg.usuarios.id"))
    fecha_cambio = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    activo = relationship("Activo", backref="historial")
    estado_anterior = relationship("EstadoActivo", foreign_keys=[estado_anterior_id])
    estado_nuevo = relationship("EstadoActivo", foreign_keys=[estado_nuevo_id])
    asignacion = relationship("EmpleadoActivo")
    usuario = relationship("app.models.seguridad.Usuario")
