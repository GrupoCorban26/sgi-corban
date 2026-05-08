import asyncio
import httpx
from sqlalchemy import select
from app.database.db_connection import engine
from app.models.whatsapp_supervision import EvoConversacion, EvoInstancia
from app.core.settings import get_settings

async def fix_groups():
    settings = get_settings()
    evo_url = getattr(settings, "EVOLUTION_API_URL", "http://localhost:8080")
    evo_key = getattr(settings, "EVOLUTION_API_KEY", "sgi_evo_dev_key_2026")
    
    async with engine.begin() as conn:
        # Esto es solo para obtener datos, usaremos session para ORM o text para update directo
        pass
        
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.ext.asyncio import AsyncSession
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(select(EvoConversacion).where(EvoConversacion.es_grupo == True))
        grupos = result.scalars().all()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for grupo in grupos:
                instancia = await session.get(EvoInstancia, grupo.instancia_id)
                if not instancia: continue
                
                try:
                    resp = await client.get(
                        f"{evo_url}/group/findGroupInfos/{instancia.instance_name}",
                        headers={"apikey": evo_key},
                        params={"groupJid": grupo.remote_jid}
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        subject = data.get("subject")
                        if subject:
                            print(f"Grupo {grupo.remote_jid}: {grupo.nombre_contacto} -> {subject}")
                            grupo.nombre_contacto = subject
                    else:
                        print(f"Failed to fetch metadata for {grupo.remote_jid}: {resp.status_code} {resp.text}")
                except Exception as e:
                    print(f"Error fetching group: {e}")
                    
        await session.commit()
        print("Grupos actualizados")

if __name__ == "__main__":
    asyncio.run(fix_groups())
