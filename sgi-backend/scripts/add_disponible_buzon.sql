-- Script para agregar columna disponible_buzon a la tabla seg.usuarios
-- Ejecutar manualmente en SQL Server Management Studio

-- Verificar si la columna ya existe antes de agregarla
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('seg.usuarios') 
    AND name = 'disponible_buzon'
)
BEGIN
    ALTER TABLE seg.usuarios
    ADD disponible_buzon BIT NOT NULL DEFAULT 1;
    
    PRINT 'Columna disponible_buzon agregada exitosamente a seg.usuarios';
END
ELSE
BEGIN
    PRINT 'La columna disponible_buzon ya existe en seg.usuarios';
END
GO
