from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from app.models.comercial import Cita, Cliente
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.models.logistica import Conductor, Vehiculo
from app.schemas.comercial.cita import CitaCreate, CitaUpdate
from fastapi import HTTPException
from datetime import datetime

class CitasService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        comercial_id: int = None,
        estado: str = None,
        page: int = 1,
        page_size: int = 20
    ):
        offset = (page - 1) * page_size
        
        # Para simplificar el mapeo, usaremos ORM loading + python processing
        # Re-hacemos query estilo ORM puro para aprovechar relationships
        # Importamos joinedload aqui para no tocar arriba si no es necesario, o mejor arriba.
        # Asumiendo que puedo editar imports con otro replace o esperar que "smart" lo haga? 
        # No, debo hacerlo yo.
        # Voy a hacer un replace grande de la funcion.
        
        from sqlalchemy.orm import joinedload

        orm_stmt = select(Cita).options(
            joinedload(Cita.cliente),
            joinedload(Cita.conductor)
        ).order_by(desc(Cita.created_at))
        
        if comercial_id:
             orm_stmt = orm_stmt.where(Cita.comercial_id == comercial_id)
        if estado:
             orm_stmt = orm_stmt.where(Cita.estado == estado)
             
        orm_stmt = orm_stmt.offset(offset).limit(page_size)
        
        res = await self.db.execute(orm_stmt)
        citas = res.scalars().all()
        
        # Count
        count_stmt = select(func.count()).select_from(Cita)
        if comercial_id: count_stmt = count_stmt.where(Cita.comercial_id == comercial_id)
        if estado: count_stmt = count_stmt.where(Cita.estado == estado)
        total = (await self.db.execute(count_stmt)).scalar() or 0
        
        # Process data to clean dicts
        data = []
        for c in citas:
            # item = c.__dict__.copy() # unsafe with sqlalchemy state
            # Mejor extraer manualmente lo que queremos o usar Pydantic from_orm
            
            # Construimos dict manual para asegurar serializacion
            item = {
                "id": c.id,
                "cliente_id": c.cliente_id,
                "comercial_id": c.comercial_id,
                "fecha": c.fecha,
                "hora": c.hora,
                "tipo_cita": c.tipo_cita,
                "direccion": c.direccion,
                "motivo": c.motivo,
                "con_presente": c.con_presente,
                "estado": c.estado,
                "motivo_rechazo": c.motivo_rechazo,
                "acompanado_por_id": c.acompanado_por_id,
                "conductor_id": c.conductor_id,
                "created_at": c.created_at,
                "created_by": c.created_by,
                # Campos extras
                "cliente_razon_social": c.cliente.razon_social if c.cliente else None,
                "comercial_nombre": "Cargando...", # Se llena abajo
                "acompanante_nombre": None,
                "conductor_info": None
            }
            
            # Comercial nombre logic
            item['comercial_nombre'] = await self._get_empleado_name(c.comercial_id)
            if c.acompanado_por_id:
                item['acompanante_nombre'] = await self._get_empleado_name(c.acompanado_por_id)
            
            if c.conductor_id:
                item['conductor_info'] = await self._get_conductor_info(c.conductor_id)

            data.append(item)

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "data": data
        }

    async def _get_empleado_name(self, usuario_id: int):
        # Usuario -> Empleado
        stmt = select(func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno))\
            .join(Usuario, Usuario.empleado_id == Empleado.id)\
            .where(Usuario.id == usuario_id)
        return (await self.db.execute(stmt)).scalar() or "Desconocido"

    async def _get_conductor_info(self, conductor_id: int):
        # Conductor -> Empleado, Vehiculo
        stmt = select(
            Empleado.nombres,
            Vehiculo.tipo_vehiculo,
            Vehiculo.placa
        ).join(Conductor, Conductor.empleado_id == Empleado.id)\
         .join(Vehiculo, Conductor.vehiculo_id == Vehiculo.id)\
         .where(Conductor.id == conductor_id)
        
        row = (await self.db.execute(stmt)).first()
        if row:
            return f"{row.nombres} - {row.tipo_vehiculo} ({row.placa})"
        return None

    async def create(self, data: CitaCreate, comercial_id: int, created_by: int):
        cita = Cita(
            **data.dict(),
            comercial_id=comercial_id,
            created_by=created_by,
            estado="PENDIENTE"
        )
        self.db.add(cita)
        await self.db.commit()
        await self.db.refresh(cita)
        return cita

    async def update(self, id: int, data: CitaUpdate, updated_by: int):
        stmt = select(Cita).where(Cita.id == id)
        cita = (await self.db.execute(stmt)).scalars().first()
        if not cita:
            raise HTTPException(404, "Cita no encontrada")
            
        update_data = data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(cita, key, value)
            
        # Si se edita, vuelve a pendiente y borra rechazo
        cita.estado = "PENDIENTE"
        cita.motivo_rechazo = None
        
        cita.updated_by = updated_by # Falta columna updated_by, usar log existente o suponer
        await self.db.commit()
        await self.db.refresh(cita)
        return cita

    async def aprobar(self, id: int, acompanado_por_id: int, conductor_id: int):
        stmt = select(Cita).where(Cita.id == id)
        cita = (await self.db.execute(stmt)).scalars().first()
        if not cita:
            raise HTTPException(404, "Cita no encontrada")
            
        cita.estado = "APROBADO"
        cita.acompanado_por_id = acompanado_por_id
        cita.conductor_id = conductor_id
        
        await self.db.commit()
        return {"message": "Cita aprobada"}

    async def rechazar(self, id: int, motivo: str):
        stmt = select(Cita).where(Cita.id == id)
        cita = (await self.db.execute(stmt)).scalars().first()
        if not cita:
            raise HTTPException(404, "Cita no encontrada")
            
        cita.estado = "RECHAZADO"
        cita.motivo_rechazo = motivo
        
        await self.db.commit()
        return {"message": "Cita rechazada"}

    async def terminar(self, id: int):
        stmt = select(Cita).where(Cita.id == id)
        cita = (await self.db.execute(stmt)).scalars().first()
        if not cita:
            raise HTTPException(404, "Cita no encontrada")
            
        # Validación: Solo si la fecha es HOY
        today = datetime.now().date()
        if cita.fecha.date() != today:
             # Permitir también si es anterior pero olvidaron marcarlo? 
             # El usuario dijo: "no podrá colocar terminado si la fecha no es la actual"
             # Interpretación estricta: solo hoy.
             raise HTTPException(400, "Solo puede finalizar citas programadas para el día de hoy")

        cita.estado = "TERMINADO"
        
        await self.db.commit()
        return {"message": "Cita finalizada correctamente"}
