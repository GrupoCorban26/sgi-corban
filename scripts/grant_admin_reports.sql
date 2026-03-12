-- Asignar el permiso de reportes (ID 17 usualmente, pero lo buscamos por nombre) al rol ADMIN
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'ADMIN' 
  AND p.nombre = 'reportes.ver_comercial'
  AND NOT EXISTS (
      SELECT 1 FROM rol_permisos rp 
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );
