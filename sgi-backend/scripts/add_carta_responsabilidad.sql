-- Script para agregar campos de carta de responsabilidad
-- Ejecutar en SQL Server

-- Agregar columnas a la tabla empleado_activo
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.empleado_activo') AND name = 'tiene_carta')
BEGIN
    ALTER TABLE adm.empleado_activo 
    ADD tiene_carta BIT DEFAULT 0,
        fecha_carta DATETIME NULL,
        archivo_carta VARCHAR(200) NULL;
    PRINT 'Columnas de carta de responsabilidad agregadas a adm.empleado_activo';
END
ELSE
BEGIN
    PRINT 'Las columnas ya existen en adm.empleado_activo';
END
GO

PRINT 'Script de carta de responsabilidad ejecutado correctamente';
