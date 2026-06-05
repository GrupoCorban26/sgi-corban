-- =====================================================
-- FIX: Actualizar CHECK CONSTRAINT chk_seg_estado
-- para incluir los nuevos estados SOLICITUD y CIERRE
-- =====================================================

-- Paso 1: Primero ver la definición actual del constraint
-- (esto es solo informativo, puedes ejecutarlo primero)
SELECT cc.name AS constraint_name, cc.definition 
FROM sys.check_constraints cc 
INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id 
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id 
WHERE s.name = 'comercial' AND t.name = 'seguimientos';

-- Paso 2: Eliminar el constraint viejo
IF EXISTS (
    SELECT 1 FROM sys.check_constraints 
    WHERE name = 'chk_seg_estado' 
    AND parent_object_id = OBJECT_ID('comercial.seguimientos')
)
BEGIN
    ALTER TABLE comercial.seguimientos DROP CONSTRAINT chk_seg_estado;
    PRINT 'Constraint chk_seg_estado eliminado';
END

-- Paso 3: Ahora sí migrar los estados que quedaron pendientes
UPDATE comercial.seguimientos 
SET estado = 'SOLICITUD' 
WHERE estado = 'PROSPECTO';
PRINT 'seguimientos: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' registros migrados PROSPECTO → SOLICITUD';

UPDATE comercial.seguimientos 
SET estado = 'CIERRE' 
WHERE estado = 'CERRADO';
PRINT 'seguimientos: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' registros migrados CERRADO → CIERRE';

-- Paso 4: Recrear el constraint con los NUEVOS estados válidos
ALTER TABLE comercial.seguimientos 
ADD CONSTRAINT chk_seg_estado 
CHECK (estado IN ('SOLICITUD', 'COTIZADO', 'CIERRE', 'EN_OPERACION', 'CARGA_ENTREGADA', 'CAIDO'));
PRINT 'Constraint chk_seg_estado recreado con nuevos estados';

PRINT '✅ Fix de constraint completado exitosamente';
