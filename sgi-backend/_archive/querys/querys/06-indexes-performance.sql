-- ============================================
-- ÍNDICES DE RENDIMIENTO - SGI Backend
-- ============================================
-- Fecha: 2026-01-22
-- Descripción: Índices optimizados para tablas con alto volumen de consultas
-- 
-- IMPORTANTE: Ejecutar en horario de bajo tráfico
-- Los índices pueden tomar varios minutos en tablas grandes (70k+ registros)
-- ============================================

USE SGI;
GO

-- ============================================
-- ÍNDICES PARA comercial.cliente_contactos
-- Tabla con ~70,000 registros
-- ============================================

-- Índice para búsquedas por RUC (muy frecuente)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_cliente_contactos_ruc' AND object_id = OBJECT_ID('comercial.cliente_contactos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_cliente_contactos_ruc 
    ON comercial.cliente_contactos(ruc);
    PRINT 'Índice IX_cliente_contactos_ruc creado.';
END
GO

-- Índice para filtros por estado (DISPONIBLE, ASIGNADO, EN_GESTION, GESTIONADO)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_cliente_contactos_estado' AND object_id = OBJECT_ID('comercial.cliente_contactos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_cliente_contactos_estado 
    ON comercial.cliente_contactos(estado)
    WHERE is_active = 1;
    PRINT 'Índice IX_cliente_contactos_estado creado.';
END
GO

-- Índice para consultas de contactos asignados a un usuario
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_cliente_contactos_asignado' AND object_id = OBJECT_ID('comercial.cliente_contactos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_cliente_contactos_asignado 
    ON comercial.cliente_contactos(asignado_a) 
    WHERE asignado_a IS NOT NULL AND is_active = 1;
    PRINT 'Índice IX_cliente_contactos_asignado creado.';
END
GO

-- Índice para búsquedas por teléfono (validación de duplicados)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_cliente_contactos_telefono' AND object_id = OBJECT_ID('comercial.cliente_contactos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_cliente_contactos_telefono 
    ON comercial.cliente_contactos(telefono);
    PRINT 'Índice IX_cliente_contactos_telefono creado.';
END
GO

-- Índice compuesto para la consulta de asignación de lotes
-- Cubre: estado='DISPONIBLE', is_active=1, ruc NOT IN (...)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_cliente_contactos_asignacion_lote' AND object_id = OBJECT_ID('comercial.cliente_contactos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_cliente_contactos_asignacion_lote 
    ON comercial.cliente_contactos(estado, is_active, is_client) 
    INCLUDE (ruc, asignado_a, fecha_asignacion);
    PRINT 'Índice IX_cliente_contactos_asignacion_lote creado.';
END
GO

-- ============================================
-- ÍNDICES PARA comercial.registro_importaciones
-- Tabla de referencia para filtros de país/partida
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_registro_importaciones_ruc' AND object_id = OBJECT_ID('comercial.registro_importaciones'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_registro_importaciones_ruc 
    ON comercial.registro_importaciones(ruc)
    INCLUDE (razon_social, paises_origen, partida_arancelaria_cod);
    PRINT 'Índice IX_registro_importaciones_ruc creado.';
END
GO

-- ============================================
-- ÍNDICES PARA comercial.clientes
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_clientes_ruc' AND object_id = OBJECT_ID('comercial.clientes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_clientes_ruc 
    ON comercial.clientes(ruc)
    WHERE is_active = 1;
    PRINT 'Índice IX_clientes_ruc creado.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_clientes_comercial' AND object_id = OBJECT_ID('comercial.clientes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_clientes_comercial 
    ON comercial.clientes(comercial_encargado_id)
    WHERE is_active = 1;
    PRINT 'Índice IX_clientes_comercial creado.';
END
GO

-- ============================================
-- ESTADÍSTICAS DE ÍNDICES CREADOS
-- ============================================
SELECT 
    t.name AS tabla,
    i.name AS indice,
    i.type_desc AS tipo,
    i.is_unique AS es_unico,
    STATS_DATE(i.object_id, i.index_id) AS ultima_actualizacion_stats
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'comercial'
  AND i.name IS NOT NULL
  AND i.name LIKE 'IX_%'
ORDER BY t.name, i.name;
GO

PRINT '============================================';
PRINT 'Script de índices ejecutado correctamente.';
PRINT '============================================';
