USE SGI_GrupoCorban
GO

/* =====================================================
   1. LISTAR DEPARTAMENTOS (CON PAGINACION Y BUSQUEDA)
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_listar_departamentos
    @busqueda NVARCHAR(100) = NULL,
    @page INT = 1,
    @registro_por_pagina INT = 15
AS
BEGIN
    SET NOCOUNT ON;

    WITH Resultado AS (
        SELECT 
            d.id, 
            d.nombre, 
            d.descripcion, 
            d.responsable_id,
            ISNULL(e.nombres + ' ' + e.apellido_paterno, 'Sin asignar') AS responsable_nombre,
            d.is_active, 
            d.created_at,
            d.updated_at
        FROM adm.departamentos d
        LEFT JOIN adm.empleados e ON e.id = d.responsable_id
        WHERE d.is_active = 1 
          AND (@busqueda IS NULL OR d.nombre LIKE '%' + @busqueda + '%')
    )
    SELECT *, (SELECT COUNT(*) FROM Resultado) AS total_registros 
    FROM Resultado
    ORDER BY id
    OFFSET (@page - 1) * @registro_por_pagina ROWS 
    FETCH NEXT @registro_por_pagina ROWS ONLY;
END
GO

/* =====================================================
   2. CREAR DEPARTAMENTO
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_crear_departamento
    @nombre NVARCHAR(100),
    @descripcion NVARCHAR(300) = NULL,
    @responsable_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 1. Validar nombre unico (entre departamentos activos)
    IF EXISTS (SELECT 1 FROM adm.departamentos WHERE nombre = @nombre AND is_active = 1)
    BEGIN
        DECLARE @msg_dup NVARCHAR(200) = 'Ya existe un departamento activo con el nombre "' + @nombre + '".';
        RAISERROR(@msg_dup, 16, 1);
        RETURN;
    END

    -- 2. Validar que el responsable exista (si se especifica)
    IF @responsable_id IS NOT NULL 
       AND NOT EXISTS (SELECT 1 FROM adm.empleados WHERE id = @responsable_id AND is_active = 1)
    BEGIN
        RAISERROR('El empleado responsable especificado no existe o esta inactivo.', 16, 1);
        RETURN;
    END

    -- 3. Insertar
    BEGIN TRY
        INSERT INTO adm.departamentos (nombre, descripcion, responsable_id)
        VALUES (LTRIM(RTRIM(@nombre)), @descripcion, @responsable_id);

        SELECT 1 AS success, SCOPE_IDENTITY() AS id, 'Departamento creado exitosamente' AS message;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

/* =====================================================
   3. EDITAR DEPARTAMENTO
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_editar_departamento
    @id INT,
    @nombre NVARCHAR(100),
    @descripcion NVARCHAR(300) = NULL,
    @responsable_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Validar que el departamento exista
    IF NOT EXISTS (SELECT 1 FROM adm.departamentos WHERE id = @id)
    BEGIN
        RAISERROR('El departamento especificado no existe.', 16, 1);
        RETURN;
    END

    -- 2. Validar que el nombre no este duplicado en OTRO departamento activo
    IF EXISTS (SELECT 1 FROM adm.departamentos WHERE nombre = @nombre AND id <> @id AND is_active = 1)
    BEGIN
        DECLARE @msg_dup NVARCHAR(200) = 'Ya existe otro departamento con el nombre "' + @nombre + '".';
        RAISERROR(@msg_dup, 16, 1);
        RETURN;
    END

    -- 3. Validar que el responsable exista (si se especifica)
    IF @responsable_id IS NOT NULL 
       AND NOT EXISTS (SELECT 1 FROM adm.empleados WHERE id = @responsable_id AND is_active = 1)
    BEGIN
        RAISERROR('El empleado responsable especificado no existe o esta inactivo.', 16, 1);
        RETURN;
    END

    -- 4. Actualizar
    BEGIN TRY
        UPDATE adm.departamentos
        SET nombre = LTRIM(RTRIM(@nombre)),
            descripcion = @descripcion,
            responsable_id = @responsable_id,
            updated_at = GETDATE()
        WHERE id = @id;

        SELECT 1 AS success, @id AS id, 'Departamento actualizado correctamente' AS message;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

/* =====================================================
   4. DESACTIVAR DEPARTAMENTO (SOFT DELETE)
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_desactivar_departamento
    @id INT,
    @estado BIT = 0  -- 0 = desactivar, 1 = reactivar
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Validar que el departamento exista
    IF NOT EXISTS (SELECT 1 FROM adm.departamentos WHERE id = @id)
    BEGIN
        RAISERROR('El departamento especificado no existe.', 16, 1);
        RETURN;
    END

    -- 2. Si se va a desactivar, validar que no tenga areas activas
    IF @estado = 0 AND EXISTS (SELECT 1 FROM adm.areas WHERE departamento_id = @id AND is_active = 1)
    BEGIN
        RAISERROR('No se puede desactivar un departamento que tiene areas activas.', 16, 1);
        RETURN;
    END

    -- 3. Si se va a desactivar, validar que no tenga empleados activos asignados directamente
    IF @estado = 0 AND EXISTS (SELECT 1 FROM adm.empleados WHERE departamento_id = @id AND is_active = 1)
    BEGIN
        RAISERROR('No se puede desactivar un departamento que tiene empleados activos asignados.', 16, 1);
        RETURN;
    END

    -- 4. Actualizar estado
    UPDATE adm.departamentos
    SET is_active = @estado,
        updated_at = GETDATE()
    WHERE id = @id;

    DECLARE @accion NVARCHAR(20) = CASE WHEN @estado = 1 THEN 'reactivado' ELSE 'desactivado' END;
    SELECT 1 AS success, @id AS id, 'Departamento ' + @accion + ' correctamente' AS message;
END
GO

/* =====================================================
   5. DROPDOWN DE DEPARTAMENTOS
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_dropdown_departamentos
AS
BEGIN
    SET NOCOUNT ON;

    SELECT id, nombre
    FROM adm.departamentos
    WHERE is_active = 1
    ORDER BY nombre ASC;
END
GO
