import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db_connection import AsyncSessionLocal
from app.services.comercial.clientes_service import ClientesService
import traceback

async def test():
    try:
        async with AsyncSessionLocal() as db:
            svc = ClientesService(db)
            result = await svc.get_all(page=1, page_size=5)
            for c in result['data']:
                print(f"ID={c['id']}, RUC={c['ruc']}, Telefono={c['telefono']}")
                if c['id'] == 7092:
                    print("--> ESTE ES EL ULTIMO CLIENTE")
    except Exception as e:
        print('ERROR:', e)
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
