-- SQL migration script to add logo column to core.empresas
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'core.empresas') AND name = N'logo'
)
BEGIN
    ALTER TABLE core.empresas ADD logo VARCHAR(500) NULL;
    PRINT '✅ Columna "logo" agregada con éxito a la tabla core.empresas.';
END
ELSE
BEGIN
    PRINT 'ℹ️ La columna "logo" ya existe en la tabla core.empresas.';
END
GO
