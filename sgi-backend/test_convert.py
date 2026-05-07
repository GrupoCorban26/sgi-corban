import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.db_connection import AsyncSessionLocal
from app.models.comercial import Cliente, ClienteContacto, LoteContactos
from app.models.comercial_inbox import Inbox
from app.services.comercial.inbox_service import InboxService
from app.services.comercial.clientes_service import ClientesService
import traceback

async def test():
    try:
        async with AsyncSessionLocal() as db:
            # check the latest client
            stmt = select(Cliente).order_by(Cliente.id.desc()).limit(1)
            result = await db.execute(stmt)
            c = result.scalar()
            if c:
                print(f"Latest Client: ID={c.id}, RUC={c.ruc}")
                
                # Check contacts for this RUC
                stmt_c = select(ClienteContacto).where(ClienteContacto.ruc == c.ruc)
                result_c = await db.execute(stmt_c)
                contactos = result_c.scalars().all()
                print(f"Contactos for RUC {c.ruc}: {len(contactos)}")
                for con in contactos:
                    print(f" - Contacto: {con.telefono}, is_principal: {con.is_principal}, is_active: {con.is_active}")
                
                # Check the lead
                stmt_inbox = select(Inbox).order_by(Inbox.id.desc()).limit(1)
                result_i = await db.execute(stmt_inbox)
                i = result_i.scalar()
                print(f"Latest Lead: ID={i.id}, Telefono={i.telefono}, Asignado: {i.asignado_a}")
                
    except Exception as e:
        print('ERROR:', e)
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
