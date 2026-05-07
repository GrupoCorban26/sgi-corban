import asyncio
import traceback
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db_connection import AsyncSessionLocal
from app.services.comercial.contactos_crud_service import ContactosCrudService

async def test():
    try:
        async with AsyncSessionLocal() as db:
            svc = ContactosCrudService(db)
            data = {
                'ruc': '20538597121', 
                'telefono': '987654322', 
                'nombre': 'Test', 
                'cargo': 'Sistemas', 
                'correo': 'test@test.com', 
                'is_client': False, 
                'is_principal': True, 
                'origen': 'MANUAL'
            }
            await svc.create_contacto(data)
            print('EXITO')
    except Exception as e:
        print('ERROR:', e)
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
