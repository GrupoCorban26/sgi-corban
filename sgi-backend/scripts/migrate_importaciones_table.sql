-- Script para migrar tabla comercial.registro_importaciones al nuevo formato Excel
-- Ejecutar manualmente en SQL Server Management Studio
-- IMPORTANTE: El sistema hace TRUNCATE al cargar datos, así que no hay pérdida operacional.

-- ============================================
-- 1. ELIMINAR columnas que ya no existen
-- ============================================

-- Columnas a eliminar (ya no están en el nuevo formato)
DECLARE @columns_to_drop TABLE (col_name VARCHAR(50));
INSERT INTO @columns_to_drop VALUES 
    ('anio'), ('aduanas'), ('via_transporte'), ('puertos_embarque'),
    ('embarcadores'), ('agente_aduanas'), ('partida_arancelaria_cod'),
    ('partida_arancelaria_descripcion'), ('fob_min'), ('fob_max'), ('fob_prom'),
    ('fob_anual'), ('total_operaciones'), ('cantidad_agentes'), ('cantidad_paises'),
    ('cantidad_partidas'), ('primera_importacion'), ('ultima_importacion');

DECLARE @col VARCHAR(50), @sql NVARCHAR(200);
DECLARE col_cursor CURSOR FOR SELECT col_name FROM @columns_to_drop;
OPEN col_cursor;
FETCH NEXT FROM col_cursor INTO @col;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('comercial.registro_importaciones') AND name = @col)
    BEGIN
        SET @sql = 'ALTER TABLE comercial.registro_importaciones DROP COLUMN ' + @col;
        EXEC sp_executesql @sql;
        PRINT 'Columna eliminada: ' + @col;
    END
    FETCH NEXT FROM col_cursor INTO @col;
END
CLOSE col_cursor;
DEALLOCATE col_cursor;
GO

-- ============================================
-- 2. AGREGAR nuevas columnas
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('comercial.registro_importaciones') AND name = 'fob_datasur_mundo')
    ALTER TABLE comercial.registro_importaciones ADD fob_datasur_mundo NUMERIC(15,2) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('comercial.registro_importaciones') AND name = 'fob_sunat_china')
    ALTER TABLE comercial.registro_importaciones ADD fob_sunat_china NUMERIC(15,2) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('comercial.registro_importaciones') AND name = 'fob_total_real')
    ALTER TABLE comercial.registro_importaciones ADD fob_total_real NUMERIC(15,2) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('comercial.registro_importaciones') AND name = 'transacciones_datasur')
    ALTER TABLE comercial.registro_importaciones ADD transacciones_datasur INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('comercial.registro_importaciones') AND name = 'partidas_arancelarias')
    ALTER TABLE comercial.registro_importaciones ADD partidas_arancelarias TEXT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('comercial.registro_importaciones') AND name = 'importa_de_china')
    ALTER TABLE comercial.registro_importaciones ADD importa_de_china VARCHAR(10) NULL;
GO

PRINT '✅ Migración completada exitosamente';
GO
