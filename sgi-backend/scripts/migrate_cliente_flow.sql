-- ============================================================================
-- SGI-Corban: Migración del Flujo de Estado del Cliente v1.0
-- Ejecutar DESPUÉS de hacer backup de la BD.
-- Script idempotente: se puede ejecutar múltiples veces sin errores.
-- ============================================================================

USE sgi_corban;
GO

PRINT '=== Iniciando migración del flujo de clientes ===';
PRINT '';

-- ============================================================================
-- 1. Modificar tabla comercial.clientes
-- ============================================================================

-- 1.1 Agregar columna sub_origen
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.clientes') AND name = 'sub_origen'
)
BEGIN
    ALTER TABLE comercial.clientes ADD sub_origen NVARCHAR(100) NULL;
    PRINT '  [OK] Columna sub_origen agregada a comercial.clientes';
END
ELSE PRINT '  [SKIP] sub_origen ya existe en comercial.clientes';
GO

-- 1.2 Agregar columna fecha_primer_contacto
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.clientes') AND name = 'fecha_primer_contacto'
)
BEGIN
    ALTER TABLE comercial.clientes ADD fecha_primer_contacto DATETIMEOFFSET NULL;
    PRINT '  [OK] Columna fecha_primer_contacto agregada a comercial.clientes';
END
ELSE PRINT '  [SKIP] fecha_primer_contacto ya existe en comercial.clientes';
GO

-- 1.3 Agregar columna fecha_conversion_cliente
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.clientes') AND name = 'fecha_conversion_cliente'
)
BEGIN
    ALTER TABLE comercial.clientes ADD fecha_conversion_cliente DATETIMEOFFSET NULL;
    PRINT '  [OK] Columna fecha_conversion_cliente agregada a comercial.clientes';
END
ELSE PRINT '  [SKIP] fecha_conversion_cliente ya existe en comercial.clientes';
GO

-- ============================================================================
-- 2. Modificar tabla comercial.inbox
-- ============================================================================

-- 2.1 Agregar columna tiempo_respuesta_minutos
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.inbox') AND name = 'tiempo_respuesta_minutos'
)
BEGIN
    ALTER TABLE comercial.inbox ADD tiempo_respuesta_minutos INT NULL;
    PRINT '  [OK] Columna tiempo_respuesta_minutos agregada a comercial.inbox';
END
ELSE PRINT '  [SKIP] tiempo_respuesta_minutos ya existe en comercial.inbox';
GO

-- 2.2 Agregar columna fecha_primera_respuesta
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.inbox') AND name = 'fecha_primera_respuesta'
)
BEGIN
    ALTER TABLE comercial.inbox ADD fecha_primera_respuesta DATETIMEOFFSET NULL;
    PRINT '  [OK] Columna fecha_primera_respuesta agregada a comercial.inbox';
END
ELSE PRINT '  [SKIP] fecha_primera_respuesta ya existe en comercial.inbox';
GO

-- 2.3 Agregar columna escalado_a_directo
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.inbox') AND name = 'escalado_a_directo'
)
BEGIN
    ALTER TABLE comercial.inbox ADD escalado_a_directo BIT NOT NULL DEFAULT 0;
    PRINT '  [OK] Columna escalado_a_directo agregada a comercial.inbox';
END
ELSE PRINT '  [SKIP] escalado_a_directo ya existe en comercial.inbox';
GO

-- 2.4 Agregar columna fecha_escalacion
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.inbox') AND name = 'fecha_escalacion'
)
BEGIN
    ALTER TABLE comercial.inbox ADD fecha_escalacion DATETIMEOFFSET NULL;
    PRINT '  [OK] Columna fecha_escalacion agregada a comercial.inbox';
END
ELSE PRINT '  [SKIP] fecha_escalacion ya existe en comercial.inbox';
GO

-- ============================================================================
-- 3. Crear tabla comercial.cliente_historial
-- ============================================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'comercial' AND t.name = 'cliente_historial'
)
BEGIN
    CREATE TABLE comercial.cliente_historial (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id INT NOT NULL,
        estado_anterior NVARCHAR(20) NULL,
        estado_nuevo NVARCHAR(20) NOT NULL,
        motivo NVARCHAR(500) NULL,
        origen_cambio NVARCHAR(30) NOT NULL DEFAULT 'MANUAL',
        tiempo_en_estado_anterior INT NULL,
        registrado_por INT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        
        CONSTRAINT FK_cliente_historial_cliente 
            FOREIGN KEY (cliente_id) REFERENCES comercial.clientes(id),
        CONSTRAINT FK_cliente_historial_usuario 
            FOREIGN KEY (registrado_por) REFERENCES seg.usuarios(id)
    );
    
    -- Índices para queries frecuentes
    CREATE INDEX IX_cliente_historial_cliente_id 
        ON comercial.cliente_historial(cliente_id);
    CREATE INDEX IX_cliente_historial_created_at 
        ON comercial.cliente_historial(created_at);
    
    PRINT '  [OK] Tabla comercial.cliente_historial creada con FK e índices';
END
ELSE PRINT '  [SKIP] Tabla comercial.cliente_historial ya existe';
GO

-- ============================================================================
-- 4. Backfill: Asignar origen a clientes existentes
-- ============================================================================

-- 4.1 Los que no tienen origen → CARTERA_PROPIA (existían antes del sistema)
UPDATE comercial.clientes 
SET origen = 'CARTERA_PROPIA' 
WHERE origen IS NULL;
PRINT '  [OK] Clientes sin origen actualizados a CARTERA_PROPIA: ' + CAST(@@ROWCOUNT AS NVARCHAR);
GO

-- 4.2 Unificar BASE_COMERCIAL → BASE_DATOS (valor antiguo del código)
UPDATE comercial.clientes 
SET origen = 'BASE_DATOS' 
WHERE origen = 'BASE_COMERCIAL';
PRINT '  [OK] Clientes con BASE_COMERCIAL unificados a BASE_DATOS: ' + CAST(@@ROWCOUNT AS NVARCHAR);
GO

-- ============================================================================
-- 5. Registrar historial inicial para clientes existentes
-- ============================================================================

-- Solo insertar si el cliente NO tiene ya un historial registrado
INSERT INTO comercial.cliente_historial (cliente_id, estado_anterior, estado_nuevo, motivo, origen_cambio)
SELECT c.id, NULL, c.tipo_estado, 'Registro inicial (migración)', 'SISTEMA'
FROM comercial.clientes c
WHERE NOT EXISTS (
    SELECT 1 FROM comercial.cliente_historial h WHERE h.cliente_id = c.id
);
PRINT '  [OK] Historial inicial creado para clientes existentes: ' + CAST(@@ROWCOUNT AS NVARCHAR);
GO

PRINT '';
PRINT '=== Migración completada exitosamente ===';
GO
