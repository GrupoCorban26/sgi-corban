"""
Migración: Actualizar conversation_sessions para usar inbox_id en vez de telefono.

La tabla fue creada originalmente con 'telefono' pero el modelo SQLAlchemy
ahora usa 'inbox_id' como FK a comercial.inbox.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database.db_connection import engine
from sqlalchemy import text


async def run():
    async with engine.begin() as conn:
        # 1. Agregar columna inbox_id si no existe
        await conn.execute(text("""
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'comercial' 
                AND TABLE_NAME = 'conversation_sessions'
                AND COLUMN_NAME = 'inbox_id'
            )
            BEGIN
                ALTER TABLE comercial.conversation_sessions
                    ADD inbox_id INT NULL;

                ALTER TABLE comercial.conversation_sessions
                    ADD CONSTRAINT FK_conv_sessions_inbox
                    FOREIGN KEY (inbox_id) REFERENCES comercial.inbox(id);

                CREATE INDEX ix_conv_sessions_inbox_id 
                    ON comercial.conversation_sessions(inbox_id);

                PRINT '✅ Columna inbox_id agregada a conversation_sessions.';
            END
            ELSE
            BEGIN
                PRINT '⚠️ Columna inbox_id ya existe.';
            END
        """))

        # 2. Limpiar sesiones huérfanas (ya no son válidas con el esquema viejo)
        await conn.execute(text("""
            DELETE FROM comercial.conversation_sessions
            WHERE inbox_id IS NULL;
            PRINT '🗑️ Sesiones huérfanas eliminadas.';
        """))

        # 3. Eliminar columna telefono si existe (ya no se usa)
        await conn.execute(text("""
            IF EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'comercial' 
                AND TABLE_NAME = 'conversation_sessions'
                AND COLUMN_NAME = 'telefono'
            )
            BEGIN
                -- Primero eliminar el índice si existe
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_conv_sessions_telefono')
                BEGIN
                    DROP INDEX ix_conv_sessions_telefono ON comercial.conversation_sessions;
                END

                ALTER TABLE comercial.conversation_sessions
                    DROP COLUMN telefono;

                PRINT '✅ Columna telefono eliminada de conversation_sessions.';
            END
            ELSE
            BEGIN
                PRINT '⚠️ Columna telefono ya no existe.';
            END
        """))

        print("✅ Migración completada!")


asyncio.run(run())
