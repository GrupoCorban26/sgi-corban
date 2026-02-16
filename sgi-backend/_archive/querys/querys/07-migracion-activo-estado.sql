-- ============================================
-- MIGRACIÓN: Activo.estado_fisico -> estado_id
-- ============================================
-- Ejecutar en SGI_GrupoCorban

USE SGI_GrupoCorban;
GO

-- 1. Agregar columna nueva (si no existe)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.activos') AND name = 'estado_id')
BEGIN
    ALTER TABLE adm.activos ADD estado_id INT;
    PRINT '✓ Columna estado_id agregada';
END
GO

-- 2. Migrar datos existentes (mapear texto a ID)
-- Primero asegúrate de tener los estados en la tabla
IF NOT EXISTS (SELECT * FROM adm.estado_activo WHERE nombre = 'BUENO')
    INSERT INTO adm.estado_activo (nombre, descripcion) VALUES ('BUENO', 'Activo en buen estado');
IF NOT EXISTS (SELECT * FROM adm.estado_activo WHERE nombre = 'REGULAR')
    INSERT INTO adm.estado_activo (nombre, descripcion) VALUES ('REGULAR', 'Activo con desgaste normal');
IF NOT EXISTS (SELECT * FROM adm.estado_activo WHERE nombre = 'MALOGRADO')
    INSERT INTO adm.estado_activo (nombre, descripcion) VALUES ('MALOGRADO', 'Activo dañado o inoperativo');
IF NOT EXISTS (SELECT * FROM adm.estado_activo WHERE nombre = 'EN_REPARACION')
    INSERT INTO adm.estado_activo (nombre, descripcion) VALUES ('EN_REPARACION', 'Activo en proceso de reparación');
IF NOT EXISTS (SELECT * FROM adm.estado_activo WHERE nombre = 'DADO_DE_BAJA')
    INSERT INTO adm.estado_activo (nombre, descripcion) VALUES ('DADO_DE_BAJA', 'Activo retirado del inventario');
GO

-- 3. Actualizar estado_id basado en estado_fisico existente
UPDATE a
SET a.estado_id = e.id
FROM adm.activos a
INNER JOIN adm.estado_activo e ON UPPER(a.estado_fisico) = UPPER(e.nombre)
WHERE a.estado_id IS NULL AND a.estado_fisico IS NOT NULL;
GO

-- 4. Establecer BUENO como default para los que no tenían estado
UPDATE adm.activos 
SET estado_id = (SELECT TOP 1 id FROM adm.estado_activo WHERE nombre = 'BUENO')
WHERE estado_id IS NULL;
GO

-- 5. (Opcional) Agregar constraint FK
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_activos_estado')
BEGIN
    ALTER TABLE adm.activos 
    ADD CONSTRAINT FK_activos_estado FOREIGN KEY (estado_id) REFERENCES adm.estado_activo(id);
    PRINT '✓ FK_activos_estado creada';
END
GO

-- 6. (Opcional) Eliminar columna vieja después de verificar
-- ALTER TABLE adm.activos DROP COLUMN estado_fisico;
-- PRINT '✓ Columna estado_fisico eliminada';

PRINT '============================================';
PRINT 'Migración completada.';
PRINT 'Ahora puedes usar: activo.estado y estado.activos';
PRINT '============================================';
