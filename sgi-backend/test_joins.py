import asyncio
from sqlalchemy import select, func
from app.database.db_connection import get_db
from app.models.historial_llamadas import HistorialLlamada
from app.models.comercial import ClienteContacto, CasoLlamada, RegistroImportacion
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado

async def test():
    async for session in get_db():
        result = await session.execute(select(func.count(HistorialLlamada.id)))
        print('Total HistorialLlamada:', result.scalar())
        
        stmt = select(func.count(HistorialLlamada.id))\
            .join(ClienteContacto, HistorialLlamada.contacto_id == ClienteContacto.id)\
            .join(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id)\
            .join(Usuario, HistorialLlamada.comercial_id == Usuario.id)\
            .join(Empleado, Usuario.empleado_id == Empleado.id)
            
        result2 = await session.execute(stmt)
        print('Total with JOINs:', result2.scalar())
        break

asyncio.run(test())
