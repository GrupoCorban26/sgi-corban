-- ============================================================
-- MIGRACIÓN: Corrección de Roles y Permisos del SGI
-- Fecha: 2026-03-12
-- Descripción: Sincroniza la BD con initial_data.py
--   - Crea roles faltantes: GERENCIA, OPERACIONES
--   - Asigna permisos a PRICING (7 permisos)
--   - Asigna permisos a GERENCIA (8 permisos de lectura)
--   - Agrega reportes.ver_general a ADMIN
-- ============================================================

BEGIN TRANSACTION;

-- =========================================================
-- 1. CREAR ROLES FALTANTES
-- =========================================================

-- GERENCIA (si no existe)
IF NOT EXISTS (SELECT 1 FROM seg.roles WHERE nombre = 'GERENCIA')
BEGIN
    INSERT INTO seg.roles (nombre, descripcion, is_active)
    VALUES ('GERENCIA', 'Supervisor de lectura - Acceso global sin escritura', 1);
    PRINT '✅ Rol GERENCIA creado';
END
ELSE
    PRINT '⏭️ Rol GERENCIA ya existe';

-- OPERACIONES (stub, si no existe)
IF NOT EXISTS (SELECT 1 FROM seg.roles WHERE nombre = 'OPERACIONES')
BEGIN
    INSERT INTO seg.roles (nombre, descripcion, is_active)
    VALUES ('OPERACIONES', 'Rol OPERACIONES - Pendiente de implementación', 1);
    PRINT '✅ Rol OPERACIONES creado';
END
ELSE
    PRINT '⏭️ Rol OPERACIONES ya existe';

-- =========================================================
-- 2. ASIGNAR PERMISOS A PRICING (7 permisos)
--    clientes.listar, clientes.crear, clientes.editar,
--    contactos.listar, empleados.listar,
--    reportes.ver_comercial, reportes.ver_general
-- =========================================================
PRINT '';
PRINT '--- Asignando permisos a PRICING ---';

INSERT INTO seg.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM seg.roles r, seg.permisos p
WHERE r.nombre = 'PRICING'
  AND p.nombre_tecnico IN (
      'clientes.listar', 'clientes.crear', 'clientes.editar',
      'contactos.listar',
      'empleados.listar',
      'reportes.ver_comercial', 'reportes.ver_general'
  )
  AND NOT EXISTS (
      SELECT 1 FROM seg.rol_permiso rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

PRINT '✅ Permisos de PRICING asignados';

-- =========================================================
-- 3. ASIGNAR PERMISOS A GERENCIA (8 permisos de lectura)
--    clientes.listar, clientes.ver_todo,
--    contactos.listar,
--    empleados.listar, empleados.ver,
--    usuarios.listar,
--    reportes.ver_comercial, reportes.ver_general
-- =========================================================
PRINT '';
PRINT '--- Asignando permisos a GERENCIA ---';

INSERT INTO seg.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM seg.roles r, seg.permisos p
WHERE r.nombre = 'GERENCIA'
  AND p.nombre_tecnico IN (
      'clientes.listar', 'clientes.ver_todo',
      'contactos.listar',
      'empleados.listar', 'empleados.ver',
      'usuarios.listar',
      'reportes.ver_comercial', 'reportes.ver_general'
  )
  AND NOT EXISTS (
      SELECT 1 FROM seg.rol_permiso rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

PRINT '✅ Permisos de GERENCIA asignados';

-- =========================================================
-- 4. AGREGAR reportes.ver_general A ADMIN (faltante)
-- =========================================================
PRINT '';
PRINT '--- Agregando reportes.ver_general a ADMIN ---';

INSERT INTO seg.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM seg.roles r, seg.permisos p
WHERE r.nombre = 'ADMIN'
  AND p.nombre_tecnico = 'reportes.ver_general'
  AND NOT EXISTS (
      SELECT 1 FROM seg.rol_permiso rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

PRINT '✅ reportes.ver_general agregado a ADMIN';

-- =========================================================
-- 5. VALIDACIÓN POST-MIGRACIÓN
-- =========================================================
PRINT '';
PRINT '=========================================='
PRINT 'VALIDACIÓN POST-MIGRACIÓN'
PRINT '=========================================='

SELECT
    r.nombre AS rol,
    COUNT(rp.permiso_id) AS total_permisos,
    CASE
        WHEN r.nombre = 'SISTEMAS' AND COUNT(rp.permiso_id) = 12 THEN '✅ OK'
        WHEN r.nombre = 'ADMIN' AND COUNT(rp.permiso_id) = 9 THEN '✅ OK'
        WHEN r.nombre = 'JEFE_COMERCIAL' AND COUNT(rp.permiso_id) = 10 THEN '✅ OK'
        WHEN r.nombre = 'COMERCIAL' AND COUNT(rp.permiso_id) = 8 THEN '✅ OK'
        WHEN r.nombre = 'AUDITOR' AND COUNT(rp.permiso_id) = 6 THEN '✅ OK'
        WHEN r.nombre = 'PRICING' AND COUNT(rp.permiso_id) = 7 THEN '✅ OK'
        WHEN r.nombre = 'GERENCIA' AND COUNT(rp.permiso_id) = 8 THEN '✅ OK'
        WHEN r.nombre = 'OPERACIONES' AND COUNT(rp.permiso_id) = 0 THEN '✅ OK (stub)'
        ELSE '❌ REVISAR'
    END AS estado
FROM seg.roles r
LEFT JOIN seg.rol_permiso rp ON r.id = rp.rol_id
WHERE r.is_active = 1
GROUP BY r.nombre
ORDER BY r.nombre;

COMMIT TRANSACTION;
PRINT '';
PRINT '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
