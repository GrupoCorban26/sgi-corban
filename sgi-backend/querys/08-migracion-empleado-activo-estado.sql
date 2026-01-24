-- ============================================
-- MIGRACIÓN: EmpleadoActivo estados a FK
-- ============================================
-- Cambia estado_al_entregar y estado_al_devolver de texto a FK

USE SGI_GrupoCorban;
GO

-- 1. Agregar nuevas columnas FK (si no existen)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.empleado_activo') AND name = 'estado_entrega_id')
BEGIN
    ALTER TABLE adm.empleado_activo ADD estado_entrega_id INT;
    PRINT '✓ Columna estado_entrega_id agregada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.empleado_activo') AND name = 'estado_devolucion_id')
BEGIN
    ALTER TABLE adm.empleado_activo ADD estado_devolucion_id INT;
    PRINT '✓ Columna estado_devolucion_id agregada';
END
GO

-- 2. Migrar datos existentes (si los hay)
UPDATE ea
SET ea.estado_entrega_id = e.id
FROM adm.empleado_activo ea
INNER JOIN adm.estado_activo e ON UPPER(ea.estado_al_entregar) = UPPER(e.nombre)
WHERE ea.estado_entrega_id IS NULL AND ea.estado_al_entregar IS NOT NULL;
GO

UPDATE ea
SET ea.estado_devolucion_id = e.id
FROM adm.empleado_activo ea
INNER JOIN adm.estado_activo e ON UPPER(ea.estado_al_devolver) = UPPER(e.nombre)
WHERE ea.estado_devolucion_id IS NULL AND ea.estado_al_devolver IS NOT NULL;
GO

-- 3. Agregar constraints FK
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleado_activo_estado_entrega')
BEGIN
    ALTER TABLE adm.empleado_activo 
    ADD CONSTRAINT FK_empleado_activo_estado_entrega 
    FOREIGN KEY (estado_entrega_id) REFERENCES adm.estado_activo(id);
    PRINT '✓ FK estado_entrega creada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleado_activo_estado_devolucion')
BEGIN
    ALTER TABLE adm.empleado_activo 
    ADD CONSTRAINT FK_empleado_activo_estado_devolucion 
    FOREIGN KEY (estado_devolucion_id) REFERENCES adm.estado_activo(id);
    PRINT '✓ FK estado_devolucion creada';
END
GO

-- 4. Agregar FK para asignado_por -> usuarios (si no existe)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleado_activo_asignado_por')
BEGIN
    ALTER TABLE adm.empleado_activo 
    ADD CONSTRAINT FK_empleado_activo_asignado_por 
    FOREIGN KEY (asignado_por) REFERENCES seg.usuarios(id);
    PRINT '✓ FK asignado_por creada';
END
GO

-- 5. Eliminar columnas viejas
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.empleado_activo') AND name = 'estado_al_entregar')
BEGIN
    ALTER TABLE adm.empleado_activo DROP COLUMN estado_al_entregar;
    PRINT '✓ Columna estado_al_entregar eliminada';
END
GO

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.empleado_activo') AND name = 'estado_al_devolver')
BEGIN
    ALTER TABLE adm.empleado_activo DROP COLUMN estado_al_devolver;
    PRINT '✓ Columna estado_al_devolver eliminada';
END
GO

PRINT '============================================';
PRINT 'Migración de EmpleadoActivo completada.';
PRINT '============================================';
