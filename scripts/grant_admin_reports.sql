-- Asignar los permisos necesarios al rol ADMIN (reportes y clientes.listar)
INSERT INTO seg.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM seg.roles r, seg.permisos p
WHERE r.nombre = 'ADMIN' 
  AND p.nombre_tecnico IN ('reportes.ver_comercial', 'clientes.listar')
  AND NOT EXISTS (
      SELECT 1 FROM seg.rol_permiso rp 
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );
