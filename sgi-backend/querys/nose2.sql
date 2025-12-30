-- =====================================================
-- STORED PROCEDURES - MÓDULO SEG
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- =====================================================

-- 1. SP Para Crear usuario
CREATE OR ALTER PROCEDURE seg.sp_crear_usuario
    @empleado_id INT,
    @correo_corp NVARCHAR(100),
    @password_hash NVARCHAR(255),
    @roles_json NVARCHAR(MAX), -- Ejemplo: "[1, 2]"
    @created_by INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Validaciones
        IF EXISTS (SELECT 1 FROM seg.usuarios WHERE empleado_id = @empleado_id)
            THROW 50001, 'El empleado ya tiene un usuario asignado.', 1;

        -- Insertar Usuario
        INSERT INTO seg.usuarios (empleado_id, correo_corp, password_hash, created_by)
        VALUES (@empleado_id, @correo_corp, @password_hash, @created_by);

        DECLARE @usuario_id INT = SCOPE_IDENTITY();

        -- Insertar Roles
        INSERT INTO seg.usuarios_roles (usuario_id, rol_id, asignado_por)
        SELECT @usuario_id, value, @created_by
        FROM OPENJSON(@roles_json);

        COMMIT TRANSACTION;

        -- Retornar el usuario recién creado usando el SP de lectura
        EXEC seg.sp_obtener_usuario @id = @usuario_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 2. Para obtener un usuario
CREATE OR ALTER PROCEDURE seg.sp_obtener_usuario
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        u.id,
        u.empleado_id,
        u.correo_corp,
        u.is_active,
        u.is_bloqueado,
        u.debe_cambiar_password,
        (
            SELECT r.id, r.nombre
            FROM seg.roles r
            INNER JOIN seg.usuarios_roles ur ON r.id = ur.rol_id
            WHERE ur.usuario_id = u.id
            FOR JSON PATH
        ) AS roles
    FROM seg.usuarios u
    WHERE u.id = @id
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END;
GO

-- Para actualizar usuario
CREATE OR ALTER PROCEDURE seg.sp_actualizar_usuario
    @id INT,
    @is_active BIT = NULL,
    @is_bloqueado BIT = NULL,
    @roles_json NVARCHAR(MAX) = NULL,
    @updated_by INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Actualizar datos básicos
        UPDATE seg.usuarios
        SET is_active = ISNULL(@is_active, is_active),
            is_bloqueado = ISNULL(@is_bloqueado, is_bloqueado),
            updated_at = GETDATE(),
            updated_by = @updated_by
        WHERE id = @id;

        -- Sincronizar Roles si se envía el JSON
        IF @roles_json IS NOT NULL
        BEGIN
            DELETE FROM seg.usuarios_roles WHERE usuario_id = @id;

            INSERT INTO seg.usuarios_roles (usuario_id, rol_id, asignado_por)
            SELECT @id, value, @updated_by
            FROM OPENJSON(@roles_json);
        END

        COMMIT TRANSACTION;
        EXEC seg.sp_obtener_usuario @id = @id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 4. Para listar usuarios
CREATE OR ALTER PROCEDURE seg.sp_listar_usuarios
    @busqueda NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        u.id,
        u.correo_corp,
        u.is_active,
        e.nombres + ' ' + e.apellido_paterno AS nombre_empleado,
        (SELECT COUNT(*) FROM seg.usuarios_roles WHERE usuario_id = u.id) AS total_roles
    FROM seg.usuarios u
    INNER JOIN adm.empleados e ON u.empleado_id = e.id -- Verifica si es adm o rrhh
    WHERE (@busqueda IS NULL OR u.correo_corp LIKE '%' + @busqueda + '%')
    ORDER BY u.created_at DESC
    FOR JSON PATH;
END;
GO

