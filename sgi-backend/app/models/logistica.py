from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class Vehiculo(Base):
    __tablename__ = "vehiculos"
    __table_args__ = {"schema": "logistica"}

    id = Column(Integer, primary_key=True, index=True)
    placa = Column(String(20), unique=True, nullable=False)
    tipo_vehiculo = Column(String(50), nullable=False) # Van, Auto, Moto
    marca = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Conductor(Base):
    __tablename__ = "conductores"
    __table_args__ = {"schema": "logistica"}

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("adm.empleados.id"), nullable=False)
    vehiculo_id = Column(Integer, ForeignKey("logistica.vehiculos.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    empleado = relationship("app.models.administrativo.Empleado")
    vehiculo = relationship("Vehiculo")
