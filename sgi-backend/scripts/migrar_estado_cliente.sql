-- =============================================================
-- MIGRACIÓN: Renombrar estado 'CLIENTE' → 'CERRADA'
-- Fecha: 2026-03-02
-- Descripción: Actualiza registros existentes con el nuevo 
--              esquema de estados del pipeline.
-- =============================================================

-- 1. Migrar clientes con tipo_estado = 'CLIENTE' → 'CERRADA'
UPDATE clientes 
SET tipo_estado = 'CERRADA', 
    updated_at = GETDATE()
WHERE tipo_estado = 'CLIENTE';

-- 2. Migrar historial (para que el timeline muestre los nombres correctos)
UPDATE cliente_historial 
SET estado_nuevo = 'CERRADA' 
WHERE estado_nuevo = 'CLIENTE';

UPDATE cliente_historial 
SET estado_anterior = 'CERRADA' 
WHERE estado_anterior = 'CLIENTE';

-- 3. Verificación
SELECT tipo_estado, COUNT(*) as total 
FROM clientes 
GROUP BY tipo_estado;

SELECT 'Migración completada exitosamente' as resultado;
