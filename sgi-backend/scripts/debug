import asyncio
from app.database.session import AsyncSessionLocal
from app.services.comercial.clientes_service import ClientesService
import traceback

async def test_archivar():
    async with AsyncSessionLocal() as db:
        service = ClientesService(db)
        # Reemplazamos momentáneamente el manejo de errores para forzar que el traceback salga a consola
        original_archivar = service.archivar
        
        print("Testing archivar on client 746...")
        result = await service.archivar(746, 1)
        print("Result:", result)

if __name__ == "__main__":
    asyncio.run(test_archivar())
