-- =============================================
-- Tabla: core.dias_no_laborables
-- Propósito: Almacenar días no laborables personalizados
-- para el cálculo de SLA del buzón de WhatsApp.
-- =============================================

IF NOT EXISTS (
    SELECT * FROM sys.tables t 
    JOIN sys.schemas s ON t.schema_id = s.schema_id 
    WHERE s.name = 'core' AND t.name = 'dias_no_laborables'
)
BEGIN
    CREATE TABLE core.dias_no_laborables (
        id INT IDENTITY(1,1) PRIMARY KEY,
        fecha DATE NOT NULL,
        descripcion NVARCHAR(150) NULL,
        created_by INT NULL REFERENCES seg.usuarios(id),
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );

    -- Índice único en fecha (evita duplicados)
    CREATE UNIQUE INDEX uq_dias_no_laborables_fecha 
        ON core.dias_no_laborables(fecha);

    PRINT '✅ Tabla core.dias_no_laborables creada correctamente';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla core.dias_no_laborables ya existe';
END
GO
