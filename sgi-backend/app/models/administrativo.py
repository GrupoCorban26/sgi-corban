from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

# Tabla de departamentos (departamentos organizacionales)

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
    # De la clase Departamento puedo usar el atributo "responsable" para obtener un objeto completo de la tabla Empleado.
    responsable = relationship("Empleado", foreign_keys=[responsable_id], back_populates="departamentos_a_cargo")
    # Aqui podemos crear un objeto mi_departamento.areas que buscará en la tabla Area todas las áreas que tengan el id del departamento en departamento_id.
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
    # De la clase Area puedo crear un objeto mi_area.departamento.nombre que buscará en la tabla Departamento el nombre del departamento cuyo id esté en departamento_id.
    departamento = relationship("Departamento", back_populates="areas")
    # De la clase Area puedo crear un objeto mi_area.responsable.nombre que buscará en la tabla Empleado el nombre del responsable cuyo id esté en responsable_id.
    responsable = relationship("Empleado", foreign_keys=[responsable_id], back_populates="areas_a_cargo")
    # De la clase Area puedo crear un objeto mi_area.area_padre.nombre que buscará en la tabla Area el nombre del área padre cuyo id esté en area_padre_id.
    area_padre = relationship("Area", remote_side=[id], backref="subareas")
    # De la clase Area puedo crear un objeto mi_area.cargos.nombre que buscará en la tabla Cargo todos los cargos que tengan el id del área en area_id.
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
    # Campos de carta de responsabilidad
    tiene_carta = Column(Boolean, default=False)
    fecha_carta = Column(DateTime(timezone=True))
    archivo_carta = Column(String(200))

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
    color = Column(String(20), default="#6B7280")
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


class LineaCorporativa(Base):
    """Línea telefónica corporativa (chip + gmail) - independiente del dispositivo físico"""
    __tablename__ = "lineas_corporativas"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(20), nullable=False, unique=True)  # 987654321
    gmail = Column(String(100), nullable=False, unique=True)  # grupocorban01@gmail.com
    operador = Column(String(30))  # Claro, Movistar, Entel, Bitel
    plan = Column(String(50))  # Descripción del plan
    proveedor = Column(String(50))  # CORBAN ADUANAS, CORBAN TRANS LOGISTIC, EBL
    activo_id = Column(Integer, ForeignKey("adm.activos.id"), nullable=True)  # Celular donde está instalado
    fecha_asignacion = Column(DateTime(timezone=True))  # Cuándo se asignó al empleado
    is_active = Column(Boolean, default=True, nullable=False)
    observaciones = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    activo = relationship("Activo", backref="linea_instalada")
    
    @property
    def responsable(self):
        """
        Retorna el empleado que tiene asignado el activo donde está instalada la línea.
        Si la línea no tiene activo, retorna None.
        """
        if self.activo and self.activo.asignaciones:
            # Buscar asignación activa (fecha_devolucion IS NULL)
            # Nota: Esto asume que 'asignaciones' está cargado o es Lazy
            for asignacion in self.activo.asignaciones:
                if asignacion.fecha_devolucion is None:
                    return asignacion.empleado
        return None


class LineaHistorial(Base):
    """Historial de cambios de línea (cambio de celular, cambio de empleado)"""
    __tablename__ = "linea_historial"
    __table_args__ = {"schema": "adm"}

    id = Column(Integer, primary_key=True, index=True)
    linea_id = Column(Integer, ForeignKey("adm.lineas_corporativas.id"), nullable=False)
    tipo_cambio = Column(String(30), nullable=False)  # 'CREACION', 'CAMBIO_CELULAR', 'ASIGNACION', 'DESASIGNACION', 'BAJA'
    activo_anterior_id = Column(Integer, ForeignKey("adm.activos.id"), nullable=True)
    activo_nuevo_id = Column(Integer, ForeignKey("adm.activos.id"), nullable=True)
    empleado_anterior_id = Column(Integer, ForeignKey("adm.empleados.id"), nullable=True)
    empleado_nuevo_id = Column(Integer, ForeignKey("adm.empleados.id"), nullable=True)
    observaciones = Column(String(500))
    registrado_por = Column(Integer, ForeignKey("seg.usuarios.id"))
    fecha_cambio = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    linea = relationship("LineaCorporativa", backref="historial")
    activo_anterior = relationship("Activo", foreign_keys=[activo_anterior_id])
    activo_nuevo = relationship("Activo", foreign_keys=[activo_nuevo_id])
    empleado_anterior = relationship("Empleado", foreign_keys=[empleado_anterior_id])
    empleado_nuevo = relationship("Empleado", foreign_keys=[empleado_nuevo_id])
    usuario = relationship("app.models.seguridad.Usuario")
