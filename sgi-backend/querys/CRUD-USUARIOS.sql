-- =====================================================
-- CRUD USUARIOS - Schema seg
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- SQL Server 2025
-- =====================================================

USE SGI_GrupoCorban;
GO

-- #####################################################
-- #  LISTAR USUARIOS                                  #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_listar_usuarios' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_listar_usuarios;
GO

CREATE PROCEDURE seg.usp_listar_usuarios
    @busqueda NVARCHAR(100) = NULL,
    @is_active BIT = NULL,
    @rol_id INT = NULL,
    @page INT = 1,
    @registro_por_pagina INT = 15
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @offset INT = (@page - 1) * @registro_por_pagina;

    SELECT 
        u.id,
        u.empleado_id,
        CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', ISNULL(e.apellido_materno, '')) AS empleado_nombre,
        u.correo_corp,
        u.is_active,
        u.is_bloqueado,
        u.ultimo_acceso,
        u.debe_cambiar_pass,
        u.created_at,
        (
            SELECT STRING_AGG(r.nombre, ', ') 
            FROM seg.usuarios_roles ur
            INNER JOIN seg.roles r ON ur.rol_id = r.id
            WHERE ur.usuario_id = u.id
        ) AS roles,
        COUNT(*) OVER() AS total_registros
    FROM seg.usuarios u
    LEFT JOIN adm.empleados e ON u.empleado_id = e.id
    WHERE 
        (@busqueda IS NULL OR 
            u.correo_corp LIKE '%' + @busqueda + '%' OR
            e.nombres LIKE '%' + @busqueda + '%' OR
            e.apellido_paterno LIKE '%' + @busqueda + '%')
        AND (@is_active IS NULL OR u.is_active = @is_active)
        AND (@rol_id IS NULL OR EXISTS (
            SELECT 1 FROM seg.usuarios_roles ur WHERE ur.usuario_id = u.id AND ur.rol_id = @rol_id
        ))
    ORDER BY u.id DESC
    OFFSET @offset ROWS FETCH NEXT @registro_por_pagina ROWS ONLY;
END;
GO

PRINT '✓ SP seg.usp_listar_usuarios creado';
GO

-- #####################################################
-- #  OBTENER USUARIO POR ID                           #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_obtener_usuario' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_obtener_usuario;
GO

CREATE PROCEDURE seg.usp_obtener_usuario
    @id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.id,
        u.empleado_id,
        CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', ISNULL(e.apellido_materno, '')) AS empleado_nombre,
        u.correo_corp,
        u.is_active,
        u.is_bloqueado,
        u.ultimo_acceso,
        u.debe_cambiar_pass,
        u.intentos_fallidos,
        u.created_at,
        u.updated_at
    FROM seg.usuarios u
    LEFT JOIN adm.empleados e ON u.empleado_id = e.id
    WHERE u.id = @id;

    -- Obtener roles del usuario
    SELECT 
        r.id AS rol_id,
        r.nombre AS rol_nombre
    FROM seg.usuarios_roles ur
    INNER JOIN seg.roles r ON ur.rol_id = r.id
    WHERE ur.usuario_id = @id;
END;
GO

PRINT '✓ SP seg.usp_obtener_usuario creado';
GO

-- #####################################################
-- #  CREAR USUARIO                                    #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_crear_usuario' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_crear_usuario;
GO

CREATE PROCEDURE seg.usp_crear_usuario
    @empleado_id INT,
    @correo_corp NVARCHAR(100),
    @password_hash NVARCHAR(255),
    @created_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el correo no exista
    IF EXISTS (SELECT 1 FROM seg.usuarios WHERE correo_corp = @correo_corp)
    BEGIN
        SELECT 0 AS success, 'El correo corporativo ya está registrado' AS message, NULL AS id;
        RETURN;
    END

    -- Validar que el empleado no tenga usuario
    IF EXISTS (SELECT 1 FROM seg.usuarios WHERE empleado_id = @empleado_id)
    BEGIN
        SELECT 0 AS success, 'El empleado ya tiene un usuario asignado' AS message, NULL AS id;
        RETURN;
    END

    -- Validar que el empleado exista
    IF NOT EXISTS (SELECT 1 FROM adm.empleados WHERE id = @empleado_id AND is_active = 1)
    BEGIN
        SELECT 0 AS success, 'El empleado no existe o no está activo' AS message, NULL AS id;
        RETURN;
    END

    INSERT INTO seg.usuarios (empleado_id, correo_corp, password_hash, debe_cambiar_pass, created_by)
    VALUES (@empleado_id, @correo_corp, @password_hash, 1, @created_by);

    DECLARE @new_id INT = SCOPE_IDENTITY();

    SELECT 1 AS success, 'Usuario creado exitosamente' AS message, @new_id AS id;
END;
GO

PRINT '✓ SP seg.usp_crear_usuario creado';
GO

-- #####################################################
-- #  EDITAR USUARIO                                   #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_editar_usuario' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_editar_usuario;
GO

CREATE PROCEDURE seg.usp_editar_usuario
    @id INT,
    @correo_corp NVARCHAR(100) = NULL,
    @is_active BIT = NULL,
    @debe_cambiar_pass BIT = NULL,
    @is_bloqueado BIT = NULL,
    @updated_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el usuario exista
    IF NOT EXISTS (SELECT 1 FROM seg.usuarios WHERE id = @id)
    BEGIN
        SELECT 0 AS success, 'El usuario no existe' AS message;
        RETURN;
    END

    -- Validar correo único si se está cambiando
    IF @correo_corp IS NOT NULL AND EXISTS (
        SELECT 1 FROM seg.usuarios WHERE correo_corp = @correo_corp AND id != @id
    )
    BEGIN
        SELECT 0 AS success, 'El correo corporativo ya está en uso' AS message;
        RETURN;
    END

    UPDATE seg.usuarios
    SET 
        correo_corp = ISNULL(@correo_corp, correo_corp),
        is_active = ISNULL(@is_active, is_active),
        debe_cambiar_pass = ISNULL(@debe_cambiar_pass, debe_cambiar_pass),
        is_bloqueado = ISNULL(@is_bloqueado, is_bloqueado),
        intentos_fallidos = CASE WHEN @is_bloqueado = 0 THEN 0 ELSE intentos_fallidos END,
        updated_at = GETDATE(),
        updated_by = @updated_by
    WHERE id = @id;

    SELECT 1 AS success, 'Usuario actualizado exitosamente' AS message;
END;
GO

PRINT '✓ SP seg.usp_editar_usuario creado';
GO

-- #####################################################
-- #  DESACTIVAR USUARIO                               #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_desactivar_usuario' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_desactivar_usuario;
GO

CREATE PROCEDURE seg.usp_desactivar_usuario
    @id INT,
    @updated_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM seg.usuarios WHERE id = @id)
    BEGIN
        SELECT 0 AS success, 'El usuario no existe' AS message;
        RETURN;
    END

    UPDATE seg.usuarios
    SET 
        is_active = 0,
        updated_at = GETDATE(),
        updated_by = @updated_by
    WHERE id = @id;

    SELECT 1 AS success, 'Usuario desactivado exitosamente' AS message;
END;
GO

PRINT '✓ SP seg.usp_desactivar_usuario creado';
GO

-- #####################################################
-- #  REACTIVAR USUARIO                                #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_reactivar_usuario' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_reactivar_usuario;
GO

CREATE PROCEDURE seg.usp_reactivar_usuario
    @id INT,
    @updated_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM seg.usuarios WHERE id = @id)
    BEGIN
        SELECT 0 AS success, 'El usuario no existe' AS message;
        RETURN;
    END

    UPDATE seg.usuarios
    SET 
        is_active = 1,
        is_bloqueado = 0,
        intentos_fallidos = 0,
        updated_at = GETDATE(),
        updated_by = @updated_by
    WHERE id = @id;

    SELECT 1 AS success, 'Usuario reactivado exitosamente' AS message;
END;
GO

PRINT '✓ SP seg.usp_reactivar_usuario creado';
GO

-- #####################################################
-- #  LISTAR ROLES (Dropdown)                          #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_listar_roles' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_listar_roles;
GO

CREATE PROCEDURE seg.usp_listar_roles
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        id,
        nombre,
        descripcion
    FROM seg.roles
    WHERE is_active = 1
    ORDER BY nombre;
END;
GO

PRINT '✓ SP seg.usp_listar_roles creado';
GO

-- #####################################################
-- #  LISTAR EMPLEADOS SIN USUARIO                     #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_listar_empleados_sin_usuario' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_listar_empleados_sin_usuario;
GO

CREATE PROCEDURE seg.usp_listar_empleados_sin_usuario
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.id,
        CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', ISNULL(e.apellido_materno, '')) AS nombre_completo,
        e.nro_documento,
        a.nombre AS area_nombre,
        c.nombre AS cargo_nombre
    FROM adm.empleados e
    LEFT JOIN adm.areas a ON e.area_id = a.id
    LEFT JOIN adm.cargos c ON e.cargo_id = c.id
    WHERE e.is_active = 1
        AND NOT EXISTS (SELECT 1 FROM seg.usuarios u WHERE u.empleado_id = e.id)
    ORDER BY e.nombres;
END;
GO

PRINT '✓ SP seg.usp_listar_empleados_sin_usuario creado';
GO

-- #####################################################
-- #  ASIGNAR ROLES A USUARIO                          #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_asignar_roles_usuario' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_asignar_roles_usuario;
GO

CREATE PROCEDURE seg.usp_asignar_roles_usuario
    @usuario_id INT,
    @roles_ids NVARCHAR(MAX), -- Lista separada por comas: '1,2,3'
    @created_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el usuario exista
    IF NOT EXISTS (SELECT 1 FROM seg.usuarios WHERE id = @usuario_id)
    BEGIN
        SELECT 0 AS success, 'El usuario no existe' AS message;
        RETURN;
    END

    -- Eliminar roles actuales
    DELETE FROM seg.usuarios_roles WHERE usuario_id = @usuario_id;

    -- Insertar nuevos roles
    IF @roles_ids IS NOT NULL AND LEN(@roles_ids) > 0
    BEGIN
        INSERT INTO seg.usuarios_roles (usuario_id, rol_id, created_by)
        SELECT @usuario_id, value, @created_by
        FROM STRING_SPLIT(@roles_ids, ',')
        WHERE value IN (SELECT id FROM seg.roles WHERE is_active = 1);
    END

    SELECT 1 AS success, 'Roles asignados exitosamente' AS message;
END;
GO

PRINT '✓ SP seg.usp_asignar_roles_usuario creado';
GO

-- #####################################################
-- #  CAMBIAR PASSWORD                                 #
-- #####################################################
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_cambiar_password' AND schema_id = SCHEMA_ID('seg'))
    DROP PROCEDURE seg.usp_cambiar_password;
GO

CREATE PROCEDURE seg.usp_cambiar_password
    @id INT,
    @password_hash NVARCHAR(255),
    @updated_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM seg.usuarios WHERE id = @id)
    BEGIN
        SELECT 0 AS success, 'El usuario no existe' AS message;
        RETURN;
    END

    UPDATE seg.usuarios
    SET 
        password_hash = @password_hash,
        debe_cambiar_pass = 0,
        updated_at = GETDATE(),
        updated_by = @updated_by
    WHERE id = @id;

    SELECT 1 AS success, 'Contraseña actualizada exitosamente' AS message;
END;
GO

PRINT '✓ SP seg.usp_cambiar_password creado';
GO

PRINT '';
PRINT '=====================================================';
PRINT '✓ TODOS LOS SP DE USUARIOS CREADOS';
PRINT '=====================================================';
GO
