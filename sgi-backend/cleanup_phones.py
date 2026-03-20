import asyncio
import re
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.db_connection import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

# Models with telefono
from app.models.comercial import ClienteContacto
from app.models.lead_web import LeadWeb
from app.models.comercial_session import ConversationSession
from app.models.comercial_inbox import Inbox
from app.models.chat_message import ChatMessage


def clean_phone(phone: str) -> str:
    if not phone:
        return phone
    # Strip everything except digits and '+'
    cleaned = re.sub(r'[^\d+]', '', phone)
    return cleaned

async def process_table(db: AsyncSession, model_class, table_name: str):
    stmt = select(model_class).where(model_class.telefono.is_not(None))
    result = await db.execute(stmt)
    records = result.scalars().all()

    updated_count = 0
    for record in records:
        original = record.telefono
        cleaned = clean_phone(original)
        
        # We also might want to remove existing duplicates after cleaning, 
        # but for now we just clean the strings to avoid future ones and unify the format.
        if original != cleaned:
            record.telefono = cleaned
            updated_count += 1
            
    if updated_count > 0:
        await db.commit()
        print(f"✅ [{table_name}] Updated {updated_count} records.")
    else:
        print(f"✅ [{table_name}] No records needed cleaning.")

async def main():
    async for db in get_db():
        try:
            print("Starting DB phone cleanup...")
            await process_table(db, ClienteContacto, "ClienteContacto")
            await process_table(db, LeadWeb, "LeadWeb")
            await process_table(db, ConversationSession, "ConversationSession")
            await process_table(db, Inbox, "Inbox")
            await process_table(db, ChatMessage, "ChatMessage")
            print("🎉 Optimization Complete!")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            break

if __name__ == "__main__":
    asyncio.run(main())
