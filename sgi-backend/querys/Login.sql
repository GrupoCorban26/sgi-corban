exec seg.sp_obtener_usuario_login @correo_corp = 'basededatos@grupocorban.pe'
go


CREATE OR ALTER PROCEDURE seg.sp_obtener_usuario_login
    @correo_corp NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar existencia del usuario
    IF NOT EXISTS (SELECT 1 FROM seg.usuarios WHERE correo_corp = @correo_corp AND is_active = 1)
    BEGIN
        RAISERROR('Usuario no encontrado o inactivo', 16, 1);
        RETURN;
    END

    -- Retornar info completa: Usuario + Empleado + Roles + Permisos
    SELECT 
        u.id AS usuario_id,
        e.id AS empleado_id,
        u.password_hash,
        u.is_bloqueado,
        u.debe_cambiar_password,
        CONCAT(e.nombres, ' ', e.apellido_paterno) AS nombre_corto,
        (
            SELECT r.nombre
            FROM seg.roles r
            INNER JOIN seg.usuarios_roles ur ON r.id = ur.rol_id
            WHERE ur.usuario_id = u.id AND r.is_active = 1
            FOR JSON PATH
        ) AS roles,
        (
            SELECT DISTINCT p.nombre_tecnico
            FROM seg.permisos p
            INNER JOIN seg.rol_permiso rp ON p.id = rp.permiso_id
            INNER JOIN seg.usuarios_roles ur ON rp.rol_id = ur.rol_id
            WHERE ur.usuario_id = u.id AND p.is_active = 1
            FOR JSON PATH
        ) AS permisos
    FROM seg.usuarios u
    INNER JOIN adm.empleados e ON u.empleado_id = e.id
    WHERE u.correo_corp = @correo_corp
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END
GO

-- Para inicio de sesion

CREATE OR ALTER PROCEDURE seg.sp_registrar_exito_login
    @usuario_id INT,
    @ip_address VARCHAR(45) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE seg.usuarios
    SET ultimo_acceso = GETDATE(),
        intentos_fallidos = 0,
        updated_at = GETDATE()
    WHERE id = @usuario_id;

    -- Opcional: Insertar en log de acceso si creaste la tabla que sugerí antes
    -- INSERT INTO seg.logs_acceso (usuario_id, fecha_ingreso, exitoso, ip_address)
    -- VALUES (@usuario_id, GETDATE(), 1, @ip_address);
END
GO

-- Para cerrar sesion

CREATE OR ALTER PROCEDURE seg.sp_crear_sesion
    @usuario_id INT,
    @refresh_token NVARCHAR(500),
    @user_agent NVARCHAR(255) = NULL,
    @ip_address VARCHAR(45) = NULL,
    @expira_en DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO seg.sesiones (usuario_id, refresh_token, user_agent, ip_address, expira_en)
    VALUES (@usuario_id, @refresh_token, @user_agent, @ip_address, @expira_en);

    SELECT SCOPE_IDENTITY() AS sesion_id;
END
GO

ALTER ROLE [db_datareader] ADD MEMBER UsuarioGeneral;
ALTER ROLE [db_datawriter] ADD MEMBER UsuarioGeneral;
GO

GRANT EXECUTE TO UsuarioGeneral; 
GO
