USE SGI_GrupoCorban
GO

/* 1. LISTAR DEPARTAMENTOS (CON JOIN AL RESPONSABLE) */
CREATE OR ALTER PROCEDURE adm.usp_listar_departamentos
    @busqueda NVARCHAR(100) = NULL,
    @page INT=1,
    @registro_por_pagina INT=15
    -- Eliminamos @total_de_filas de aquí porque lo calcularemos dentro
AS
BEGIN
    SET NOCOUNT ON;

    WITH Resultado AS (
        SELECT d.id, d.nombre, d.descripcion,
               ISNULL(e.nombres + ' ' + e.apellido_paterno, 'Sin asignar') AS responsable_name,
               d.created_at
        FROM adm.departamentos d
        LEFT JOIN adm.empleados e ON d.responsable_id = e.id
        WHERE (@busqueda IS NULL OR d.nombre LIKE '%' + @busqueda + '%')
    )
    SELECT *, (SELECT COUNT(*) FROM Resultado) AS TotalRegistros 
    FROM Resultado
    ORDER BY id
    OFFSET (@page - 1) * @registro_por_pagina ROWS 
    FETCH NEXT @registro_por_pagina ROWS ONLY;
END
GO

/* 2. EDITAR DEPARTAMENTO (CON VALIDACIÓN DE DUPLICADO) */
CREATE or ALTER PROCEDURE adm.usp_editar_departamento
    @Id bigint,
    @Nombre NVARCHAR(100),
    @Descripcion NVARCHAR(500) = NULL,
    @Responsable_id int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validar que el ID exista
        IF NOT EXISTS (SELECT 1 FROM adm.departamentos WHERE id = @Id)
        BEGIN
            RAISERROR('El departamento no existe.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Validar que el nuevo nombre no lo tenga OTRO departamento
        IF EXISTS (SELECT 1 FROM adm.departamentos WHERE nombre = @Nombre AND id <> @Id AND is_active = 1)
        BEGIN
            RAISERROR('Ya existe otro departamento con ese nombre.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        UPDATE adm.departamentos
        SET 
            nombre = ISNULL(LTRIM(RTRIM(@Nombre)), nombre),
            descripcion = ISNULL(@Descripcion, descripcion),
            responsable_id = ISNULL(@Responsable_id, responsable_id),
            updated_at = GETDATE()
        WHERE id = @Id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW; -- Retorna el error original al backend
    END CATCH
END;
GO

/* 3. DESACTIVAR DEPARTAMENTO (SOFT DELETE) */
CREATE PROCEDURE adm.usp_desactivar_departamento
    @Id bigint,
    @Estado BIT -- Usamos BIT en lugar de bool
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Verificamos si tiene Áreas activas antes de desactivar (Opcional pero recomendado)
    IF @Estado = 0 AND EXISTS (SELECT 1 FROM adm.areas WHERE departamento_id = @Id AND is_active = 1)
    BEGIN
        RAISERROR('No se puede desactivar un departamento que tiene áreas activas.', 16, 1);
        RETURN;
    END

    UPDATE adm.departamentos
    SET is_active = @Estado, updated_at = GETDATE()
    WHERE id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE adm.usp_crear_departamento
    @Nombre NVARCHAR(100),
    @Descripcion NVARCHAR(500) = NULL,
    @Responsable_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar que el nombre no esté duplicado
        -- LTRIM y RTRIM eliminan espacios accidentales al inicio o final
        IF EXISTS (SELECT 1 FROM adm.departamentos WHERE nombre = LTRIM(RTRIM(@Nombre)) AND is_active = 1)
        BEGIN
            RAISERROR('Ya existe un departamento activo con este nombre.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- 2. Insertar el nuevo registro
        INSERT INTO adm.departamentos (
            nombre, 
            descripcion, 
            responsable_id, 
            is_active, 
            created_at, 
            updated_at
        )
        VALUES (
            LTRIM(RTRIM(@Nombre)), 
            @Descripcion, 
            @Responsable_id, 
            1,          -- Por defecto activo
            GETDATE(), 
            GETDATE()
        );

        -- 3. Retornar el ID del nuevo departamento (útil para el Frontend)
        SELECT SCOPE_IDENTITY() AS id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW; 
    END CATCH
END;
GO

