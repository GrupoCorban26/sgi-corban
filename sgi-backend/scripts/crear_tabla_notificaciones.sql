-- Script para crear la tabla de notificaciones
-- Ejecutar en la PC servidor

-- Crear tabla de notificaciones
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'notificaciones' AND s.name = 'seg')
BEGIN
    CREATE TABLE seg.notificaciones (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo VARCHAR(50) NOT NULL,             -- LEAD_ASIGNADO, LEAD_REASIGNADO, etc.
        titulo NVARCHAR(200) NOT NULL,
        mensaje NVARCHAR(MAX) NULL,
        leida BIT NOT NULL DEFAULT 0,
        url_destino VARCHAR(300) NULL,          -- Ruta frontend para navegar
        datos_extra NVARCHAR(MAX) NULL,         -- JSON con datos adicionales
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_notificaciones_usuario FOREIGN KEY (usuario_id) REFERENCES seg.usuarios(id)
    );

    -- Índice para consultas frecuentes por usuario
    CREATE INDEX IX_notificaciones_usuario_leida ON seg.notificaciones (usuario_id, leida, created_at DESC);
    
    PRINT 'Tabla seg.notificaciones creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La tabla seg.notificaciones ya existe.';
END
GO
