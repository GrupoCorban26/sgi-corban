-- ============================================================
-- Migration: Unificación Cartera/Seguimiento
-- Fecha: 2026-06-04
-- Descripción:
--   1. Hace nullable cliente_id en comercial.seguimientos
--   2. Agrega columnas temporales de prospecto
--   3. Migra estados: PROSPECTO→SOLICITUD, CERRADO→CIERRE
-- ============================================================

-- ── 1. Hacer nullable cliente_id ──
-- SQL Server no tiene IF para ALTER COLUMN nullable, pero ALTER COLUMN es idempotente
-- si ya es nullable no causa error.
IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'comercial'
      AND TABLE_NAME   = 'seguimientos'
      AND COLUMN_NAME  = 'cliente_id'
      AND IS_NULLABLE   = 'NO'
)
BEGIN
    ALTER TABLE comercial.seguimientos
        ALTER COLUMN cliente_id INT NULL;
    PRINT 'cliente_id cambiado a nullable';
END
ELSE
BEGIN
    PRINT 'cliente_id ya es nullable — sin cambios';
END
GO

-- ── 2. Agregar columnas temporales de prospecto ──

IF COL_LENGTH('comercial.seguimientos', 'temp_cliente_nombre') IS NULL
BEGIN
    ALTER TABLE comercial.seguimientos
        ADD temp_cliente_nombre NVARCHAR(150) NULL;
    PRINT 'Columna temp_cliente_nombre agregada';
END
GO

IF COL_LENGTH('comercial.seguimientos', 'temp_cliente_ruc') IS NULL
BEGIN
    ALTER TABLE comercial.seguimientos
        ADD temp_cliente_ruc VARCHAR(20) NULL;
    PRINT 'Columna temp_cliente_ruc agregada';
END
GO

IF COL_LENGTH('comercial.seguimientos', 'temp_cliente_contacto') IS NULL
BEGIN
    ALTER TABLE comercial.seguimientos
        ADD temp_cliente_contacto NVARCHAR(100) NULL;
    PRINT 'Columna temp_cliente_contacto agregada';
END
GO

IF COL_LENGTH('comercial.seguimientos', 'temp_cliente_correo') IS NULL
BEGIN
    ALTER TABLE comercial.seguimientos
        ADD temp_cliente_correo NVARCHAR(100) NULL;
    PRINT 'Columna temp_cliente_correo agregada';
END
GO

IF COL_LENGTH('comercial.seguimientos', 'temp_cliente_telefono') IS NULL
BEGIN
    ALTER TABLE comercial.seguimientos
        ADD temp_cliente_telefono VARCHAR(30) NULL;
    PRINT 'Columna temp_cliente_telefono agregada';
END
GO

-- ── 3. Migrar estados en comercial.seguimientos ──

UPDATE comercial.seguimientos
SET estado = 'SOLICITUD'
WHERE estado = 'PROSPECTO';
PRINT CONCAT('seguimientos: ', @@ROWCOUNT, ' registros migrados PROSPECTO → SOLICITUD');

UPDATE comercial.seguimientos
SET estado = 'CIERRE'
WHERE estado = 'CERRADO';
PRINT CONCAT('seguimientos: ', @@ROWCOUNT, ' registros migrados CERRADO → CIERRE');
GO

-- ── 4. Migrar estados en comercial.seguimiento_historial ──

UPDATE comercial.seguimiento_historial
SET estado_anterior = 'SOLICITUD'
WHERE estado_anterior = 'PROSPECTO';
PRINT CONCAT('historial.estado_anterior: ', @@ROWCOUNT, ' registros migrados PROSPECTO → SOLICITUD');

UPDATE comercial.seguimiento_historial
SET estado_nuevo = 'SOLICITUD'
WHERE estado_nuevo = 'PROSPECTO';
PRINT CONCAT('historial.estado_nuevo: ', @@ROWCOUNT, ' registros migrados PROSPECTO → SOLICITUD');

UPDATE comercial.seguimiento_historial
SET estado_anterior = 'CIERRE'
WHERE estado_anterior = 'CERRADO';
PRINT CONCAT('historial.estado_anterior: ', @@ROWCOUNT, ' registros migrados CERRADO → CIERRE');

UPDATE comercial.seguimiento_historial
SET estado_nuevo = 'CIERRE'
WHERE estado_nuevo = 'CERRADO';
PRINT CONCAT('historial.estado_nuevo: ', @@ROWCOUNT, ' registros migrados CERRADO → CIERRE');
GO

PRINT '✅ Migración de unificación Cartera/Seguimiento completada exitosamente.';
GO
