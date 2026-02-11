import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.db_connection import engine
from sqlalchemy import text


async def run():
    async with engine.begin() as conn:
        await conn.execute(text("""
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'conversation_sessions'
            )
            BEGIN
                CREATE TABLE comercial.conversation_sessions (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    telefono VARCHAR(20) NOT NULL,
                    estado VARCHAR(50) NOT NULL DEFAULT 'MENU',
                    datos NVARCHAR(MAX) NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE(),
                    expires_at DATETIME NULL
                );
                CREATE INDEX ix_conv_sessions_telefono ON comercial.conversation_sessions(telefono);
                PRINT '✅ Table comercial.conversation_sessions created!';
            END
            ELSE
            BEGIN
                PRINT '⚠️ Table already exists, skipping.';
            END
        """))
        print("✅ Migration completed!")


asyncio.run(run())
