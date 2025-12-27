-- =====================================================
-- SCRIPT DE DATOS INICIALES (SEED DATA)
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- =====================================================
-- Este script crea:
-- 1. Cargo, Área y Empleado para el usuario supremo
-- 2. Rol "Administrador" con todos los permisos
-- 3. Usuario supremo: basededatos@grupocorban.pe
-- =====================================================

USE SGI_GrupoCorban;
GO

PRINT '=====================================================';
PRINT 'INICIANDO CARGA DE DATOS INICIALES';
PRINT '=====================================================';
PRINT '';

-- =====================================================
-- 1. CREAR CARGO: Administrador del Sistema
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM rrhh.cargos WHERE nombre = 'Administrador del Sistema')
BEGIN
    INSERT INTO rrhh.cargos (nombre, descripcion, is_active)
    VALUES ('Administrador del Sistema', 'Responsable de la administración técnica del sistema', 1);
    PRINT '✓ Cargo "Administrador del Sistema" creado';
END
ELSE
BEGIN
    PRINT '⚠ Cargo "Administrador del Sistema" ya existe';
END
GO

-- =====================================================
-- 2. CREAR ÁREA: Tecnología
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM rrhh.areas WHERE nombre = 'Tecnología')
BEGIN
    INSERT INTO rrhh.areas (nombre, descripcion, comisiona_ventas, is_active)
    VALUES ('Tecnología', 'Área encargada de sistemas, desarrollo y soporte técnico', 0, 1);
    PRINT '✓ Área "Tecnología" creada';
END
ELSE
BEGIN
    PRINT '⚠ Área "Tecnología" ya existe';
END
GO

-- =====================================================
-- 3. CREAR EMPLEADO: Sistema Base de Datos
-- =====================================================
DECLARE @cargo_id INT = (SELECT id FROM rrhh.cargos WHERE nombre = 'Administrador del Sistema');
DECLARE @area_id INT = (SELECT id FROM rrhh.areas WHERE nombre = 'Tecnología');

IF NOT EXISTS (SELECT 1 FROM rrhh.empleados WHERE codigo_empleado = 'SYS-001')
BEGIN
    INSERT INTO rrhh.empleados (
        codigo_empleado,
        nombres,
        apellido_paterno,
        apellido_materno,
        fecha_nacimiento,
        tipo_documento,
        nro_documento,
        celular,
        email_personal,
        fecha_ingreso,
        activo,
        cargo_id,
        area_id
    )
    VALUES (
        'SYS-001',
        'Branco',
        'Arguedas',
        'Villavicencio',
        '1999-10-10',
        'DNI',
        '74644489',
        '907740534',
        'bm.arguedasv@gmail.com',
        GETDATE(),
        1,
        @cargo_id,
        @area_id
    );
    PRINT '✓ Empleado "Sistema Base de Datos" creado (código: SYS-001)';
END
ELSE
BEGIN
    PRINT '⚠ Empleado con código SYS-001 ya existe';
END
GO

-- =====================================================
-- 4. CREAR ROL: Administrador
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM seg.roles WHERE nombre = 'Administrador')
BEGIN
    INSERT INTO seg.roles (nombre, descripcion, is_active)
    VALUES ('Administrador', 'Acceso total al sistema', 1);
    PRINT '✓ Rol "Administrador" creado';
END
ELSE
BEGIN
    PRINT '⚠ Rol "Administrador" ya existe';
END
GO

-- =====================================================
-- 5. CREAR PERMISOS DEL MÓDULO RRHH
-- =====================================================
DECLARE @permisos_rrhh TABLE (
    nombre_tecnico VARCHAR(100),
    nombre_display NVARCHAR(150),
    descripcion NVARCHAR(300)
);

INSERT INTO @permisos_rrhh VALUES
    ('rrhh.empleados.ver', 'Ver Empleados', 'Permite visualizar la lista y detalles de empleados'),
    ('rrhh.empleados.crear', 'Crear Empleados', 'Permite registrar nuevos empleados en el sistema'),
    ('rrhh.empleados.editar', 'Editar Empleados', 'Permite modificar información de empleados existentes'),
    ('rrhh.empleados.eliminar', 'Eliminar Empleados', 'Permite desactivar empleados del sistema'),
    ('rrhh.areas.ver', 'Ver Áreas', 'Permite visualizar áreas organizacionales'),
    ('rrhh.areas.crear', 'Crear Áreas', 'Permite crear nuevas áreas'),
    ('rrhh.areas.editar', 'Editar Áreas', 'Permite modificar áreas existentes'),
    ('rrhh.cargos.ver', 'Ver Cargos', 'Permite visualizar cargos'),
    ('rrhh.cargos.crear', 'Crear Cargos', 'Permite crear nuevos cargos'),
    ('rrhh.cargos.editar', 'Editar Cargos', 'Permite modificar cargos existentes');

-- Insertar permisos RRHH
INSERT INTO seg.permisos (nombre_tecnico, nombre_display, modulo, descripcion, is_active)
SELECT 
    nombre_tecnico,
    nombre_display,
    'rrhh' as modulo,
    descripcion,
    1 as is_active
FROM @permisos_rrhh p
WHERE NOT EXISTS (
    SELECT 1 FROM seg.permisos WHERE nombre_tecnico = p.nombre_tecnico
);

PRINT '✓ Permisos del módulo RRHH creados/verificados';
GO

-- =====================================================
-- 6. CREAR PERMISOS DEL MÓDULO SEG (Seguridad)
-- =====================================================
DECLARE @permisos_seg TABLE (
    nombre_tecnico VARCHAR(100),
    nombre_display NVARCHAR(150),
    descripcion NVARCHAR(300)
);

INSERT INTO @permisos_seg VALUES
    ('seg.usuarios.ver', 'Ver Usuarios', 'Permite visualizar usuarios del sistema'),
    ('seg.usuarios.crear', 'Crear Usuarios', 'Permite crear nuevos usuarios'),
    ('seg.usuarios.editar', 'Editar Usuarios', 'Permite modificar usuarios existentes'),
    ('seg.usuarios.eliminar', 'Eliminar Usuarios', 'Permite desactivar usuarios'),
    ('seg.roles.ver', 'Ver Roles', 'Permite visualizar roles del sistema'),
    ('seg.roles.crear', 'Crear Roles', 'Permite crear nuevos roles'),
    ('seg.roles.editar', 'Editar Roles', 'Permite modificar roles y asignar permisos'),
    ('seg.permisos.ver', 'Ver Permisos', 'Permite visualizar todos los permisos del sistema');

-- Insertar permisos SEG
INSERT INTO seg.permisos (nombre_tecnico, nombre_display, modulo, descripcion, is_active)
SELECT 
    nombre_tecnico,
    nombre_display,
    'seg' as modulo,
    descripcion,
    1 as is_active
FROM @permisos_seg p
WHERE NOT EXISTS (
    SELECT 1 FROM seg.permisos WHERE nombre_tecnico = p.nombre_tecnico
);

PRINT '✓ Permisos del módulo SEG creados/verificados';
GO

-- =====================================================
-- 7. ASIGNAR TODOS LOS PERMISOS AL ROL ADMINISTRADOR
-- =====================================================
DECLARE @rol_admin_id INT = (SELECT id FROM seg.roles WHERE nombre = 'Administrador');

-- Asignar todos los permisos existentes al rol Administrador
INSERT INTO seg.rol_permiso (rol_id, permiso_id, asignado_en)
SELECT 
    @rol_admin_id,
    p.id,
    GETDATE()
FROM seg.permisos p
WHERE NOT EXISTS (
    SELECT 1 
    FROM seg.rol_permiso rp 
    WHERE rp.rol_id = @rol_admin_id 
    AND rp.permiso_id = p.id
);

DECLARE @permisos_asignados INT = (
    SELECT COUNT(*) 
    FROM seg.rol_permiso 
    WHERE rol_id = @rol_admin_id
);

PRINT '✓ Permisos asignados al rol Administrador: ' + CAST(@permisos_asignados AS VARCHAR(10));
GO

-- =====================================================
-- 8. CREAR USUARIO SUPREMO
-- =====================================================
-- Contraseña: admin1234
-- Hash generado con bcrypt (costo 12):
-- $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqKjfLfW0u

DECLARE @empleado_id INT = (SELECT id FROM rrhh.empleados WHERE codigo_empleado = 'SYS-001');

IF NOT EXISTS (SELECT 1 FROM seg.usuarios WHERE correo_corp = 'basededatos@grupocorban.pe')
BEGIN
    INSERT INTO seg.usuarios (
        empleado_id,
        correo_corp,
        password_hash,
        is_active,
        is_bloqueado,
        debe_cambiar_password
    )
    VALUES (
        @empleado_id,
        'basededatos@grupocorban.pe',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqKjfLfW0u', -- admin1234
        1,
        0,
        0  -- No requerir cambio de contraseña para el usuario supremo
    );
    PRINT '✓ Usuario "basededatos@grupocorban.pe" creado';
    PRINT '  Contraseña inicial: admin1234';
END
ELSE
BEGIN
    PRINT '⚠ Usuario "basededatos@grupocorban.pe" ya existe';
END
GO

-- =====================================================
-- 9. ASIGNAR ROL ADMINISTRADOR AL USUARIO
-- =====================================================
DECLARE @usuario_id INT = (SELECT id FROM seg.usuarios WHERE correo_corp = 'basededatos@grupocorban.pe');
DECLARE @rol_id INT = (SELECT id FROM seg.roles WHERE nombre = 'Administrador');

IF NOT EXISTS (
    SELECT 1 FROM seg.usuarios_roles 
    WHERE usuario_id = @usuario_id AND rol_id = @rol_id
)
BEGIN
    INSERT INTO seg.usuarios_roles (usuario_id, rol_id, asignado_en)
    VALUES (@usuario_id, @rol_id, GETDATE());
    PRINT '✓ Rol "Administrador" asignado al usuario';
END
ELSE
BEGIN
    PRINT '⚠ Usuario ya tiene el rol "Administrador" asignado';
END
GO

-- =====================================================
-- 10. VERIFICACIÓN FINAL
-- =====================================================
PRINT '';
PRINT '=====================================================';
PRINT 'VERIFICACIÓN DE DATOS CREADOS';
PRINT '=====================================================';

-- Contar registros creados
DECLARE @total_cargos INT = (SELECT COUNT(*) FROM rrhh.cargos);
DECLARE @total_areas INT = (SELECT COUNT(*) FROM rrhh.areas);
DECLARE @total_empleados INT = (SELECT COUNT(*) FROM rrhh.empleados);
DECLARE @total_roles INT = (SELECT COUNT(*) FROM seg.roles);
DECLARE @total_permisos INT = (SELECT COUNT(*) FROM seg.permisos);
DECLARE @total_usuarios INT = (SELECT COUNT(*) FROM seg.usuarios);

PRINT 'Cargos: ' + CAST(@total_cargos AS VARCHAR(10));
PRINT 'Áreas: ' + CAST(@total_areas AS VARCHAR(10));
PRINT 'Empleados: ' + CAST(@total_empleados AS VARCHAR(10));
PRINT 'Roles: ' + CAST(@total_roles AS VARCHAR(10));
PRINT 'Permisos: ' + CAST(@total_permisos AS VARCHAR(10));
PRINT 'Usuarios: ' + CAST(@total_usuarios AS VARCHAR(10));

PRINT '';
PRINT '=====================================================';
PRINT '✅ DATOS INICIALES CARGADOS EXITOSAMENTE';
PRINT '=====================================================';
PRINT '';
PRINT 'CREDENCIALES DEL USUARIO SUPREMO:';
PRINT '  Email: bm.arguedasv@gmail.com';
PRINT '  Contraseña: admin1234';
PRINT '  Rol: Administrador';
PRINT '';
PRINT 'Puedes iniciar sesión con estas credenciales.';
PRINT '=====================================================';
GO