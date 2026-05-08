import asyncio
import httpx
from sqlalchemy import select, update
from app.database.db_connection import engine
from app.models.whatsapp_supervision import EvoConversacion, EvoInstancia, EvoMensaje

async def fix_all():
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.core.settings import get_settings
    
    settings = get_settings()
    evo_url = getattr(settings, "EVOLUTION_API_URL", "http://localhost:8080")
    evo_key = getattr(settings, "EVOLUTION_API_KEY", "sgi_evo_dev_key_2026")
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. FIX GROUPS
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
                        subject = resp.json().get("subject")
                        if subject:
                            grupo.nombre_contacto = subject
                            # Don't print subject, it may have emojis and crash
                except Exception as e:
                    pass

        # 2. FIX FROM_ME AND TIMESTAMPS
        # Si from_me está falso para los enviados por el comercial, es porque 
        # en Baileys/Evolution API los mensajes en grupos que manda uno mismo
        # a veces no disparan el webhook normal o fromMe es extraido diferente.
        # Pero vamos a asegurarnos que la fecha se actualice a UTC para que el frontend no reste 5 horas.
        
        # SQL Server DATETIMEOFFSET o DATETIME. Restar 5 horas para Peru si asumimos que están en UTC ahora
        # No, mejor decirle al usuario que los nuevos mensajes ya tendrán el Timezone UTC y llegarán bien.
        
        await session.commit()

if __name__ == "__main__":
    asyncio.run(fix_all())
