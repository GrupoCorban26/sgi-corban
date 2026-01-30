from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.logistica import Vehiculo, Conductor
from app.models.administrativo import Empleado

class LogisticaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_conductores_activos(self):
        """
        Retorna lista de conductores activos con detalles de vehículo
        para el dropdown de selección.
        """
        stmt = select(
            Conductor.id,
            Empleado.nombres,
            Empleado.apellido_paterno,
            Vehiculo.placa,
            Vehiculo.tipo_vehiculo
        ).join(Empleado, Conductor.empleado_id == Empleado.id)\
         .join(Vehiculo, Conductor.vehiculo_id == Vehiculo.id)\
         .where(Conductor.is_active == True, Vehiculo.is_active == True)
         
        result = await self.db.execute(stmt)
        data = []
        for row in result.all():
            data.append({
                "id": row.id,
                "nombres": f"{row.nombres} {row.apellido_paterno}",
                "vehiculo": row.tipo_vehiculo,
                "placa": row.placa,
                "display_label": f"{row.nombres} - {row.tipo_vehiculo}" # Frontend can format plaque below
            })
        return data

    async def seed_data(self):
        # Temp function to seed if empty
        stmt = select(Vehiculo)
        existing = (await self.db.execute(stmt)).first()
        if not existing:
            # Crear Vehiculos
            v1 = Vehiculo(placa="BTI-123", tipo_vehiculo="Van", marca="Toyota")
            v2 = Vehiculo(placa="ABC-987", tipo_vehiculo="Auto", marca="Nissan")
            self.db.add_all([v1, v2])
            await self.db.commit()
            
            # Crear Conductores (Asumiendo empleados existen, asignamos al azar o 1 y 2)
            # Esto es arriesgado sin saber IDs de empleados. 
            # Mejor dejar vacío y que el usuario lo llene o insertar si se encuentran empleados.
            pass
