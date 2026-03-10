-- ============================================================
-- Script de Migración: Crear tabla comercial.leads_web
-- Ejecutar en el servidor de base de datos (SQL Server)
-- Fecha: 2026-03-10
-- Descripción: Tabla para almacenar leads recibidos desde
--              los formularios de contacto de las páginas web
-- ============================================================

-- Verificar que el schema comercial existe
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'comercial')
BEGIN
    EXEC('CREATE SCHEMA comercial')
END
GO

-- Crear tabla leads_web
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'comercial' AND TABLE_NAME = 'leads_web')
BEGIN
    CREATE TABLE comercial.leads_web (
        id INT IDENTITY(1,1) PRIMARY KEY,

        -- Datos del formulario
        nombre NVARCHAR(150) NOT NULL,
        correo NVARCHAR(100) NOT NULL,
        telefono NVARCHAR(20) NOT NULL,
        asunto NVARCHAR(200) NOT NULL,
        mensaje NVARCHAR(MAX) NOT NULL,

        -- Origen
        pagina_origen NVARCHAR(100) NOT NULL,          -- ej: "corbantranslogistic.com"
        servicio_interes NVARCHAR(100) NULL,            -- Opcional

        -- Asignación
        asignado_a INT NULL REFERENCES seg.usuarios(id),
        estado NVARCHAR(20) NOT NULL DEFAULT 'NUEVO',   -- NUEVO, PENDIENTE, EN_GESTION, CONVERTIDO, DESCARTADO

        -- Fechas
        fecha_recepcion DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        fecha_asignacion DATETIMEOFFSET NULL,
        fecha_gestion DATETIMEOFFSET NULL,

        -- Descarte
        motivo_descarte NVARCHAR(100) NULL,
        comentario_descarte NVARCHAR(MAX) NULL,

        -- Notas del comercial
        notas NVARCHAR(MAX) NULL,

        -- Tracking de tiempos
        tiempo_respuesta_segundos INT NULL,
        fecha_primera_respuesta DATETIMEOFFSET NULL,

        -- Conversión
        cliente_convertido_id INT NULL REFERENCES comercial.clientes(id),

        -- Timestamps
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NULL
    );

    -- Índices
    CREATE INDEX IX_leads_web_estado ON comercial.leads_web(estado);
    CREATE INDEX IX_leads_web_asignado_a ON comercial.leads_web(asignado_a);
    CREATE INDEX IX_leads_web_pagina_origen ON comercial.leads_web(pagina_origen);
    CREATE INDEX IX_leads_web_fecha_recepcion ON comercial.leads_web(fecha_recepcion DESC);
    CREATE INDEX IX_leads_web_correo ON comercial.leads_web(correo);

    PRINT '✅ Tabla comercial.leads_web creada exitosamente'
END
ELSE
BEGIN
    PRINT '⚠️ La tabla comercial.leads_web ya existe, no se realizaron cambios'
END
GO
