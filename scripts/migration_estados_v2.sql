-- =============================================================================
-- MIGRACIÓN: Rediseño de Estados del Pipeline Comercial
-- Fecha: 2026-03-11
-- Descripción:
--   1. Renombrar CARGA_ENTREGADA → EN_OPERACION en comercial.clientes
--   2. Renombrar PERDIDO → CAIDO en comercial.clientes
--   3. Agregar columnas: motivo_caida, fecha_caida, fecha_seguimiento_caida
--   4. Migrar datos existentes de motivo_perdida → motivo_caida
--   5. Actualizar historial de transiciones
-- =============================================================================

-- PASO 1: Verificar datos actuales (ejecutar primero para ver cuántos registros afecta)
SELECT tipo_estado, COUNT(*) as cantidad
FROM comercial.clientes
WHERE tipo_estado IN ('CARGA_ENTREGADA', 'PERDIDO')
GROUP BY tipo_estado;

-- PASO 2: Agregar nuevas columnas para CAIDO
ALTER TABLE comercial.clientes ADD motivo_caida VARCHAR(100) NULL;
ALTER TABLE comercial.clientes ADD fecha_caida DATE NULL;
ALTER TABLE comercial.clientes ADD fecha_seguimiento_caida DATE NULL;

-- PASO 3: Migrar datos de PERDIDO → CAIDO
-- Copiar motivo_perdida a motivo_caida y fecha_perdida a fecha_caida
UPDATE comercial.clientes
SET motivo_caida = motivo_perdida,
    fecha_caida = fecha_perdida,
    fecha_seguimiento_caida = fecha_reactivacion
WHERE tipo_estado = 'PERDIDO';

-- PASO 4: Renombrar estados en la tabla de clientes
UPDATE comercial.clientes
SET tipo_estado = 'EN_OPERACION'
WHERE tipo_estado = 'CARGA_ENTREGADA';

UPDATE comercial.clientes
SET tipo_estado = 'CAIDO'
WHERE tipo_estado = 'PERDIDO';

-- PASO 5: Actualizar historial de transiciones
UPDATE comercial.cliente_historial
SET estado_anterior = 'EN_OPERACION'
WHERE estado_anterior = 'CARGA_ENTREGADA';

UPDATE comercial.cliente_historial
SET estado_nuevo = 'EN_OPERACION'
WHERE estado_nuevo = 'CARGA_ENTREGADA';

UPDATE comercial.cliente_historial
SET estado_anterior = 'CAIDO'
WHERE estado_anterior = 'PERDIDO';

UPDATE comercial.cliente_historial
SET estado_nuevo = 'CAIDO'
WHERE estado_nuevo = 'PERDIDO';

-- PASO 6: Verificar migración
SELECT tipo_estado, COUNT(*) as cantidad
FROM comercial.clientes
GROUP BY tipo_estado
ORDER BY tipo_estado;

SELECT estado_nuevo, COUNT(*) as cantidad
FROM comercial.cliente_historial
GROUP BY estado_nuevo
ORDER BY estado_nuevo;

-- NOTA: Las columnas motivo_perdida, fecha_perdida y fecha_reactivacion
-- se mantienen por retrocompatibilidad. Se pueden eliminar más adelante:
-- ALTER TABLE comercial.clientes DROP COLUMN motivo_perdida;
-- ALTER TABLE comercial.clientes DROP COLUMN fecha_perdida;
-- ALTER TABLE comercial.clientes DROP COLUMN fecha_reactivacion;
