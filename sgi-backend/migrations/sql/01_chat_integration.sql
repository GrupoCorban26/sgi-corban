-- 1. Agregar nuevos campos a la tabla comercial.inbox
ALTER TABLE comercial.inbox 
ADD modo VARCHAR(10) DEFAULT 'BOT' NOT NULL;

ALTER TABLE comercial.inbox 
ADD ultimo_mensaje_at DATETIME2 NULL;

-- Nota: Si tienes restricciones CHECK en el campo "estado" en tu base de datos actual,
-- asegúrate de actualizarlas para soportar los nuevos estados:
-- 'NUEVO', 'PENDIENTE', 'EN_GESTION', 'SEGUIMIENTO', 'COTIZADO', 'CIERRE', 'DESCARTADO'
-- Comando de ejemplo si la restricción se llama CK_inbox_estado (cambia el nombre según corresponda):
-- ALTER TABLE comercial.inbox DROP CONSTRAINT CK_inbox_estado;
-- ALTER TABLE comercial.inbox ADD CONSTRAINT CK_inbox_estado CHECK (estado IN ('NUEVO', 'PENDIENTE', 'EN_GESTION', 'SEGUIMIENTO', 'COTIZADO', 'CIERRE', 'DESCARTADO'));


-- 2. Crear nueva tabla comercial.chat_messages
CREATE TABLE comercial.chat_messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    inbox_id INT NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    direccion VARCHAR(10) NOT NULL,      -- 'ENTRANTE' | 'SALIENTE'
    remitente_tipo VARCHAR(20) NOT NULL, -- 'CLIENTE' | 'COMERCIAL' | 'BOT'
    remitente_id INT NULL,
    contenido NVARCHAR(MAX) NOT NULL,
    whatsapp_msg_id VARCHAR(100) NULL,
    estado_envio VARCHAR(20) DEFAULT 'ENVIADO',
    leido BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_chat_messages_inbox FOREIGN KEY (inbox_id) REFERENCES comercial.inbox(id),
    CONSTRAINT FK_chat_messages_usuarios FOREIGN KEY (remitente_id) REFERENCES seg.usuarios(id)
);

-- 3. Crear índices para optimizar búsquedas (opcional pero recomendado)
CREATE INDEX ix_comercial_chat_messages_id ON comercial.chat_messages (id);
