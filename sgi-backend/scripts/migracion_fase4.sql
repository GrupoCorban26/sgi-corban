-- ==========================================
-- FASE 4: MIGRACIÓN DE DATOS (PROSPECCIÓN)
-- ==========================================

-- 4.1 Migrar lotes_contactos -> lotes
SET IDENTITY_INSERT comercial.lotes ON;

INSERT INTO comercial.lotes (id, nombre_archivo, empresa, estado, created_by, created_at)
SELECT 
    id, 
    nombre AS nombre_archivo, 
    NULL AS empresa,
    CASE WHEN is_active = 1 THEN 'DISPONIBLE' ELSE 'FINALIZADO' END AS estado,
    created_by, 
    created_at
FROM comercial.BKP_lotes_contactos;

SET IDENTITY_INSERT comercial.lotes OFF;
GO

-- 4.2 Migrar cliente_contactos (prospección) -> bases
INSERT INTO comercial.bases (lote_id, ruc, razon_social, sector, paises, telefono, nombre, correo, estado, asignado_a, created_at)
SELECT 
    cc.lote_id,
    cc.ruc,
    ri.razon_social,
    ri.sector,
    ri.paises_principales,
    cc.telefono,
    cc.nombre,
    cc.correo,
    CASE ec.nombre
        WHEN 'DISPONIBLE' THEN 'DISPONIBLE'
        WHEN 'ASIGNADO' THEN 'ASIGNADO'
        WHEN 'EN_GESTION' THEN 'ASIGNADO'
        WHEN 'GESTIONADO' THEN 'GESTIONADO'
        ELSE 'GESTIONADO'
    END AS estado,
    NULL AS asignado_a,
    cc.created_at
FROM comercial.cliente_contactos cc
LEFT JOIN comercial.BKP_registro_importaciones ri ON cc.ruc = ri.ruc
LEFT JOIN comercial.estado_contacto ec ON cc.estado_id = ec.id
WHERE cc.lote_id IS NOT NULL;  -- Solo contactos que vinieron de lotes (prospección)
GO

-- 4.3 Migrar historial_llamadas viejo -> nuevo
-- Solo migrar registros que tengan match en la nueva tabla bases
INSERT INTO comercial.historial_llamadas (base_id, comercial_id, caso_id, comentario, created_at)
SELECT
    b.id AS base_id,
    hl.comercial_id,
    hl.caso_id,
    hl.comentario,
    hl.created_at
FROM comercial.historial_llamadas_OLD hl
INNER JOIN comercial.BKP_cliente_contactos cc ON hl.contacto_id = cc.id
INNER JOIN comercial.bases b ON b.telefono = cc.telefono AND b.ruc = cc.ruc;
GO

-- 4.4 Limpiar cliente_contactos — dejar solo registros CRM
-- Eliminar registros de prospección (los que ya migraron a bases)
-- Mantener solo los que están vinculados a un cliente real
DELETE FROM comercial.cliente_contactos
WHERE cliente_id IS NULL 
  AND ruc NOT IN (SELECT ruc FROM comercial.clientes WHERE ruc IS NOT NULL);
GO
