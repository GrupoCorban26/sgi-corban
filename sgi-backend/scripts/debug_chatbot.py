import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.db_connection import engine
from sqlalchemy import text
from app.services.comercial.chatbot_service import ChatbotService
from app.schemas.comercial.whatsapp import WhatsAppIncoming

async def test_backend():
    print("--- Checking DB Table ---")
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'conversation_sessions'"))
            table = result.scalar()
            if table:
                print(f"✅ Table '{table}' exists.")
            else:
                print("❌ Table 'conversation_sessions' NOT found!")
    except Exception as e:
        print(f"❌ DB Check failed: {e}")

    print("\n--- Testing Chatbot Logic ---")
    try:
        # Mock request
        incoming = WhatsAppIncoming(
            from_number="51999999999",
            contact_name="Test User",
            message_type="text",
            message_text="Hola"
        )
        
        # We need a session to pass to ChatbotService
        async with engine.connect() as connection:
             # We need to wrap this in a way compatible with how FastAPI depends works or just instantiate manually
             # ChatbotService expects an AsyncSession
             from sqlalchemy.orm import sessionmaker
             from sqlalchemy.ext.asyncio import AsyncSession
             
             async_session = sessionmaker(
                engine, class_=AsyncSession, expire_on_commit=False
             )
             
             async with async_session() as db:
                service = ChatbotService(db)
                response = await service.process_message(incoming)
                print(f"✅ Logic successful! Actions: {response.action}")
                for msg in response.messages:
                    print(f"   - Response: {msg.type} | {msg.content or msg.body}")

    except Exception as e:
        print(f"❌ Logic failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_backend())
