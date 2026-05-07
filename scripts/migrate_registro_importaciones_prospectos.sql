-- ============================================================================
-- MIGRACIÓN: Reestructurar comercial.registro_importaciones
-- para nuevo formato de Prospectos (generar_prospectos.py v2)
-- Fecha: 2026-05-05
-- ============================================================================
-- NOTA: Como el servicio hace TRUNCATE en cada upload, los datos son efímeros.
--       Se recrea la tabla completa para evitar columnas huérfanas.
-- ============================================================================

BEGIN TRANSACTION;

-- 1. Eliminar tabla actual (datos efímeros, se recargan con cada upload)
IF OBJECT_ID('comercial.registro_importaciones', 'U') IS NOT NULL
BEGIN
    DROP TABLE comercial.registro_importaciones;
END

-- 2. Crear tabla con nueva estructura (formato Prospectos v2)
CREATE TABLE comercial.registro_importaciones (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    ruc                 VARCHAR(11)     NULL,
    razon_social        NVARCHAR(250)   NULL,
    sector              NVARCHAR(500)   NULL,
    score               DECIMAL(5,1)    NULL,
    agentes_distintos   INT             NULL DEFAULT 0,
    total_embarques     INT             NULL,
    meses_activos       INT             NULL,
    fob_promedio        DECIMAL(15,2)   NULL,
    via_predominante    NVARCHAR(50)    NULL,
    paises_principales  NVARCHAR(500)   NULL,
    ultima_importacion  VARCHAR(10)     NULL,   -- formato YYYY-MM-DD
    dias_desde_ultima   INT             NULL
);

-- 3. Índices para rendimiento
CREATE INDEX IX_registro_importaciones_ruc ON comercial.registro_importaciones (ruc);
CREATE INDEX IX_registro_importaciones_score ON comercial.registro_importaciones (score DESC);

COMMIT;

PRINT 'Migración completada: comercial.registro_importaciones reestructurada para Prospectos v2';
