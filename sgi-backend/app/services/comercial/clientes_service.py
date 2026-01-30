from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func, or_, case
from sqlalchemy.orm import selectinload
from app.schemas.comercial.cliente import ClienteCreate, ClienteUpdate
from app.models.comercial import Cliente
from app.models.administrativo import Area, Empleado
from app.models.seguridad import Usuario
from datetime import datetime, timedelta


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
        """Estadísticas de clientes"""
        stmt = select(
            func.count().label('total'),
            func.sum(case((Cliente.tipo_estado == 'PROSPECTO', 1), else_=0)).label('prospectos'),
            func.sum(case((Cliente.tipo_estado == 'CLIENTE', 1), else_=0)).label('clientes_activos'),
            func.sum(case((Cliente.tipo_estado == 'INACTIVO', 1), else_=0)).label('inactivos')
        ).where(Cliente.is_active == True)
        
        if comercial_ids:
            stmt = stmt.where(Cliente.comercial_encargado_id.in_(comercial_ids))
            
        row = (await self.db.execute(stmt)).first()
        return {
            "total": row.total or 0,
            "prospectos": row.prospectos or 0,
            "clientes_activos": row.clientes_activos or 0,
            "inactivos": row.inactivos or 0
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
            "origen": c.origen,
            "is_active": c.is_active,
            "created_at": c.created_at
        }

    async def create(self, cliente: ClienteCreate, comercial_id: int, created_by: int) -> dict:
        """Crea un nuevo cliente."""
        try:
            # Verificar si ya existe un cliente con el mismo RUC
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
                area_encargada_id=getattr(cliente, 'area_encargada_id', None),  # Opcional - lo asigna la jefa comercial
                comercial_encargado_id=comercial_id,
                tipo_estado=cliente.tipo_estado or "PROSPECTO",
                origen=cliente.origen,
                ultimo_contacto=cliente.ultimo_contacto,
                comentario_ultima_llamada=cliente.comentario_ultima_llamada,
                proxima_fecha_contacto=cliente.proxima_fecha_contacto,
                created_by=created_by
            )
            
            self.db.add(nuevo_cliente)
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
        try:
            result = await self.db.execute(
                select(Cliente).where(Cliente.id == id, Cliente.is_active == True)
            )
            db_cliente = result.scalar()
            
            if not db_cliente:
                return {"success": 0, "message": "Cliente no encontrado"}
            
            db_cliente.is_active = False
            db_cliente.updated_by = updated_by
            db_cliente.updated_at = datetime.now()
            
            await self.db.commit()
            
            return {"success": 1, "message": "Cliente eliminado exitosamente"}
        except Exception as e:
            await self.db.rollback()
            return {"success": 0, "message": f"Error al eliminar cliente: {str(e)}"}
