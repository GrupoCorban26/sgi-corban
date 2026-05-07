from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from .base import Base


class DiaNoLaborable(Base):
    """Días no laborables personalizados (no incluye feriados fijos)."""
    __tablename__ = "dias_no_laborables"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, unique=True, index=True)
    descripcion = Column(String(150), nullable=True)
    created_by = Column(Integer, ForeignKey("seg.usuarios.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
