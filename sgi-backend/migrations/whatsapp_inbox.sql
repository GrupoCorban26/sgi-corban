IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'comercial.inbox') AND type in (N'U'))
BEGIN
    CREATE TABLE comercial.inbox (
        id INT IDENTITY(1,1) PRIMARY KEY,
        telefono VARCHAR(20) NOT NULL,
        mensaje_inicial NVARCHAR(MAX),
        nombre_whatsapp NVARCHAR(100),
        asignado_a INT NULL,
        estado VARCHAR(20) DEFAULT 'PENDIENTE' NOT NULL, -- PENDIENTE, CONVERTIDO, DESCARTADO
        fecha_recepcion DATETIME DEFAULT GETDATE(),
        fecha_gestion DATETIME NULL,
        FOREIGN KEY (asignado_a) REFERENCES seg.usuarios(id)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'comercial.inbox') AND name = 'nombre_whatsapp')
BEGIN
    ALTER TABLE comercial.inbox ADD nombre_whatsapp NVARCHAR(100) NULL;
END
GO
