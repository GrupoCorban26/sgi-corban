from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.db_connection import Base

class Cargo(Base):
    __tablename__ = "cargos"
    __table_args__ = {"schema": "rrhh"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(300), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relación inversa: Un cargo puede tener muchos empleados
    empleados = relationship("Empleado", back_populates="cargo")

class Area(Base):
    __tablename__ = "areas"
    __table_args__ = {"schema": "rrhh"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(300), nullable=True)
    parent_area_id = Column(Integer, ForeignKey("rrhh.areas.id"), nullable=True)
    responsable_id = Column(Integer, ForeignKey("rrhh.empleados.id"), nullable=True)
    comisiona_ventas = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    sub_areas = relationship("Area", backref="parent_area", remote_side=[id])
    empleados = relationship("Empleado", back_populates="area", foreign_keys="[Empleado.area_id]")

class Empleado(Base):
    __tablename__ = "empleados"
    __table_args__ = (
        CheckConstraint("tipo_documento IN ('DNI','CE','PASAPORTE','CARNET_EXT')", name="chk_tipo_documento"),
        {"schema": "rrhh"}
    )

    id = Column(Integer, primary_key=True, index=True)
    codigo_empleado = Column(String(20), unique=True, nullable=False)
    nombres = Column(String(100), nullable=False)
    apellido_paterno = Column(String(75), nullable=False)
    apellido_materno = Column(String(75), nullable=True)
    fecha_nacimiento = Column(Date, nullable=True)
    tipo_documento = Column(String(20), nullable=False)
    nro_documento = Column(String(20), unique=True, nullable=False)
    
    celular = Column(String(20), nullable=True)
    email_personal = Column(String(100), nullable=True)
    direccion = Column(String(200), nullable=True)
    
    fecha_ingreso = Column(Date, nullable=False)
    fecha_cese = Column(Date, nullable=True)
    activo = Column(Boolean, default=True)
    
    cargo_id = Column(Integer, ForeignKey("rrhh.cargos.id"), nullable=False)
    area_id = Column(Integer, ForeignKey("rrhh.areas.id"), nullable=False)
    jefe_id = Column(Integer, ForeignKey("rrhh.empleados.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)

    # Relaciones ORM
    cargo = relationship("Cargo", back_populates="empleados")
    area = relationship("Area", back_populates="empleados", foreign_keys=[area_id])
    jefe = relationship("Empleado", remote_side=[id])
    
    # Esta relación es clave para el login: vincula con el usuario (la crearemos en el siguiente paso)
    usuario = relationship("Usuario", back_populates="empleado", uselist=False)