-- =============================================
-- Migración: conversation_sessions → inbox_id
-- La tabla fue creada con 'telefono' pero el 
-- modelo SQLAlchemy ahora usa 'inbox_id'.
-- =============================================

-- 1. Agregar columna inbox_id
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

    PRINT '✅ Columna inbox_id agregada.';
END
ELSE
    PRINT '⚠️ Columna inbox_id ya existe.';
GO

-- 2. Limpiar sesiones huérfanas
DELETE FROM comercial.conversation_sessions
WHERE inbox_id IS NULL;
PRINT '🗑️ Sesiones huérfanas eliminadas.';
GO

-- 3. Eliminar índice y columna telefono
IF EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'ix_conv_sessions_telefono'
    AND object_id = OBJECT_ID('comercial.conversation_sessions')
)
BEGIN
    DROP INDEX ix_conv_sessions_telefono ON comercial.conversation_sessions;
    PRINT '✅ Índice ix_conv_sessions_telefono eliminado.';
END
GO

IF EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'comercial' 
    AND TABLE_NAME = 'conversation_sessions'
    AND COLUMN_NAME = 'telefono'
)
BEGIN
    ALTER TABLE comercial.conversation_sessions
        DROP COLUMN telefono;
    PRINT '✅ Columna telefono eliminada.';
END
ELSE
    PRINT '⚠️ Columna telefono ya no existe.';
GO
