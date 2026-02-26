-- Script para agregar columnas de soporte multimedia a comercial.chat_messages
-- Ejecutar manualmente en SQL Server Management Studio

-- Columna tipo_contenido: tipo de contenido del mensaje
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.chat_messages') 
    AND name = 'tipo_contenido'
)
BEGIN
    ALTER TABLE comercial.chat_messages
    ADD tipo_contenido VARCHAR(20) NOT NULL DEFAULT 'text';

    PRINT 'Columna tipo_contenido agregada exitosamente a comercial.chat_messages';
END
ELSE
BEGIN
    PRINT 'La columna tipo_contenido ya existe en comercial.chat_messages';
END
GO

-- Columna media_url: ruta relativa al archivo multimedia descargado
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.chat_messages') 
    AND name = 'media_url'
)
BEGIN
    ALTER TABLE comercial.chat_messages
    ADD media_url VARCHAR(500) NULL;

    PRINT 'Columna media_url agregada exitosamente a comercial.chat_messages';
END
ELSE
BEGIN
    PRINT 'La columna media_url ya existe en comercial.chat_messages';
END
GO
