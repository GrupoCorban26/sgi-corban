-- ============================================
-- FIX: Columna is_positive faltante
-- ============================================

USE SGI;
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.casos_llamada') 
    AND name = 'is_positive'
)
BEGIN
    ALTER TABLE comercial.casos_llamada
    ADD is_positive BIT NOT NULL DEFAULT 0;
    
    PRINT 'Columna is_positive creada con éxito.';
END
ELSE
BEGIN
    PRINT 'La columna is_positive ya existe.';
END
GO
