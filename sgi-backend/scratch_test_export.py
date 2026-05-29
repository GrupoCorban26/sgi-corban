import asyncio
from datetime import date
from app.database.db_connection import get_db
from app.services.comercial.reportes_service import ReportesLlamadasService

async def test():
    async for session in get_db():
        service = ReportesLlamadasService(session)
        print("Running exportar_reporte_llamadas...")
        try:
            res = await service.exportar_reporte_llamadas(
                fecha_inicio=date(2026, 1, 1),
                fecha_fin=date(2026, 12, 31)
            )
            print("Export returned:", res)
            print("Content-Disposition:", res.headers.get("Content-Disposition"))
        except Exception as e:
            import traceback
            traceback.print_exc()
        break

if __name__ == "__main__":
    asyncio.run(test())
