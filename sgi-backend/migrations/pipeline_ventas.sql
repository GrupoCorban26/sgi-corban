USE SGI;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'comercial.clientes') AND name = 'motivo_perdida')
BEGIN
    ALTER TABLE comercial.clientes ADD motivo_perdida VARCHAR(50) NULL;
    PRINT 'Columna motivo_perdida agregada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'comercial.clientes') AND name = 'fecha_perdida')
BEGIN
    ALTER TABLE comercial.clientes ADD fecha_perdida DATE NULL;
    PRINT 'Columna fecha_perdida agregada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'comercial.clientes') AND name = 'fecha_reactivacion')
BEGIN
    ALTER TABLE comercial.clientes ADD fecha_reactivacion DATE NULL;
    PRINT 'Columna fecha_reactivacion agregada';
END
GO
