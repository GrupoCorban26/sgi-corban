-- ============================================
-- MIGRACIÓN: ActivoHistorial estados a FK
-- ============================================
-- Cambia estado_anterior y estado_nuevo de texto a FK

USE SGI_GrupoCorban;
GO

-- 1. Agregar nuevas columnas FK (si no existen)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.activo_historial') AND name = 'estado_anterior_id')
BEGIN
    ALTER TABLE adm.activo_historial ADD estado_anterior_id INT;
    PRINT '✓ Columna estado_anterior_id agregada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.activo_historial') AND name = 'estado_nuevo_id')
BEGIN
    ALTER TABLE adm.activo_historial ADD estado_nuevo_id INT;
    PRINT '✓ Columna estado_nuevo_id agregada';
END
GO

-- 2. Migrar datos existentes (si los hay)
UPDATE ah
SET ah.estado_anterior_id = e.id
FROM adm.activo_historial ah
INNER JOIN adm.estado_activo e ON UPPER(ah.estado_anterior) = UPPER(e.nombre)
WHERE ah.estado_anterior_id IS NULL AND ah.estado_anterior IS NOT NULL;
GO

UPDATE ah
SET ah.estado_nuevo_id = e.id
FROM adm.activo_historial ah
INNER JOIN adm.estado_activo e ON UPPER(ah.estado_nuevo) = UPPER(e.nombre)
WHERE ah.estado_nuevo_id IS NULL AND ah.estado_nuevo IS NOT NULL;
GO

-- 3. Agregar constraints FK
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_activo_historial_estado_anterior')
BEGIN
    ALTER TABLE adm.activo_historial 
    ADD CONSTRAINT FK_activo_historial_estado_anterior 
    FOREIGN KEY (estado_anterior_id) REFERENCES adm.estado_activo(id);
    PRINT '✓ FK estado_anterior creada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_activo_historial_estado_nuevo')
BEGIN
    ALTER TABLE adm.activo_historial 
    ADD CONSTRAINT FK_activo_historial_estado_nuevo 
    FOREIGN KEY (estado_nuevo_id) REFERENCES adm.estado_activo(id);
    PRINT '✓ FK estado_nuevo creada';
END
GO

-- 4. Agregar FK para registrado_por -> usuarios (si no existe)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_activo_historial_registrado_por')
BEGIN
    ALTER TABLE adm.activo_historial 
    ADD CONSTRAINT FK_activo_historial_registrado_por 
    FOREIGN KEY (registrado_por) REFERENCES seg.usuarios(id);
    PRINT '✓ FK registrado_por creada';
END
GO

-- 5. Agregar FK para activo_id -> activos (si no existe)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_activo_historial_activo')
BEGIN
    ALTER TABLE adm.activo_historial 
    ADD CONSTRAINT FK_activo_historial_activo 
    FOREIGN KEY (activo_id) REFERENCES adm.activos(id);
    PRINT '✓ FK activo_id creada';
END
GO

-- 6. Agregar FK para empleado_activo_id (si no existe)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_activo_historial_empleado_activo')
BEGIN
    ALTER TABLE adm.activo_historial 
    ADD CONSTRAINT FK_activo_historial_empleado_activo 
    FOREIGN KEY (empleado_activo_id) REFERENCES adm.empleado_activo(id);
    PRINT '✓ FK empleado_activo_id creada';
END
GO

-- 7. Eliminar columnas viejas
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.activo_historial') AND name = 'estado_anterior')
BEGIN
    ALTER TABLE adm.activo_historial DROP COLUMN estado_anterior;
    PRINT '✓ Columna estado_anterior eliminada';
END
GO

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.activo_historial') AND name = 'estado_nuevo')
BEGIN
    ALTER TABLE adm.activo_historial DROP COLUMN estado_nuevo;
    PRINT '✓ Columna estado_nuevo eliminada';
END
GO

PRINT '============================================';
PRINT 'Migración de ActivoHistorial completada.';
PRINT '============================================';
