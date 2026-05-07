-- ============================================================================
-- MIGRACIÓN: Crear tabla comercial.lotes_contactos y agregar FK en
-- comercial.cliente_contactos
-- Fecha: 2026-05-06
-- ============================================================================
-- PROPÓSITO: Permitir agrupar contactos por lotes de carga (cada upload de
-- Excel genera o se asocia a un lote). Los lotes se pueden activar/desactivar
-- para controlar qué contactos se reparten al hacer "Cargar Base".
-- ============================================================================

BEGIN TRANSACTION;

-- 1. Crear tabla de lotes
IF OBJECT_ID('comercial.lotes_contactos', 'U') IS NULL
BEGIN
    CREATE TABLE comercial.lotes_contactos (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        nombre      NVARCHAR(150)   NOT NULL,
        is_active   BIT             NOT NULL DEFAULT 1,
        created_by  INT             NULL REFERENCES seg.usuarios(id),
        created_at  DATETIME2       NOT NULL DEFAULT GETDATE()
    );

    PRINT 'Tabla comercial.lotes_contactos creada.';
END
ELSE
BEGIN
    PRINT 'Tabla comercial.lotes_contactos ya existe, se omite creación.';
END

-- 2. Agregar columna lote_id a cliente_contactos (si no existe)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('comercial.cliente_contactos')
    AND name = 'lote_id'
)
BEGIN
    ALTER TABLE comercial.cliente_contactos
    ADD lote_id INT NULL REFERENCES comercial.lotes_contactos(id);

    -- Índice para rendimiento en JOINs y filtros
    CREATE INDEX IX_cliente_contactos_lote_id
    ON comercial.cliente_contactos(lote_id);

    PRINT 'Columna lote_id agregada a comercial.cliente_contactos.';
END
ELSE
BEGIN
    PRINT 'Columna lote_id ya existe en comercial.cliente_contactos.';
END

-- 3. Crear "Lote Inicial" y migrar contactos existentes
IF NOT EXISTS (SELECT 1 FROM comercial.lotes_contactos WHERE nombre = 'Lote Inicial')
BEGIN
    INSERT INTO comercial.lotes_contactos (nombre, is_active, created_by)
    VALUES ('Lote Inicial', 1, NULL);

    -- Asignar contactos huérfanos al lote inicial
    DECLARE @lote_inicial_id INT = SCOPE_IDENTITY();

    UPDATE comercial.cliente_contactos
    SET lote_id = @lote_inicial_id
    WHERE lote_id IS NULL;

    PRINT 'Lote Inicial creado y contactos existentes migrados (ID: ' + CAST(@lote_inicial_id AS VARCHAR) + ').';
END
ELSE
BEGIN
    -- Si ya existe el lote, aún así migrar huérfanos
    DECLARE @existing_lote_id INT;
    SELECT @existing_lote_id = id FROM comercial.lotes_contactos WHERE nombre = 'Lote Inicial';

    UPDATE comercial.cliente_contactos
    SET lote_id = @existing_lote_id
    WHERE lote_id IS NULL;

    PRINT 'Contactos huérfanos asignados al Lote Inicial existente.';
END

COMMIT;

PRINT 'Migración completada: sistema de lotes de contactos configurado.';
