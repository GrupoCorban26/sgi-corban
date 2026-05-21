import asyncio
from datetime import datetime
from sqlalchemy import select
from app.database.db_connection import get_db

import main
from app.models import HistorialLlamada, CasoLlamada
from app.models.comercial_base import BaseContacto
from app.services.comercial.contactos_asignacion_service import ContactosAsignacionService

async def test():
    async for session in get_db():
        # Find a contact that is assigned and has a pending call history
        stmt = select(
            HistorialLlamada, BaseContacto
        ).join(
            BaseContacto, HistorialLlamada.base_id == BaseContacto.id
        ).where(
            BaseContacto.estado == 'ASIGNADO',
            HistorialLlamada.caso_id.is_(None)
        ).limit(1)
        
        result = await session.execute(stmt)
        row = result.first()
        if not row:
            print("No se encontró ningún contacto asignado con llamada pendiente.")
            break
            
        historial, base = row
        print(f"Contacto seleccionado: ID Base {base.id}, RUC {base.ruc}, Razón {base.razon_social}")
        print(f"Fecha de asignación original (created_at): {historial.created_at}")
        
        # Get a case ID to tipify
        stmt_caso = select(CasoLlamada.id).limit(1)
        caso_id = (await session.execute(stmt_caso)).scalar()
        if not caso_id:
            print("No se encontró ningún caso de llamada en la base de datos.")
            break
            
        print(f"Usando CasoLlamada ID: {caso_id}")
        
        # Use service to update feedback
        service = ContactosAsignacionService(session)
        
        # We start a nested transaction so we can verify the DB state and then rollback
        async with session.begin_nested():
            response = await service.actualizar_feedback(
                base_id=base.id,
                caso_id=caso_id,
                comentario="Comentario de prueba automatizado",
                user_id=historial.comercial_id
            )
            print("Respuesta del servicio:", response)
            
            # Fetch the record again to check new created_at
            session.expire(historial)
            stmt_check = select(HistorialLlamada).where(HistorialLlamada.id == historial.id)
            updated_historial = (await session.execute(stmt_check)).scalar()
            
            print(f"Fecha de llamada actualizada (created_at): {updated_historial.created_at}")
            
            if updated_historial.created_at > datetime.now().replace(year=2026, month=5, day=20, hour=0, minute=0, second=0):
                print("✅ ÉXITO: La fecha 'created_at' fue actualizada correctamente al momento de la llamada.")
            else:
                print("❌ ERROR: La fecha 'created_at' no se actualizó.")
                
        # Rollback the nested transaction so the test data is not permanently changed
        await session.rollback()
        print("Transacción revertida para mantener la base de datos limpia.")
        break

if __name__ == '__main__':
    asyncio.run(test())
