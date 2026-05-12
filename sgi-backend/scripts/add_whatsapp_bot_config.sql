-- =============================================================
-- Script para crear la tabla whatsapp_bot_config y agregar
-- bot_config_id a inbox y conversation_sessions.
-- Soporta múltiples bots de WhatsApp Business (uno por equipo).
-- =============================================================

-- 1. Crear tabla de configuración de bots
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'whatsapp_bot_config'
)
BEGIN
    CREATE TABLE comercial.whatsapp_bot_config (
        id                  INT IDENTITY(1,1) PRIMARY KEY,
        slug                VARCHAR(50)    NOT NULL UNIQUE,
        nombre_bot          NVARCHAR(100)  NOT NULL,
        jefe_comercial_id   INT            NOT NULL,
        whatsapp_token      VARCHAR(500)   NOT NULL,
        whatsapp_phone_id   VARCHAR(50)    NOT NULL,
        whatsapp_verify_token VARCHAR(100) NOT NULL DEFAULT 'sgi_token_123',
        is_active           BIT            NOT NULL DEFAULT 1,
        created_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at          DATETIME2      NULL,

        CONSTRAINT FK_bot_config_jefe FOREIGN KEY (jefe_comercial_id)
            REFERENCES adm.empleados(id)
    );
    PRINT 'Tabla comercial.whatsapp_bot_config creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La tabla comercial.whatsapp_bot_config ya existe.';
END
GO

-- 2. Agregar bot_config_id a comercial.inbox
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'inbox'
    AND COLUMN_NAME = 'bot_config_id'
)
BEGIN
    ALTER TABLE comercial.inbox
        ADD bot_config_id INT NULL;

    ALTER TABLE comercial.inbox
        ADD CONSTRAINT FK_inbox_bot_config
        FOREIGN KEY (bot_config_id) REFERENCES comercial.whatsapp_bot_config(id);

    PRINT 'Columna bot_config_id agregada a comercial.inbox.';
END
ELSE
BEGIN
    PRINT 'La columna bot_config_id ya existe en comercial.inbox.';
END
GO

-- 3. Agregar bot_config_id a comercial.conversation_sessions
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'conversation_sessions'
    AND COLUMN_NAME = 'bot_config_id'
)
BEGIN
    ALTER TABLE comercial.conversation_sessions
        ADD bot_config_id INT NULL;

    ALTER TABLE comercial.conversation_sessions
        ADD CONSTRAINT FK_session_bot_config
        FOREIGN KEY (bot_config_id) REFERENCES comercial.whatsapp_bot_config(id);

    PRINT 'Columna bot_config_id agregada a comercial.conversation_sessions.';
END
ELSE
BEGIN
    PRINT 'La columna bot_config_id ya existe en comercial.conversation_sessions.';
END
GO

-- =============================================================
-- EJEMPLO: Insertar configuraciones de los dos bots
-- Descomenta y ajusta con los valores reales antes de ejecutar.
-- =============================================================
/*
INSERT INTO comercial.whatsapp_bot_config
    (slug, nombre_bot, jefe_comercial_id, whatsapp_token, whatsapp_phone_id, whatsapp_verify_token)
VALUES
    ('equipo-a', 'Corby', <ID_JEFE_A>, '<TOKEN_APP_A>', '<PHONE_ID_A>', 'sgi_verify_equipo_a'),
    ('equipo-b', 'Corby Logístico', <ID_JEFE_B>, '<TOKEN_APP_B>', '<PHONE_ID_B>', 'sgi_verify_equipo_b');
*/
