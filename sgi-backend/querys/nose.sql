USE SGI_GrupoCorban;
GO

INSERT INTO seg.permisos (nombre_tecnico, nombre_display, modulo) VALUES 
-- Áreas
('adm.area.ver', 'Listar Áreas', 'adm'),
('adm.area.crear', 'Crear Áreas', 'adm'),
('adm.area.editar', 'Editar Áreas', 'adm'),
('adm.area.borrar', 'Desactivar Áreas', 'adm'),

-- Cargos
('adm.cargo.ver', 'Listar Cargos', 'adm'),
('adm.cargo.crear', 'Crear Cargos', 'adm'),
('adm.cargo.editar', 'Editar Cargos', 'adm'),
('adm.cargo.borrar', 'Desactivar Cargos', 'adm'),

-- Empleados
('adm.empleado.ver', 'Ver Personal', 'adm'),
('adm.empleado.crear', 'Registrar Empleados', 'adm'),
('adm.empleado.editar', 'Actualizar Empleados', 'adm'),
('adm.empleado.borrar', 'Dar de Baja Personal', 'adm'),

-- Usuarios
('seg.usuario.ver', 'Ver Usuarios del Sistema', 'seg'),
('seg.usuario.crear', 'Crear Cuentas de Acceso', 'seg'),
('seg.usuario.editar', 'Gestionar Cuentas', 'seg'),
('seg.usuario.borrar', 'Eliminar Usuarios', 'seg'),
('seg.usuario.password', 'Resetear Contraseñas', 'seg');
GO