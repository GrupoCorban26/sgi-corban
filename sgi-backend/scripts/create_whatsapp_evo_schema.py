"""
Script para crear el esquema 'whatsapp_evo' y sus tablas en SQL Server.
Ejecutar una sola vez: python scripts/create_whatsapp_evo_schema.py
"""
import asyncio
import sys
import os

# Asegurar que el directorio raíz del backend está en el path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database.db_connection import engine


async def create_schema_and_tables():
    """Crea el esquema whatsapp_evo y las tablas si no existen."""
    
    async with engine.begin() as conn:
        # 1. Crear esquema si no existe
        print("[+] Creando esquema 'whatsapp_evo'...")
        await conn.execute(text("""
            IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'whatsapp_evo')
            BEGIN
                EXEC('CREATE SCHEMA whatsapp_evo')
            END
        """))
        print("   OK - Esquema listo")

        # 2. Tabla: instancias
        print("[+] Creando tabla 'whatsapp_evo.instancias'...")
        await conn.execute(text("""
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
                           WHERE TABLE_SCHEMA = 'whatsapp_evo' AND TABLE_NAME = 'instancias')
            BEGIN
                CREATE TABLE whatsapp_evo.instancias (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    instance_name VARCHAR(100) NOT NULL UNIQUE,
                    instance_id VARCHAR(200) NULL,
                    token VARCHAR(300) NULL,
                    usuario_id INT NOT NULL,
                    telefono VARCHAR(20) NULL,
                    estado VARCHAR(20) NOT NULL DEFAULT 'DESCONECTADO',
                    qr_code TEXT NULL,
                    profile_name NVARCHAR(200) NULL,
                    profile_pic_url VARCHAR(500) NULL,
                    last_seen DATETIME2 NULL,
                    created_at DATETIME2 DEFAULT GETDATE(),
                    created_by INT NULL,
                    CONSTRAINT FK_evo_inst_usuario FOREIGN KEY (usuario_id) 
                        REFERENCES seg.usuarios(id),
                    CONSTRAINT FK_evo_inst_creador FOREIGN KEY (created_by) 
                        REFERENCES seg.usuarios(id)
                );

                CREATE INDEX ix_evo_instancias_usuario ON whatsapp_evo.instancias(usuario_id);
                CREATE INDEX ix_evo_instancias_estado ON whatsapp_evo.instancias(estado);
            END
        """))
        print("   OK - Tabla instancias creada")

        # 3. Tabla: conversaciones
        print("[+] Creando tabla 'whatsapp_evo.conversaciones'...")
        await conn.execute(text("""
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
                           WHERE TABLE_SCHEMA = 'whatsapp_evo' AND TABLE_NAME = 'conversaciones')
            BEGIN
                CREATE TABLE whatsapp_evo.conversaciones (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    instancia_id INT NOT NULL,
                    remote_jid VARCHAR(100) NOT NULL,
                    nombre_contacto NVARCHAR(200) NULL,
                    es_grupo BIT NOT NULL DEFAULT 0,
                    ultimo_mensaje NVARCHAR(MAX) NULL,
                    ultimo_mensaje_at DATETIME2 NULL,
                    mensajes_no_leidos INT NOT NULL DEFAULT 0,
                    updated_at DATETIME2 DEFAULT GETDATE(),
                    CONSTRAINT FK_evo_conv_instancia FOREIGN KEY (instancia_id) 
                        REFERENCES whatsapp_evo.instancias(id) ON DELETE CASCADE
                );

                CREATE INDEX ix_evo_conv_instancia_ultimo 
                    ON whatsapp_evo.conversaciones(instancia_id, ultimo_mensaje_at);
                CREATE INDEX ix_evo_conv_remote_jid 
                    ON whatsapp_evo.conversaciones(remote_jid);
            END
        """))
        print("   OK - Tabla conversaciones creada")

        # 4. Tabla: mensajes
        print("[+] Creando tabla 'whatsapp_evo.mensajes'...")
        await conn.execute(text("""
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
                           WHERE TABLE_SCHEMA = 'whatsapp_evo' AND TABLE_NAME = 'mensajes')
            BEGIN
                CREATE TABLE whatsapp_evo.mensajes (
                    id BIGINT IDENTITY(1,1) PRIMARY KEY,
                    conversacion_id INT NOT NULL,
                    instancia_id INT NOT NULL,
                    message_id VARCHAR(100) NOT NULL,
                    from_me BIT NOT NULL DEFAULT 0,
                    tipo VARCHAR(20) NOT NULL DEFAULT 'text',
                    contenido NVARCHAR(MAX) NULL,
                    media_url VARCHAR(500) NULL,
                    media_mimetype VARCHAR(100) NULL,
                    timestamp DATETIME2 NOT NULL,
                    created_at DATETIME2 DEFAULT GETDATE(),
                    CONSTRAINT FK_evo_msg_conversacion FOREIGN KEY (conversacion_id) 
                        REFERENCES whatsapp_evo.conversaciones(id) ON DELETE CASCADE,
                    CONSTRAINT FK_evo_msg_instancia FOREIGN KEY (instancia_id) 
                        REFERENCES whatsapp_evo.instancias(id)
                );

                CREATE INDEX ix_evo_msg_conv_timestamp 
                    ON whatsapp_evo.mensajes(conversacion_id, timestamp);
                CREATE INDEX ix_evo_msg_instancia 
                    ON whatsapp_evo.mensajes(instancia_id);
                CREATE UNIQUE INDEX ix_evo_msg_message_id 
                    ON whatsapp_evo.mensajes(message_id);
            END
        """))
        print("   OK - Tabla mensajes creada")

    print("\n[OK] Esquema whatsapp_evo configurado correctamente!")
    print("   - whatsapp_evo.instancias")
    print("   - whatsapp_evo.conversaciones") 
    print("   - whatsapp_evo.mensajes")


if __name__ == "__main__":
    asyncio.run(create_schema_and_tables())
