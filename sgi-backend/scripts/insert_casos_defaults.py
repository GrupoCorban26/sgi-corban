import asyncio
from sqlalchemy import text
from app.database.db_connection import get_db

CASOS = [
    {"nombre": "Interesado", "contestado": 1},
    {"nombre": "Volver a llamar", "contestado": 1},
    {"nombre": "No Interesado", "contestado": 1},
    {"nombre": "Número Equivocado", "contestado": 1},
    {"nombre": "Ya es cliente", "contestado": 1},
    {"nombre": "Cita Agendada", "contestado": 1},
    {"nombre": "No contesta", "contestado": 0},
    {"nombre": "Buzón de voz", "contestado": 0},
    {"nombre": "Apagado / Fuera de servicio", "contestado": 0},
    {"nombre": "Colgó", "contestado": 0},
    {"nombre": "Línea ocupada", "contestado": 0},
]

async def seed_casos():
    print("Iniciando seed de Casos Llamada (RAW SQL)...")
    async for db in get_db():
        # Limpiar tabla antes si se desea? No, mejor solo insertar si no existe.
        # Pero usuario dijo "no me salen las opciones", asumo tabla vacia.
        # Usaremos INSERT.
        try:
            for data in CASOS:
                # SQL Server syntax for bit/boolean is 1/0
                query = text("INSERT INTO comercial.casos_llamada (nombre, contestado) VALUES (:nombre, :contestado)")
                await db.execute(query, data)
            
            await db.commit()
            print(f"Insertados {len(CASOS)} casos.")
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(seed_casos())
