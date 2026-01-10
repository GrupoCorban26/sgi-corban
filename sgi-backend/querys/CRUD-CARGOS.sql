USE SGI_GrupoCorban
GO

/* =====================================================
   1. LISTAR CARGOS (CON PAGINACIÓN Y BÚSQUEDA)
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_listar_cargos
    @busqueda NVARCHAR(100) = NULL,
    @area_id INT = NULL,
    @page INT = 1,
    @registro_por_pagina INT = 15
AS
BEGIN
    SET NOCOUNT ON;

    WITH Resultado AS (
        SELECT 
            c.id, 
            c.nombre, 
            c.descripcion, 
            c.area_id,
            a.nombre AS area_nombre,
            c.is_active, 
            c.created_at,
            c.updated_at
        FROM adm.cargos c
        INNER JOIN adm.areas a ON a.id = c.area_id
        WHERE c.is_active = 1 
          AND (@busqueda IS NULL OR c.nombre LIKE '%' + @busqueda + '%')
          AND (@area_id IS NULL OR c.area_id = @area_id)
    )
    SELECT *, (SELECT COUNT(*) FROM Resultado) AS total_registros 
    FROM Resultado
    ORDER BY id
    OFFSET (@page - 1) * @registro_por_pagina ROWS 
    FETCH NEXT @registro_por_pagina ROWS ONLY;
END
GO

/* =====================================================
   2. OBTENER CARGOS POR ÁREA (PARA EXPANDIR EN ÁRBOL)
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_cargos_por_area
    @area_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.id, 
        c.nombre, 
        c.descripcion, 
        c.area_id,
        a.nombre AS area_nombre,
        c.is_active, 
        c.created_at,
        c.updated_at
    FROM adm.cargos c
    INNER JOIN adm.areas a ON a.id = c.area_id
    WHERE c.is_active = 1 
      AND c.area_id = @area_id
    ORDER BY c.nombre;
END
GO

/* =====================================================
   3. CREAR CARGO
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_crear_cargo
    @nombre NVARCHAR(100),
    @descripcion NVARCHAR(300) = NULL,
    @area_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 1. Validar que el área exista y esté activa
    IF NOT EXISTS (SELECT 1 FROM adm.areas WHERE id = @area_id AND is_active = 1)
    BEGIN
        RAISERROR('El área especificada no existe o está inactiva.', 16, 1);
        RETURN;
    END

    -- 2. Validar nombre único (entre cargos activos)
    IF EXISTS (SELECT 1 FROM adm.cargos WHERE nombre = @nombre AND is_active = 1)
    BEGIN
        DECLARE @msg_dup NVARCHAR(200) = 'Ya existe un cargo activo con el nombre "' + @nombre + '".';
        RAISERROR(@msg_dup, 16, 1);
        RETURN;
    END

    -- 3. Insertar
    BEGIN TRY
        INSERT INTO adm.cargos (nombre, descripcion, area_id)
        VALUES (@nombre, @descripcion, @area_id);

        SELECT 1 AS success, SCOPE_IDENTITY() AS id, 'Cargo creado exitosamente' AS message;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

/* =====================================================
   4. EDITAR CARGO
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_editar_cargo
    @id INT,
    @nombre NVARCHAR(100),
    @descripcion NVARCHAR(300) = NULL,
    @area_id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Validar que el cargo exista
    IF NOT EXISTS (SELECT 1 FROM adm.cargos WHERE id = @id)
    BEGIN
        RAISERROR('El cargo especificado no existe.', 16, 1);
        RETURN;
    END

    -- 2. Validar que el área exista
    IF NOT EXISTS (SELECT 1 FROM adm.areas WHERE id = @area_id AND is_active = 1)
    BEGIN
        RAISERROR('El área especificada no existe o está inactiva.', 16, 1);
        RETURN;
    END

    -- 3. Validar que el nombre no esté duplicado en OTRO cargo activo
    IF EXISTS (SELECT 1 FROM adm.cargos WHERE nombre = @nombre AND id <> @id AND is_active = 1)
    BEGIN
        DECLARE @msg_dup NVARCHAR(200) = 'Ya existe otro cargo con el nombre "' + @nombre + '".';
        RAISERROR(@msg_dup, 16, 1);
        RETURN;
    END

    -- 4. Actualizar
    BEGIN TRY
        UPDATE adm.cargos
        SET nombre = @nombre,
            descripcion = @descripcion,
            area_id = @area_id,
            updated_at = GETDATE()
        WHERE id = @id;

        SELECT 1 AS success, @id AS id, 'Cargo actualizado correctamente' AS message;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

/* =====================================================
   5. DESACTIVAR CARGO (SOFT DELETE)
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_desactivar_cargo
    @id INT,
    @estado BIT = 0  -- 0 = desactivar, 1 = reactivar
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Validar que el cargo exista
    IF NOT EXISTS (SELECT 1 FROM adm.cargos WHERE id = @id)
    BEGIN
        RAISERROR('El cargo especificado no existe.', 16, 1);
        RETURN;
    END

    -- 2. Si se va a desactivar, validar que no tenga empleados activos
    IF @estado = 0 AND EXISTS (SELECT 1 FROM adm.empleados WHERE cargo_id = @id AND is_active = 1)
    BEGIN
        RAISERROR('No se puede desactivar un cargo que tiene empleados activos asignados.', 16, 1);
        RETURN;
    END

    -- 3. Actualizar estado
    UPDATE adm.cargos
    SET is_active = @estado,
        updated_at = GETDATE()
    WHERE id = @id;

    DECLARE @accion NVARCHAR(20) = CASE WHEN @estado = 1 THEN 'reactivado' ELSE 'desactivado' END;
    SELECT 1 AS success, @id AS id, 'Cargo ' + @accion + ' correctamente' AS message;
END
GO

/* =====================================================
   6. DROPDOWN DE CARGOS
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_dropdown_cargos
AS
BEGIN
    SET NOCOUNT ON;

    SELECT id, nombre
    FROM adm.cargos
    WHERE is_active = 1
    ORDER BY nombre ASC;
END
GO
