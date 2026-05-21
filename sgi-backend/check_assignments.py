import asyncio
from sqlalchemy import select, func
from app.database.db_connection import get_db

import main
from app.models import Cliente, HistorialLlamada, Usuario, Empleado
from app.models.comercial_base import BaseContacto

async def test():
    async for session in get_db():
        # Get count of assignments per state
        states = await session.execute(
            select(BaseContacto.estado, func.count(BaseContacto.id))
            .group_by(BaseContacto.estado)
        )
        print("--- Estados en BaseContacto ---")
        for row in states.all():
            print(f"Estado: {row[0]}, Cantidad: {row[1]}")
            
        # Get active assignments with user names
        active_assignments = await session.execute(
            select(
                BaseContacto.id,
                BaseContacto.ruc,
                BaseContacto.razon_social,
                BaseContacto.asignado_a,
                Usuario.correo_corp,
                func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno)
            )
            .join(Usuario, BaseContacto.asignado_a == Usuario.id)
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            .where(BaseContacto.estado == 'ASIGNADO')
            .limit(10)
        )
        print("\n--- Muestra de Contactos Asignados Activos ---")
        rows = active_assignments.all()
        if not rows:
            print("No hay contactos en estado 'ASIGNADO' actualmente.")
        for row in rows:
            print(f"Base ID: {row[0]}, RUC: {row[1]}, Razón: {row[2]}, Asignado A ID: {row[3]}, Usuario: {row[4]}, Empleado: {row[5]}")

        # Get count of HistorialLlamada with/without caso_id
        c_null = (await session.execute(select(func.count(HistorialLlamada.id)).where(HistorialLlamada.caso_id.is_(None)))).scalar() or 0
        c_not_null = (await session.execute(select(func.count(HistorialLlamada.id)).where(HistorialLlamada.caso_id.isnot(None)))).scalar() or 0
        print("\n--- HistorialLlamada stats ---")
        print(f"Llamadas pendientes (caso_id IS NULL): {c_null}")
        print(f"Llamadas guardadas (caso_id IS NOT NULL): {c_not_null}")
        break

if __name__ == '__main__':
    asyncio.run(test())
