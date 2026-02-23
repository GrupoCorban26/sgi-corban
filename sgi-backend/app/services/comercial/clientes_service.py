import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func, or_, case
from sqlalchemy.orm import selectinload
from app.schemas.comercial.cliente import ClienteCreate, ClienteUpdate
from app.models.comercial import Cliente, ClienteContacto
from app.models.cliente_historial import ClienteHistorial
from app.models.administrativo import Area, Empleado
from app.models.seguridad import Usuario
from datetime import datetime, timedelta, date

logger = logging.getLogger(__name__)

# Transiciones válidas del pipeline de ventas
TRANSICIONES_VALIDAS: dict[str, list[str]] = {
    "PROSPECTO":       ["EN_NEGOCIACION", "PERDIDO"],
    "EN_NEGOCIACION":  ["CLIENTE", "PERDIDO", "PROSPECTO"],
    "CLIENTE":         ["PERDIDO"],
    "PERDIDO":         ["PROSPECTO"],
    "INACTIVO":        ["PROSPECTO"],
}


class ClientesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        busqueda: str = None,
        tipo_estado: str = None,
        comercial_ids: list[int] = None,
        area_id: int = None,
        page: int = 1,
        page_size: int = 15
    ) -> dict:
        """Lista clientes con paginación y filtros. Filtra por lista de IDs (usuario o empleado)."""
        offset = (page - 1) * page_size
        stmt = select(
            Cliente,
            Area.nombre.label("area_nombre"),
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre")
        ).outerjoin(Area, Cliente.area_encargada_id == Area.id) \
         .outerjoin(Usuario, Cliente.comercial_encargado_id == Usuario.id) \
         .outerjoin(Empleado, Usuario.empleado_id == Empleado.id) \
         .where(Cliente.is_active == True)
        
        if busqueda:
            stmt = stmt.where(or_(
                Cliente.ruc.ilike(f"%{busqueda}%"),
                Cliente.razon_social.ilike(f"%{busqueda}%")
            ))
        
        if tipo_estado:
            stmt = stmt.where(Cliente.tipo_estado == tipo_estado)
        
        if comercial_ids:
            stmt = stmt.where(Cliente.comercial_encargado_id.in_(comercial_ids))
            
        if area_id:
            stmt = stmt.where(Cliente.area_encargada_id == area_id)
            
        # Count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0
        
        # Paginated Data
        stmt = stmt.order_by(Cliente.created_at.desc()).offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        rows = result.all()
        
        data = []
        for row in rows:
            c = row[0]
            data.append({
                "id": c.id,
                "ruc": c.ruc,
                "razon_social": c.razon_social,
                "nombre_comercial": c.nombre_comercial,
                "direccion_fiscal": c.direccion_fiscal,
                "distrito_id": c.distrito_id,
                "area_encargada_id": c.area_encargada_id,
                "area_nombre": row[1],
                "comercial_encargado_id": c.comercial_encargado_id,
                "comercial_nombre": row[2],
                "ultimo_contacto": c.ultimo_contacto,
                "comentario_ultima_llamada": c.comentario_ultima_llamada,
                "proxima_fecha_contacto": c.proxima_fecha_contacto,
                "tipo_estado": c.tipo_estado,
                "motivo_perdida": c.motivo_perdida,
                "fecha_perdida": c.fecha_perdida,
                "fecha_reactivacion": c.fecha_reactivacion,
                "origen": c.origen,
                "is_active": c.is_active,
                "created_at": c.created_at
            })
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            "data": data
        }

    async def get_stats(self, comercial_ids: list[int] = None) -> dict:
        """Estadísticas de clientes con desglose por origen."""
        base_filter = Cliente.is_active == True
        
        # Stats por estado
        stmt = select(
            func.count().label('total'),
            func.sum(case((Cliente.tipo_estado == 'PROSPECTO', 1), else_=0)).label('prospectos'),
            func.sum(case((Cliente.tipo_estado == 'EN_NEGOCIACION', 1), else_=0)).label('en_negociacion'),
            func.sum(case((Cliente.tipo_estado == 'CLIENTE', 1), else_=0)).label('clientes_activos'),
            func.sum(case((Cliente.tipo_estado == 'PERDIDO', 1), else_=0)).label('perdidos'),
            func.sum(case((Cliente.tipo_estado == 'INACTIVO', 1), else_=0)).label('inactivos')
        ).where(base_filter)
        
        if comercial_ids:
            stmt = stmt.where(Cliente.comercial_encargado_id.in_(comercial_ids))
            
        row = (await self.db.execute(stmt)).first()
        
        # Stats por origen
        stmt_origen = select(
            Cliente.origen,
            func.count().label('total'),
            func.sum(case((Cliente.tipo_estado == 'CLIENTE', 1), else_=0)).label('convertidos')
        ).where(base_filter).group_by(Cliente.origen)
        
        if comercial_ids:
            stmt_origen = stmt_origen.where(Cliente.comercial_encargado_id.in_(comercial_ids))
        
        origenes_rows = (await self.db.execute(stmt_origen)).all()
        origenes = {}
        for o in origenes_rows:
            nombre = o.origen or "SIN_ORIGEN"
            total_o = o.total or 0
            convertidos_o = o.convertidos or 0
            origenes[nombre] = {
                "total": total_o,
                "convertidos": convertidos_o,
                "tasa_conversion": round((convertidos_o / total_o * 100), 1) if total_o > 0 else 0
            }
        
        return {
            "total": row.total or 0,
            "prospectos": row.prospectos or 0,
            "en_negociacion": row.en_negociacion or 0,
            "clientes_activos": row.clientes_activos or 0,
            "perdidos": row.perdidos or 0,
            "inactivos": row.inactivos or 0,
            "por_origen": origenes
        }

    async def get_recordatorios(self, comercial_ids: list[int] = None, days: int = 5) -> list:
        """
        Obtiene clientes con próxima fecha de contacto en el rango [hoy, hoy + days].
        Ordenados por fecha más cercana.
        """
        today = datetime.now().date()
        limit_date = today + timedelta(days=days)
        
        stmt = select(
            Cliente,
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre")
        ).outerjoin(Usuario, Cliente.comercial_encargado_id == Usuario.id) \
         .outerjoin(Empleado, Usuario.empleado_id == Empleado.id) \
         .where(
            Cliente.is_active == True,
            # Cliente.proxima_fecha_contacto >= today, # REMOVED to include overdue calls
            Cliente.proxima_fecha_contacto <= limit_date
        )
        
        if comercial_ids:
            stmt = stmt.where(Cliente.comercial_encargado_id.in_(comercial_ids))
            
        stmt = stmt.order_by(Cliente.proxima_fecha_contacto.asc())
        
        result = await self.db.execute(stmt)
        rows = result.all()
        
        data = []
        for row in rows:
            c = row[0]
            comercial_nombre = row[1]
            days_remaining = (c.proxima_fecha_contacto - today).days
            data.append({
                "id": c.id,
                "razon_social": c.razon_social,
                "ruc": c.ruc,
                "proxima_fecha_contacto": c.proxima_fecha_contacto,
                "days_remaining": days_remaining,
                "telefono": "N/A", # Pendiente: obtener teléfono de contacto principal si es necesario
                "comercial_nombre": comercial_nombre,
                "comercial_id": c.comercial_encargado_id
            })
            
        return data

    async def get_by_id(self, id: int):
        """Obtiene un cliente por su ID."""
        stmt = select(
            Cliente,
            Area.nombre.label("area_nombre"),
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre")
        ).outerjoin(Area, Cliente.area_encargada_id == Area.id) \
         .outerjoin(Usuario, Cliente.comercial_encargado_id == Usuario.id) \
         .outerjoin(Empleado, Usuario.empleado_id == Empleado.id) \
         .where(Cliente.id == id, Cliente.is_active == True)
        
        result = await self.db.execute(stmt)
        row = result.first()
        
        if not row:
            return None
        
        c = row[0]
        return {
            "id": c.id,
            "ruc": c.ruc,
            "razon_social": c.razon_social,
            "nombre_comercial": c.nombre_comercial,
            "direccion_fiscal": c.direccion_fiscal,
            "distrito_id": c.distrito_id,
            "area_encargada_id": c.area_encargada_id,
            "area_nombre": row[1],
            "comercial_encargado_id": c.comercial_encargado_id,
            "comercial_nombre": row[2],
            "ultimo_contacto": c.ultimo_contacto,
            "comentario_ultima_llamada": c.comentario_ultima_llamada,
            "proxima_fecha_contacto": c.proxima_fecha_contacto,
            "tipo_estado": c.tipo_estado,
            "motivo_perdida": c.motivo_perdida,
            "fecha_perdida": c.fecha_perdida,
            "fecha_reactivacion": c.fecha_reactivacion,
            "origen": c.origen,
            "is_active": c.is_active,
            "created_at": c.created_at
        }

    async def create(self, cliente: ClienteCreate, comercial_id: int, created_by: int) -> dict:
        """Crea un nuevo cliente y registra el evento inicial en el historial."""
        try:
            # Verificar si ya existe un cliente con el mismo RUC
            if cliente.ruc:
                existing = await self.db.execute(
                    select(Cliente).where(Cliente.ruc == cliente.ruc, Cliente.is_active == True)
                )
                if existing.scalar():
                    return {"success": 0, "message": "Ya existe un cliente con ese RUC"}
            
            nuevo_cliente = Cliente(
                ruc=cliente.ruc,
                razon_social=cliente.razon_social,
                nombre_comercial=cliente.nombre_comercial,
                direccion_fiscal=cliente.direccion_fiscal,
                distrito_id=cliente.distrito_id,
                area_encargada_id=getattr(cliente, 'area_encargada_id', None),
                comercial_encargado_id=comercial_id,
                tipo_estado=cliente.tipo_estado or "PROSPECTO",
                origen=cliente.origen,
                sub_origen=cliente.sub_origen,
                ultimo_contacto=cliente.ultimo_contacto,
                comentario_ultima_llamada=cliente.comentario_ultima_llamada,
                proxima_fecha_contacto=cliente.proxima_fecha_contacto,
                created_by=created_by
            )
            
            self.db.add(nuevo_cliente)
            await self.db.flush()
            
            # Registrar evento inicial en historial
            await self._registrar_historial(
                cliente_id=nuevo_cliente.id,
                estado_anterior=None,
                estado_nuevo=nuevo_cliente.tipo_estado,
                motivo="Creación del cliente",
                origen_cambio="MANUAL",
                registrado_por=created_by
            )
            
            await self.db.commit()
            await self.db.refresh(nuevo_cliente)
            
            return {"success": 1, "message": "Cliente creado exitosamente", "id": nuevo_cliente.id}
        except Exception as e:
            await self.db.rollback()
            return {"success": 0, "message": f"Error al crear cliente: {str(e)}"}

    async def update(self, id: int, cliente: ClienteUpdate, updated_by: int) -> dict:
        """Actualiza un cliente existente."""
        try:
            result = await self.db.execute(
                select(Cliente).where(Cliente.id == id, Cliente.is_active == True)
            )
            db_cliente = result.scalar()
            
            if not db_cliente:
                return {"success": 0, "message": "Cliente no encontrado"}
            
            # Actualizar solo los campos proporcionados
            update_data = cliente.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                if hasattr(db_cliente, field):
                    setattr(db_cliente, field, value)
            
            db_cliente.updated_by = updated_by
            db_cliente.updated_at = datetime.now()
            
            await self.db.commit()
            await self.db.refresh(db_cliente)
            
            return {"success": 1, "message": "Cliente actualizado exitosamente", "id": db_cliente.id}
        except Exception as e:
            await self.db.rollback()
            return {"success": 0, "message": f"Error al actualizar cliente: {str(e)}"}

    async def delete(self, id: int, updated_by: int) -> dict:
        """Soft delete de un cliente."""
        return await self.archivar(id, updated_by)

    # =========================================================================
    # NUEVOS MÉTODOS PIPELINE DE VENTAS
    # =========================================================================

    async def cambiar_estado(self, id: int, nuevo_estado: str, updated_by: int, motivo: str = None) -> dict:
        """Cambia el estado del cliente con validación de máquina de estados y registro en historial."""
        try:
            result = await self.db.execute(select(Cliente).where(Cliente.id == id, Cliente.is_active == True))
            cliente = result.scalar()
            
            if not cliente:
                return {"success": 0, "message": "Cliente no encontrado"}
            
            estado_actual = cliente.tipo_estado
            
            # Validar transición
            transiciones_permitidas = TRANSICIONES_VALIDAS.get(estado_actual, [])
            if nuevo_estado not in transiciones_permitidas:
                return {
                    "success": 0, 
                    "message": f"Transición inválida: {estado_actual} → {nuevo_estado}. "
                               f"Transiciones permitidas: {', '.join(transiciones_permitidas)}"
                }
            
            # Calcular tiempo en estado anterior
            tiempo_en_estado = None
            if cliente.updated_at:
                tiempo_en_estado = int((datetime.now() - cliente.updated_at).total_seconds() / 60)
            
            # Aplicar cambio
            cliente.tipo_estado = nuevo_estado
            cliente.updated_by = updated_by
            cliente.updated_at = datetime.now()
            
            # Auto-poblar fecha_conversion_cliente cuando pasa a CLIENTE
            if nuevo_estado == "CLIENTE" and not cliente.fecha_conversion_cliente:
                cliente.fecha_conversion_cliente = datetime.now()
            
            # Registrar en historial
            await self._registrar_historial(
                cliente_id=id,
                estado_anterior=estado_actual,
                estado_nuevo=nuevo_estado,
                motivo=motivo,
                origen_cambio="MANUAL",
                tiempo_en_estado_anterior=tiempo_en_estado,
                registrado_por=updated_by
            )
            
            await self.db.commit()
            return {"success": 1, "message": f"Estado actualizado: {estado_actual} → {nuevo_estado}"}
        except Exception as e:
            logger.error(f"Error cambiar estado cliente {id}: {e}")
            await self.db.rollback()
            return {"success": 0, "message": f"Error al cambiar estado: {str(e)}"}

    async def marcar_perdido(self, id: int, motivo: str, fecha_reactivacion: date, updated_by: int) -> dict:
        """Marca como PERDIDO. Si no hay fecha de reactivación, archiva a INACTIVO."""
        try:
            result = await self.db.execute(select(Cliente).where(Cliente.id == id, Cliente.is_active == True))
            cliente = result.scalar()
            
            if not cliente:
                return {"success": 0, "message": "Cliente no encontrado"}
            
            if not fecha_reactivacion:
                return await self.archivar(id, updated_by)
            
            estado_anterior = cliente.tipo_estado
            tiempo_en_estado = None
            if cliente.updated_at:
                tiempo_en_estado = int((datetime.now() - cliente.updated_at).total_seconds() / 60)
            
            cliente.tipo_estado = "PERDIDO"
            cliente.motivo_perdida = motivo
            cliente.fecha_perdida = datetime.now().date()
            cliente.fecha_reactivacion = fecha_reactivacion
            cliente.proxima_fecha_contacto = fecha_reactivacion
            cliente.updated_by = updated_by
            cliente.updated_at = datetime.now()
            
            await self._registrar_historial(
                cliente_id=id,
                estado_anterior=estado_anterior,
                estado_nuevo="PERDIDO",
                motivo=motivo,
                origen_cambio="MANUAL",
                tiempo_en_estado_anterior=tiempo_en_estado,
                registrado_por=updated_by
            )
            
            await self.db.commit()
            return {"success": 1, "message": "Cliente marcado como perdido (temporalmente)"}
        except Exception as e:
            await self.db.rollback()
            return {"success": 0, "message": f"Error al marcar perdido: {str(e)}"}

    async def reactivar(self, id: int, updated_by: int) -> dict:
        """Reactiva un cliente PERDIDO o INACTIVO a PROSPECTO."""
        try:
            result = await self.db.execute(select(Cliente).where(Cliente.id == id))
            cliente = result.scalar()
            
            if not cliente:
                return {"success": 0, "message": "Cliente no encontrado"}
            
            estado_anterior = cliente.tipo_estado
            tiempo_en_estado = None
            if cliente.updated_at:
                tiempo_en_estado = int((datetime.now() - cliente.updated_at).total_seconds() / 60)
            
            cliente.tipo_estado = "PROSPECTO"
            cliente.is_active = True
            cliente.motivo_perdida = None
            cliente.fecha_perdida = None
            cliente.fecha_reactivacion = None
            cliente.updated_by = updated_by
            cliente.updated_at = datetime.now()
            
            if cliente.ruc:
                await self._cascade_contactos(cliente.ruc, activate=True)
            
            await self._registrar_historial(
                cliente_id=id,
                estado_anterior=estado_anterior,
                estado_nuevo="PROSPECTO",
                motivo="Reactivación del cliente",
                origen_cambio="REACTIVACION",
                tiempo_en_estado_anterior=tiempo_en_estado,
                registrado_por=updated_by
            )
            
            await self.db.commit()
            return {"success": 1, "message": "Cliente reactivado a PROSPECTO"}
        except Exception as e:
            await self.db.rollback()
            return {"success": 0, "message": f"Error al reactivar: {str(e)}"}

    async def archivar(self, id: int, updated_by: int) -> dict:
        """Pasa a INACTIVO y desactiva contactos."""
        try:
            result = await self.db.execute(select(Cliente).where(Cliente.id == id))
            cliente = result.scalar()
            
            if not cliente:
                return {"success": 0, "message": "Cliente no encontrado"}
            
            estado_anterior = cliente.tipo_estado
            tiempo_en_estado = None
            if cliente.updated_at:
                tiempo_en_estado = int((datetime.now() - cliente.updated_at).total_seconds() / 60)
            
            cliente.tipo_estado = "INACTIVO"
            cliente.is_active = False
            cliente.updated_by = updated_by
            cliente.updated_at = datetime.now()
            
            if cliente.ruc:
                await self._cascade_contactos(cliente.ruc, activate=False)
            
            await self._registrar_historial(
                cliente_id=id,
                estado_anterior=estado_anterior,
                estado_nuevo="INACTIVO",
                motivo="Cliente archivado",
                origen_cambio="MANUAL",
                tiempo_en_estado_anterior=tiempo_en_estado,
                registrado_por=updated_by
            )
            
            await self.db.commit()
            return {"success": 1, "message": "Cliente archivado (INACTIVO)"}
        except Exception as e:
            await self.db.rollback()
            return {"success": 0, "message": f"Error al archivar: {str(e)}"}

    async def _cascade_contactos(self, ruc: str, activate: bool):
        """Activa o desactiva contactos según el RUC."""
        stmt = select(ClienteContacto).where(ClienteContacto.ruc == ruc)
        result = await self.db.execute(stmt)
        contactos = result.scalars().all()
        for c in contactos:
            c.is_active = activate

    # =========================================================================
    # HISTORIAL
    # =========================================================================

    async def _registrar_historial(
        self,
        cliente_id: int,
        estado_anterior: str | None,
        estado_nuevo: str,
        motivo: str | None = None,
        origen_cambio: str = "MANUAL",
        tiempo_en_estado_anterior: int | None = None,
        registrado_por: int | None = None
    ):
        """Registra un cambio de estado en la tabla de historial."""
        historial = ClienteHistorial(
            cliente_id=cliente_id,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            motivo=motivo,
            origen_cambio=origen_cambio,
            tiempo_en_estado_anterior=tiempo_en_estado_anterior,
            registrado_por=registrado_por
        )
        self.db.add(historial)

    async def get_historial(self, cliente_id: int) -> list[dict]:
        """Devuelve la línea de tiempo completa de transiciones del cliente."""
        stmt = (
            select(
                ClienteHistorial,
                func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("nombre_registrador")
            )
            .outerjoin(Usuario, ClienteHistorial.registrado_por == Usuario.id)
            .outerjoin(Empleado, Usuario.empleado_id == Empleado.id)
            .where(ClienteHistorial.cliente_id == cliente_id)
            .order_by(ClienteHistorial.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()
        
        return [
            {
                "id": h.id,
                "cliente_id": h.cliente_id,
                "estado_anterior": h.estado_anterior,
                "estado_nuevo": h.estado_nuevo,
                "motivo": h.motivo,
                "origen_cambio": h.origen_cambio,
                "tiempo_en_estado_anterior": h.tiempo_en_estado_anterior,
                "registrado_por": h.registrado_por,
                "nombre_registrador": nombre,
                "created_at": h.created_at
            }
            for h, nombre in rows
        ]
