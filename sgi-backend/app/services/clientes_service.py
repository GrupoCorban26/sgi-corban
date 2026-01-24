from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func, or_, case
from sqlalchemy.orm import selectinload
from app.schemas.cliente import ClienteCreate, ClienteUpdate
from app.models.comercial import Cliente
from app.models.administrativo import Area, Empleado
from datetime import datetime, timedelta


class ClientesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        busqueda: str = None,
        tipo_estado: str = None,
        comercial_id: int = None,
        area_id: int = None,
        page: int = 1,
        page_size: int = 15
    ) -> dict:
        """Lista clientes con paginación y filtros"""
        offset = (page - 1) * page_size
        stmt = select(
            Cliente,
            Area.nombre.label("area_nombre"),
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre")
        ).outerjoin(Area, Cliente.area_encargada_id == Area.id) \
         .outerjoin(Empleado, Cliente.comercial_encargado_id == Empleado.id) \
         .where(Cliente.is_active == True)
        
        if busqueda:
            stmt = stmt.where(or_(
                Cliente.ruc.ilike(f"%{busqueda}%"),
                Cliente.razon_social.ilike(f"%{busqueda}%")
            ))
        
        if tipo_estado:
            stmt = stmt.where(Cliente.tipo_estado == tipo_estado)
        
        if comercial_id:
            stmt = stmt.where(Cliente.comercial_encargado_id == comercial_id)
            
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

    async def get_by_id(self, id: int) -> dict:
        """Obtiene un cliente por ID"""
        stmt = select(
            Cliente,
            Area.nombre.label("area_nombre"),
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre")
        ).outerjoin(Area, Cliente.area_encargada_id == Area.id) \
         .outerjoin(Empleado, Cliente.comercial_encargado_id == Empleado.id) \
         .where(Cliente.id == id)
         
        result = await self.db.execute(stmt)
        row = result.first()
        
        if not row: return None
        
        c = row[0]
        c_dict = {k: v for k, v in c.__dict__.items() if not k.startswith('_')}
        c_dict["area_nombre"] = row[1]
        c_dict["comercial_nombre"] = row[2]
        return c_dict

    async def create(
        self, 
        cliente: ClienteCreate, 
        comercial_id: int,
        area_id: int = None,
        created_by: int = None
    ) -> dict:
        """Crea un nuevo cliente"""
        if not area_id:
            # Buscar área Ventas
            stmt_area = select(Area.id).where(Area.nombre.like('%Ventas%'), Area.is_active == True)
            area_id = (await self.db.execute(stmt_area)).scalar()
        
        nuevo_cliente = Cliente(
            ruc=cliente.ruc,
            razon_social=cliente.razon_social,
            nombre_comercial=cliente.nombre_comercial,
            direccion_fiscal=cliente.direccion_fiscal,
            distrito_id=cliente.distrito_id,
            area_encargada_id=area_id,
            comercial_encargado_id=comercial_id,
            tipo_estado=cliente.tipo_estado,
            origen=cliente.origen or "MANUAL",
            comentario_ultima_llamada=cliente.comentario_ultima_llamada,
            ultimo_contacto=cliente.ultimo_contacto,
            proxima_fecha_contacto=cliente.proxima_fecha_contacto,
            created_by=created_by,
            is_active=True
        )
        self.db.add(nuevo_cliente)
        await self.db.commit()
        await self.db.refresh(nuevo_cliente)
        
        return {"success": 1, "id": nuevo_cliente.id, "message": "Cliente creado correctamente"}

    async def update(self, id: int, cliente: ClienteUpdate, updated_by: int = None) -> dict:
        """Actualiza un cliente"""
        stmt = select(Cliente).where(Cliente.id == id)
        res = await self.db.execute(stmt)
        cliente_db = res.scalars().first()
        
        if not cliente_db: return {"success": 0, "message": "Cliente no encontrado"}
        
        if cliente.razon_social is not None: cliente_db.razon_social = cliente.razon_social
        if cliente.ruc is not None: cliente_db.ruc = cliente.ruc
        if cliente.nombre_comercial is not None: cliente_db.nombre_comercial = cliente.nombre_comercial
        if cliente.direccion_fiscal is not None: cliente_db.direccion_fiscal = cliente.direccion_fiscal
        if cliente.distrito_id is not None: cliente_db.distrito_id = cliente.distrito_id
        if cliente.area_encargada_id is not None: cliente_db.area_encargada_id = cliente.area_encargada_id
        if cliente.comercial_encargado_id is not None: cliente_db.comercial_encargado_id = cliente.comercial_encargado_id
        if cliente.tipo_estado is not None: cliente_db.tipo_estado = cliente.tipo_estado
        if cliente.comentario_ultima_llamada is not None: cliente_db.comentario_ultima_llamada = cliente.comentario_ultima_llamada
        if cliente.proxima_fecha_contacto is not None: cliente_db.proxima_fecha_contacto = cliente.proxima_fecha_contacto
        
        cliente_db.updated_by = updated_by
        cliente_db.updated_at = func.now()
        
        await self.db.commit()
        return {"success": 1, "message": "Cliente actualizado correctamente"}

    async def delete(self, id: int, updated_by: int = None) -> dict:
        """Desactiva un cliente (soft delete)"""
        stmt = select(Cliente).where(Cliente.id == id)
        res = await self.db.execute(stmt)
        cliente_db = res.scalars().first()
        
        if cliente_db:
            cliente_db.is_active = False
            cliente_db.updated_by = updated_by
            cliente_db.updated_at = func.now()
            await self.db.commit()
            
        return {"success": 1, "message": "Cliente desactivado correctamente"}

    async def get_dropdown(self) -> list:
        """Lista simple para dropdowns"""
        stmt = select(Cliente.id, Cliente.razon_social, Cliente.ruc).where(Cliente.is_active == True).order_by(Cliente.razon_social)
        result = await self.db.execute(stmt)
        return [{"id": row.id, "razon_social": row.razon_social, "ruc": row.ruc} for row in result.scalars().all()]

    async def get_stats(self, comercial_id: int = None) -> dict:
        """Estadísticas de clientes"""
        stmt = select(
            func.count().label('total'),
            func.sum(case((Cliente.tipo_estado == 'PROSPECTO', 1), else_=0)).label('prospectos'),
            func.sum(case((Cliente.tipo_estado == 'CLIENTE', 1), else_=0)).label('clientes_activos'),
            func.sum(case((Cliente.tipo_estado == 'INACTIVO', 1), else_=0)).label('inactivos')
        ).where(Cliente.is_active == True)
        
        if comercial_id:
            stmt = stmt.where(Cliente.comercial_encargado_id == comercial_id)
            
        row = (await self.db.execute(stmt)).first()
        return {
            "total": row.total or 0,
            "prospectos": row.prospectos or 0,
            "clientes_activos": row.clientes_activos or 0,
            "inactivos": row.inactivos or 0
        }

    async def get_recordatorios(self, comercial_id: int, days: int = 5) -> list:
        """
        Obtiene clientes con próxima fecha de contacto en el rango [hoy, hoy + days].
        Ordenados por fecha más cercana.
        """
        today = datetime.now().date()
        limit_date = today + timedelta(days=days)
        
        stmt = select(Cliente).where(
            Cliente.comercial_encargado_id == comercial_id,
            Cliente.is_active == True,
            Cliente.proxima_fecha_contacto >= today,
            Cliente.proxima_fecha_contacto <= limit_date
        ).order_by(Cliente.proxima_fecha_contacto.asc())
        
        result = await self.db.execute(stmt)
        clients = result.scalars().all()
        
        data = []
        for c in clients:
            days_remaining = (c.proxima_fecha_contacto - today).days
            data.append({
                "id": c.id,
                "razon_social": c.razon_social,
                "ruc": c.ruc,
                "proxima_fecha_contacto": c.proxima_fecha_contacto,
                "days_remaining": days_remaining,
                "telefono": "N/A" # Pendiente: obtener teléfono de contacto principal si es necesario
            })
            
        return data
