USE SGI_GrupoCorban;
GO

-- ============================================================
-- SCRIPT DE MIGRACIÓN SEGURA - PRODUCCIÓN
-- Preserva TODOS los datos históricos
-- Fecha: 2026-05-14
-- ============================================================

-- ============================================================
-- FASE 1: Crear tabla historial_inbox
-- ============================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES 
               WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'historial_inbox')
BEGIN
    CREATE TABLE comercial.historial_inbox (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inbox_id INT NOT NULL,
        estado_anterior VARCHAR(20) NULL,
        estado VARCHAR(20) NOT NULL,
        motivo_descarte_id INT NULL,
        comentario NVARCHAR(MAX) NULL,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        created_by INT NULL,
        CONSTRAINT FK_historial_inbox_inbox FOREIGN KEY (inbox_id) 
            REFERENCES comercial.inbox(id),
        CONSTRAINT FK_historial_inbox_motivo FOREIGN KEY (motivo_descarte_id) 
            REFERENCES comercial.motivo_descarte_inbox(id),
        CONSTRAINT FK_historial_inbox_usuario FOREIGN KEY (created_by) 
            REFERENCES seg.usuarios(id)
    );
    CREATE NONCLUSTERED INDEX ix_historial_inbox_inbox_id ON comercial.historial_inbox(inbox_id);
    CREATE NONCLUSTERED INDEX ix_historial_inbox_estado ON comercial.historial_inbox(estado);
    PRINT '? FASE 1: Tabla historial_inbox creada.';
END
ELSE
    PRINT '?? FASE 1: historial_inbox ya existe.';
GO
select * from comercial.inbox
-- ============================================================
-- FASE 2: Agregar created_at / updated_at a inbox
-- created_at = fecha_recepcion (preserva fecha original)
-- ============================================================
IF COL_LENGTH('comercial.inbox', 'created_at') IS NULL
BEGIN
    ALTER TABLE comercial.inbox ADD created_at DATETIMEOFFSET NULL;
    
    UPDATE comercial.inbox 
    SET created_at = COALESCE(fecha_recepcion, SYSDATETIMEOFFSET());
    
    ALTER TABLE comercial.inbox ALTER COLUMN created_at DATETIMEOFFSET NOT NULL;
    ALTER TABLE comercial.inbox ADD CONSTRAINT DF_inbox_created_at 
        DEFAULT SYSDATETIMEOFFSET() FOR created_at;
    
    PRINT '? FASE 2a: created_at poblado desde fecha_recepcion.';
END
GO

IF COL_LENGTH('comercial.inbox', 'updated_at') IS NULL
BEGIN
    ALTER TABLE comercial.inbox ADD updated_at DATETIMEOFFSET NULL;
    
    UPDATE comercial.inbox 
    SET updated_at = COALESCE(
        fecha_cierre, fecha_gestion, fecha_asignacion, 
        fecha_recepcion, SYSDATETIMEOFFSET()
    );
    
    ALTER TABLE comercial.inbox ALTER COLUMN updated_at DATETIMEOFFSET NOT NULL;
    ALTER TABLE comercial.inbox ADD CONSTRAINT DF_inbox_updated_at 
        DEFAULT SYSDATETIMEOFFSET() FOR updated_at;
    
    PRINT '? FASE 2b: updated_at poblado.';
END
GO

-- ============================================================
-- FASE 3: Migrar fechas históricas ? historial_inbox
-- ============================================================

-- 3a. Registro de entrada (fecha_recepcion ? BOT o NUEVO)
INSERT INTO comercial.historial_inbox (inbox_id, estado_anterior, estado, created_at)
SELECT i.id, NULL,
    CASE WHEN i.modo = 'BOT' THEN 'BOT' ELSE 'NUEVO' END,
    i.fecha_recepcion
FROM comercial.inbox i
WHERE i.fecha_recepcion IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM comercial.historial_inbox h 
    WHERE h.inbox_id = i.id AND h.estado IN ('BOT', 'NUEVO')
);
PRINT '? FASE 3a: Migrados registros de entrada.';
GO

-- 3b. Registro de asignación (fecha_asignacion ? PENDIENTE)
INSERT INTO comercial.historial_inbox (inbox_id, estado_anterior, estado, created_at)
SELECT i.id,
    CASE WHEN i.modo = 'BOT' THEN 'BOT' ELSE 'NUEVO' END,
    'PENDIENTE',
    i.fecha_asignacion
FROM comercial.inbox i
WHERE i.fecha_asignacion IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM comercial.historial_inbox h 
    WHERE h.inbox_id = i.id AND h.estado = 'PENDIENTE'
);
PRINT '? FASE 3b: Migrados registros de asignación.';
GO

-- 3c. Registro de gestión (fecha_gestion ? EN_GESTION)
INSERT INTO comercial.historial_inbox (inbox_id, estado_anterior, estado, created_at)
SELECT i.id, 'PENDIENTE', 'EN_GESTION', i.fecha_gestion
FROM comercial.inbox i
WHERE i.fecha_gestion IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM comercial.historial_inbox h 
    WHERE h.inbox_id = i.id AND h.estado = 'EN_GESTION'
);
PRINT '? FASE 3c: Migrados registros de gestión.';
GO

-- 3d. Registro de cierre (fecha_cierre ? CERRADO)
INSERT INTO comercial.historial_inbox (inbox_id, estado_anterior, estado, created_at)
SELECT i.id,
    CASE 
        WHEN i.fecha_gestion IS NOT NULL THEN 'EN_GESTION'
        WHEN i.fecha_asignacion IS NOT NULL THEN 'PENDIENTE'
        ELSE 'NUEVO'
    END,
    'CERRADO', i.fecha_cierre
FROM comercial.inbox i
WHERE i.fecha_cierre IS NOT NULL
AND i.estado IN ('CERRADO', 'CONVERTIDO', 'CIERRE')
AND NOT EXISTS (
    SELECT 1 FROM comercial.historial_inbox h 
    WHERE h.inbox_id = i.id AND h.estado = 'CERRADO'
);
PRINT '? FASE 3d: Migrados registros de cierre.';
GO

-- 3e. Registro de descarte (con motivo y comentario)
INSERT INTO comercial.historial_inbox (inbox_id, estado_anterior, estado, 
    motivo_descarte_id, comentario, created_at)
SELECT i.id,
    CASE 
        WHEN i.fecha_gestion IS NOT NULL THEN 'EN_GESTION'
        WHEN i.fecha_asignacion IS NOT NULL THEN 'PENDIENTE'
        ELSE 'NUEVO'
    END,
    'DESCARTADO', i.motivo_descarte_id, i.comentario_descarte,
    COALESCE(i.fecha_cierre, i.fecha_gestion, i.fecha_asignacion, 
             i.fecha_recepcion, SYSDATETIMEOFFSET())
FROM comercial.inbox i
WHERE i.estado = 'DESCARTADO'
AND NOT EXISTS (
    SELECT 1 FROM comercial.historial_inbox h 
    WHERE h.inbox_id = i.id AND h.estado = 'DESCARTADO'
);
PRINT '? FASE 3e: Migrados registros de descarte.';
GO

-- ============================================================
-- FASE 4: Normalizar estados obsoletos
-- ============================================================
UPDATE comercial.inbox SET estado = 'CERRADO' 
WHERE estado IN ('CONVERTIDO', 'CIERRE');
PRINT '? FASE 4: Estados CONVERTIDO/CIERRE ? CERRADO.';
GO

-- ============================================================
-- FASE 5: Renombrar estado ? ultimo_estado
-- ============================================================
IF COL_LENGTH('comercial.inbox', 'estado') IS NOT NULL 
   AND COL_LENGTH('comercial.inbox', 'ultimo_estado') IS NULL
BEGIN
    DECLARE @DC NVARCHAR(128);
    SELECT @DC = dc.name FROM sys.default_constraints dc
    JOIN sys.columns c ON dc.parent_object_id = c.object_id 
        AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID('comercial.inbox') AND c.name = 'estado';
    IF @DC IS NOT NULL EXEC('ALTER TABLE comercial.inbox DROP CONSTRAINT ' + @DC);

    DECLARE @IX NVARCHAR(128);
    SELECT @IX = i.name FROM sys.indexes i
    JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE i.object_id = OBJECT_ID('comercial.inbox') AND c.name = 'estado';
    IF @IX IS NOT NULL EXEC('DROP INDEX ' + @IX + ' ON comercial.inbox');

    EXEC sp_rename 'comercial.inbox.estado', 'ultimo_estado', 'COLUMN';
    ALTER TABLE comercial.inbox ADD CONSTRAINT DF_inbox_ultimo_estado DEFAULT 'BOT' FOR ultimo_estado;
    CREATE NONCLUSTERED INDEX ix_inbox_ultimo_estado ON comercial.inbox(ultimo_estado);
    PRINT '? FASE 5: estado ? ultimo_estado.';
END
GO

-- ============================================================
-- FASE 6: Limpiar conversation_sessions y chat_messages
-- ============================================================
IF COL_LENGTH('comercial.conversation_sessions', 'telefono') IS NOT NULL
BEGIN
    DECLARE @SIX NVARCHAR(128);
    SELECT @SIX = i.name FROM sys.indexes i
    JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE i.object_id = OBJECT_ID('comercial.conversation_sessions') AND c.name = 'telefono';
    IF @SIX IS NOT NULL EXEC('DROP INDEX ' + @SIX + ' ON comercial.conversation_sessions');
    ALTER TABLE comercial.conversation_sessions DROP COLUMN telefono;
    PRINT '? FASE 6a: telefono eliminado de conversation_sessions.';
END
GO

IF COL_LENGTH('comercial.chat_messages', 'telefono') IS NOT NULL
BEGIN
    ALTER TABLE comercial.chat_messages DROP COLUMN telefono;
    PRINT '? FASE 6b: telefono eliminado de chat_messages.';
END
GO

-- ============================================================
-- FASE 7: Eliminar columnas obsoletas de inbox
-- (datos ya migrados a historial_inbox y created_at/updated_at)
-- ============================================================

-- Primero eliminar FK de motivo_descarte
DECLARE @FK NVARCHAR(128);
SELECT @FK = name FROM sys.foreign_keys 
WHERE parent_object_id = OBJECT_ID('comercial.inbox') 
AND name LIKE '%motivo_descarte%';
IF @FK IS NOT NULL EXEC('ALTER TABLE comercial.inbox DROP CONSTRAINT ' + @FK);
GO

IF COL_LENGTH('comercial.inbox', 'mensaje_inicial') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN mensaje_inicial;
IF COL_LENGTH('comercial.inbox', 'modo') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN modo;
IF COL_LENGTH('comercial.inbox', 'fecha_recepcion') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN fecha_recepcion;
IF COL_LENGTH('comercial.inbox', 'fecha_asignacion') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN fecha_asignacion;
IF COL_LENGTH('comercial.inbox', 'fecha_gestion') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN fecha_gestion;
IF COL_LENGTH('comercial.inbox', 'fecha_cierre') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN fecha_cierre;
IF COL_LENGTH('comercial.inbox', 'fecha_escalacion') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN fecha_escalacion;
IF COL_LENGTH('comercial.inbox', 'tiempo_respuesta_segundos') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN tiempo_respuesta_segundos;
IF COL_LENGTH('comercial.inbox', 'ultimo_mensaje_at') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN ultimo_mensaje_at;
IF COL_LENGTH('comercial.inbox', 'ultimo_mensaje_cliente_at') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN ultimo_mensaje_cliente_at;
IF COL_LENGTH('comercial.inbox', 'escalado_a_directo') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN escalado_a_directo;
IF COL_LENGTH('comercial.inbox', 'motivo_descarte_id') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN motivo_descarte_id;
IF COL_LENGTH('comercial.inbox', 'comentario_descarte') IS NOT NULL 
    ALTER TABLE comercial.inbox DROP COLUMN comentario_descarte;
GO

PRINT '? FASE 7: Columnas obsoletas eliminadas.';
GO

-- ============================================================
-- FASE 8: Stored procedure para cálculo de tiempos
-- ============================================================
CREATE OR ALTER PROCEDURE comercial.sp_calcular_tiempos_respuesta
    @fecha_inicio DATE,
    @fecha_fin DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        i.id AS inbox_id, i.asignado_a, i.ultimo_estado,
        h_bot.created_at AS fecha_asignacion,
        h_gestion.created_at AS fecha_primera_respuesta,
        DATEDIFF(SECOND, h_bot.created_at, h_gestion.created_at) AS tiempo_respuesta_segundos
    FROM comercial.inbox i
    OUTER APPLY (
        SELECT TOP 1 created_at FROM comercial.historial_inbox h1
        WHERE h1.inbox_id = i.id AND h1.estado IN ('BOT', 'PENDIENTE')
        ORDER BY h1.created_at DESC
    ) h_bot
    OUTER APPLY (
        SELECT TOP 1 created_at FROM comercial.historial_inbox h2
        WHERE h2.inbox_id = i.id AND h2.estado = 'EN_GESTION'
        ORDER BY h2.created_at ASC
    ) h_gestion
    WHERE i.created_at >= @fecha_inicio AND i.created_at < DATEADD(day, 1, @fecha_fin);
END
GO

PRINT '? FASE 8: Stored procedure creado.';
GO

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
PRINT '========================================';
PRINT '   VERIFICACIÓN DE MIGRACIÓN';
PRINT '========================================';

SELECT 'inbox' AS tabla, COUNT(*) AS total FROM comercial.inbox;
SELECT 'historial_inbox' AS tabla, COUNT(*) AS total FROM comercial.historial_inbox;
SELECT estado, COUNT(*) AS total FROM comercial.historial_inbox GROUP BY estado ORDER BY total DESC;

-- Verificar que created_at se pobló correctamente
SELECT 'inbox_sin_created_at' AS verificacion, 
    COUNT(*) AS total 
FROM comercial.inbox 
WHERE created_at IS NULL;

-- Verificar columnas finales de inbox
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'inbox'
ORDER BY ORDINAL_POSITION;

PRINT '?? MIGRACIÓN COMPLETADA EXITOSAMENTE';
GO

