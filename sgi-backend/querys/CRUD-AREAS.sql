USE SGI_GrupoCorban
GO
/* =====================================================
   1. LISTAR �REAS (CON PAGINACI�N Y B�SQUEDA)
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_listar_areas
    @busqueda NVARCHAR(100) = NULL,
    @page INT = 1,
    @registro_por_pagina INT = 15,
    @departamento_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    WITH Resultado AS (
        SELECT 
            a.id, 
            a.nombre, 
            a.descripcion, 
            a.departamento_id,
            d.nombre AS departamento_name, 
            a.area_parent_id, 
            ap.nombre AS area_padre_name,
            a.responsable_id,
            ISNULL(e.nombres + ' ' + e.apellido_paterno, 'Sin asignar') AS responsable_name,
            a.is_active, 
            a.created_at,
            a.updated_at
        FROM adm.areas a
        INNER JOIN adm.departamentos d ON d.id = a.departamento_id
        LEFT JOIN adm.empleados e ON e.id = a.responsable_id
        LEFT JOIN adm.areas ap ON ap.id = a.area_parent_id
        WHERE a.is_active = 1 
          AND (@busqueda IS NULL 
               OR a.nombre LIKE '%' + @busqueda + '%' 
               OR d.nombre LIKE '%' + @busqueda + '%')
          AND (@departamento_id is NULL OR a.departamento_id = @departamento_id)
    )
    SELECT *, (SELECT COUNT(*) FROM Resultado) AS total_registros 
    FROM Resultado
    ORDER BY id
    OFFSET (@page - 1) * @registro_por_pagina ROWS 
    FETCH NEXT @registro_por_pagina ROWS ONLY;
END
GO

/* =====================================================
   2. CREAR �REA
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_crear_areas
    @nombre NVARCHAR(100),
    @descripcion NVARCHAR(300) = NULL,
    @departamento_id INT,
    @area_parent_id INT = NULL,
    @responsable_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 1. Validar que el departamento exista y est� activo
    IF NOT EXISTS (SELECT 1 FROM adm.departamentos WHERE id = @departamento_id AND is_active = 1)
    BEGIN
        RAISERROR('El departamento especificado no existe o est� inactivo.', 16, 1);
        RETURN;
    END

    -- 2. Validar que el �rea padre exista (si se especific�)
    IF @area_parent_id IS NOT NULL 
       AND NOT EXISTS (SELECT 1 FROM adm.areas WHERE id = @area_parent_id AND is_active = 1)
    BEGIN
        RAISERROR('El �rea padre especificada no existe o est� inactiva.', 16, 1);
        RETURN;
    END

    -- 3. Validar nombre �nico (entre �reas activas)
    IF EXISTS (SELECT 1 FROM adm.areas WHERE nombre = @nombre AND is_active = 1)
    BEGIN
        DECLARE @msg_dup NVARCHAR(200) = 'Ya existe un �rea activa con el nombre "' + @nombre + '".';
        RAISERROR(@msg_dup, 16, 1);
        RETURN;
    END

    -- 4. Insertar
    BEGIN TRY
        INSERT INTO adm.areas (nombre, descripcion, departamento_id, area_parent_id, responsable_id )
        VALUES (@nombre, @descripcion, @departamento_id, @area_parent_id, @responsable_id);

        SELECT 1 AS success, SCOPE_IDENTITY() AS id, '�rea creada exitosamente' AS message;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

/* =====================================================
   3. EDITAR AREA
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_editar_areas
    @id INT,
    @nombre NVARCHAR(100),
    @descripcion NVARCHAR(300) = NULL,
    @departamento_id INT,
    @area_parent_id INT = NULL,
    @responsable_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Validar que el �rea exista
    IF NOT EXISTS (SELECT 1 FROM adm.areas WHERE id = @id)
    BEGIN
        RAISERROR('El �rea especificada no existe.', 16, 1);
        RETURN;
    END

    -- 2. Validar que el departamento exista
    IF NOT EXISTS (SELECT 1 FROM adm.departamentos WHERE id = @departamento_id AND is_active = 1)
    BEGIN
        RAISERROR('El departamento especificado no existe o est� inactivo.', 16, 1);
        RETURN;
    END

    -- 3. Evitar que un �rea sea su propio padre
    IF @id = @area_parent_id
    BEGIN
        RAISERROR('Un �rea no puede ser su propio padre.', 16, 1);
        RETURN;
    END

    -- 4. Validar que el nombre no est� duplicado en OTRA �rea activa
    IF EXISTS (SELECT 1 FROM adm.areas WHERE nombre = @nombre AND id <> @id AND is_active = 1)
    BEGIN
        DECLARE @msg_dup NVARCHAR(200) = 'Ya existe otra �rea con el nombre "' + @nombre + '".';
        RAISERROR(@msg_dup, 16, 1);
        RETURN;
    END

    -- 5. Actualizar
    BEGIN TRY
        UPDATE adm.areas
        SET nombre = @nombre,
            descripcion = @descripcion,
            departamento_id = @departamento_id,
            area_parent_id = @area_parent_id,
            responsable_id = @responsable_id,
            updated_at = GETDATE()
        WHERE id = @id;

        SELECT 1 AS success, @id AS id, '�rea actualizada correctamente' AS message;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

/* =====================================================
   4. DESACTIVAR AREA (SOFT DELETE)
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_desactivar_areas
    @id INT,
    @estado BIT = 0  -- 0 = desactivar, 1 = reactivar
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Validar que el �rea exista
    IF NOT EXISTS (SELECT 1 FROM adm.areas WHERE id = @id)
    BEGIN
        RAISERROR('El �rea especificada no existe.', 16, 1);
        RETURN;
    END

    -- 2. Si se va a desactivar, validar que no tenga sub-�reas activas
    IF @estado = 0 AND EXISTS (SELECT 1 FROM adm.areas WHERE area_parent_id = @id AND is_active = 1)
    BEGIN
        RAISERROR('No se puede desactivar un �rea que tiene sub-�reas activas.', 16, 1);
        RETURN;
    END

    -- 3. Actualizar estado
    UPDATE adm.areas
    SET is_active = @estado,
        updated_at = GETDATE()
    WHERE id = @id;

    DECLARE @accion NVARCHAR(20) = CASE WHEN @estado = 1 THEN 'reactivada' ELSE 'desactivada' END;
    SELECT 1 AS success, @id AS id, 'area ' + @accion + ' correctamente' AS message;
END
GO

/* =====================================================
   5. Listar ID Y NOMBRE de Areas para DropDown
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_dropdown_areas
AS
BEGIN
    SET NOCOUNT ON;

    SELECT id, nombre
    FROM adm.areas
    WHERE is_active = 1
    ORDER BY nombre ASC;
END
GO