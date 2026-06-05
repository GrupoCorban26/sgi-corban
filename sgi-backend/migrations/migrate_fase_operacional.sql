-- ============================================
-- MIGRACIÓN: Fase Operativa de Seguimientos
-- SGI Grupo Corban
-- Ejecutar en: SQL Server Management Studio
-- Base de datos: SGI_GrupoCorban
-- ============================================

USE SGI_GrupoCorban;
GO

-- ────────────────────────────────────────────
-- 1. Agregar columnas nuevas a comercial.seguimientos
-- ────────────────────────────────────────────

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'seguimientos'
    AND COLUMN_NAME = 'fecha_eta'
)
BEGIN
    ALTER TABLE comercial.seguimientos ADD fecha_eta DATE NULL;
    PRINT '✅ Columna fecha_eta agregada a comercial.seguimientos';
END
ELSE
    PRINT '⏩ Columna fecha_eta ya existe';
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'seguimientos'
    AND COLUMN_NAME = 'contacto_alerta_id'
)
BEGIN
    ALTER TABLE comercial.seguimientos ADD contacto_alerta_id INT NULL;

    ALTER TABLE comercial.seguimientos
    ADD CONSTRAINT FK_seguimientos_contacto_alerta
    FOREIGN KEY (contacto_alerta_id) REFERENCES comercial.cliente_contactos(id);

    PRINT '✅ Columna contacto_alerta_id agregada con FK';
END
ELSE
    PRINT '⏩ Columna contacto_alerta_id ya existe';
GO

-- ────────────────────────────────────────────
-- 2. Agregar columna incoterm a comercial.cotizaciones
-- ────────────────────────────────────────────

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'cotizaciones'
    AND COLUMN_NAME = 'incoterm'
)
BEGIN
    ALTER TABLE comercial.cotizaciones ADD incoterm VARCHAR(10) NULL;
    PRINT '✅ Columna incoterm agregada a comercial.cotizaciones';
END
ELSE
    PRINT '⏩ Columna incoterm ya existe';
GO

-- ────────────────────────────────────────────
-- 3. Crear tabla comercial.documentos_operacionales
-- ────────────────────────────────────────────

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'documentos_operacionales'
)
BEGIN
    CREATE TABLE comercial.documentos_operacionales (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(150) NOT NULL UNIQUE,
        descripcion NVARCHAR(500) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );

    -- Insertar documentos iniciales comunes
    INSERT INTO comercial.documentos_operacionales (nombre, descripcion) VALUES
        (N'Bill of Lading (BL)', N'Conocimiento de embarque marítimo'),
        (N'Factura Comercial (Commercial Invoice)', N'Factura del proveedor/exportador'),
        (N'Packing List', N'Lista de empaque detallada'),
        (N'Certificado de Origen', N'Certificado que acredita el país de origen'),
        (N'Certificado de Seguro', N'Póliza de seguro de la carga'),
        (N'DAM - Declaración Aduanera de Mercancías', N'Declaración ante aduanas'),
        (N'Carta Poder / Endose', N'Poder para representación aduanera'),
        (N'Ficha RUC actualizada', N'Registro tributario del importador'),
        (N'Air Waybill (AWB)', N'Guía aérea para carga aérea'),
        (N'Permisos especiales (SENASA/DIGEMID/etc.)', N'Permisos según tipo de mercancía');

    PRINT '✅ Tabla comercial.documentos_operacionales creada con 10 documentos iniciales';
END
ELSE
    PRINT '⏩ Tabla documentos_operacionales ya existe';
GO

-- ────────────────────────────────────────────
-- 4. Crear tabla comercial.seguimiento_documentos
-- ────────────────────────────────────────────

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'seguimiento_documentos'
)
BEGIN
    CREATE TABLE comercial.seguimiento_documentos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        seguimiento_id INT NOT NULL,
        documento_id INT NOT NULL,
        completado BIT NOT NULL DEFAULT 0,
        fecha_recepcion DATETIMEOFFSET NULL,
        registrado_por INT NULL,
        CONSTRAINT FK_seg_doc_seguimiento FOREIGN KEY (seguimiento_id)
            REFERENCES comercial.seguimientos(id),
        CONSTRAINT FK_seg_doc_documento FOREIGN KEY (documento_id)
            REFERENCES comercial.documentos_operacionales(id),
        CONSTRAINT FK_seg_doc_usuario FOREIGN KEY (registrado_por)
            REFERENCES seg.usuarios(id)
    );

    CREATE INDEX IX_seguimiento_documentos_seg_id
        ON comercial.seguimiento_documentos(seguimiento_id);

    PRINT '✅ Tabla comercial.seguimiento_documentos creada con índices';
END
ELSE
    PRINT '⏩ Tabla seguimiento_documentos ya existe';
GO

-- ────────────────────────────────────────────
-- 5. Crear tabla comercial.seguimiento_alertas_enviadas
-- ────────────────────────────────────────────

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'seguimiento_alertas_enviadas'
)
BEGIN
    CREATE TABLE comercial.seguimiento_alertas_enviadas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        seguimiento_id INT NOT NULL,
        dias_antes_eta INT NOT NULL,
        fecha_envio DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        tipo VARCHAR(30) NOT NULL,
        CONSTRAINT FK_seg_alerta_seguimiento FOREIGN KEY (seguimiento_id)
            REFERENCES comercial.seguimientos(id)
    );

    CREATE INDEX IX_seguimiento_alertas_seg_id
        ON comercial.seguimiento_alertas_enviadas(seguimiento_id);

    PRINT '✅ Tabla comercial.seguimiento_alertas_enviadas creada con índices';
END
ELSE
    PRINT '⏩ Tabla seguimiento_alertas_enviadas ya existe';
GO

-- ────────────────────────────────────────────
-- 6. Verificar que estado en seguimientos es VARCHAR(20)+
-- ────────────────────────────────────────────

DECLARE @max_len INT;
SELECT @max_len = CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'seguimientos'
AND COLUMN_NAME = 'estado';

IF @max_len < 20
BEGIN
    ALTER TABLE comercial.seguimientos ALTER COLUMN estado VARCHAR(20) NOT NULL;
    PRINT '✅ Columna estado ampliada a VARCHAR(20)';
END
ELSE
    PRINT '⏩ Columna estado ya tiene longitud suficiente';
GO

PRINT '';
PRINT '══════════════════════════════════════════════════';
PRINT '  MIGRACIÓN COMPLETADA EXITOSAMENTE';
PRINT '══════════════════════════════════════════════════';
PRINT '';
PRINT 'Tablas nuevas:';
PRINT '  • comercial.documentos_operacionales (catálogo CRUD)';
PRINT '  • comercial.seguimiento_documentos (checklist por embarque)';
PRINT '  • comercial.seguimiento_alertas_enviadas (registro de alertas)';
PRINT '';
PRINT 'Columnas nuevas:';
PRINT '  • comercial.seguimientos.fecha_eta (DATE)';
PRINT '  • comercial.seguimientos.contacto_alerta_id (FK)';
PRINT '  • comercial.cotizaciones.incoterm (VARCHAR 10)';
GO
