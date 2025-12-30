USE SGI_GrupoCorban;
GO

-- =====================================================
-- 1. SP: adm.sp_listar_cargos
-- =====================================================
CREATE OR ALTER PROCEDURE adm.sp_listar_cargos
    @page INT = 1,
    @page_size INT = 20,
    @busqueda NVARCHAR(100) = NULL,
    @activo BIT = NULL,
    @cargo_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @offset INT = (@page - 1) * @page_size;
    DECLARE @total INT;

    SELECT @total = COUNT(*)
    FROM adm.cargos
    WHERE (@busqueda IS NULL OR nombre LIKE '%' + @busqueda + '%' OR descripcion LIKE '%' + @busqueda + '%')
      AND (@activo IS NULL OR is_active = @activo)
      AND (@cargo_id IS NULL OR id = @cargo_id);

    SELECT 
        @total AS total,
        @page AS page,
        @page_size AS page_size,
        CEILING(CAST(@total AS FLOAT) / @page_size) AS total_pages,
        (
            SELECT id, nombre, descripcion, is_active, created_at, updated_at
            FROM adm.cargos
            WHERE (@busqueda IS NULL OR nombre LIKE '%' + @busqueda + '%' OR descripcion LIKE '%' + @busqueda + '%')
              AND (@activo IS NULL OR is_active = @activo)
              AND (@cargo_id IS NULL OR id = @cargo_id)
            ORDER BY id
            OFFSET @offset ROWS
            FETCH NEXT @page_size ROWS ONLY
            FOR JSON PATH
        ) AS data
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END
GO

-- =====================================================
-- 2. SP: adm.sp_guardar_cargo (Upsert)
-- =====================================================
CREATE OR ALTER PROCEDURE adm.sp_guardar_cargo
    @id INT = NULL,
    @nombre NVARCHAR(100),
    @descripcion NVARCHAR(300) = NULL,
    @is_active BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id IS NULL OR @id = 0
        BEGIN
            INSERT INTO adm.cargos (nombre, descripcion, is_active)
            VALUES (@nombre, @descripcion, @is_active);
            SELECT @id = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE adm.cargos
            SET nombre = @nombre,
                descripcion = @descripcion,
                is_active = @is_active,
                updated_at = GETDATE()
            WHERE id = @id;
        END

        SELECT success = 1, message = 'Operación exitosa', id = @id
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
    END TRY
    BEGIN CATCH
        SELECT success = 0, message = ERROR_MESSAGE(), id = NULL
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
    END CATCH
END
GO

-- =====================================================
-- 3. SP: adm.sp_estado_cargo
-- =====================================================
CREATE OR ALTER PROCEDURE adm.sp_estado_cargo
    @id INT,
    @is_active BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE adm.cargos SET is_active = @is_active, updated_at = GETDATE() WHERE id = @id;
        SELECT success = 1, message = 'Estado actualizado' FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
    END TRY
    BEGIN CATCH
        SELECT success = 0, message = ERROR_MESSAGE() FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
    END CATCH
END
GO

-- =====================================================
-- 4. SP: adm.sp_obtener_cargo
-- =====================================================
CREATE OR ALTER PROCEDURE adm.sp_obtener_cargo
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM adm.cargos WHERE id = @id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END
GO

-- POBLANDO TABLA CARGOS
EXEC adm.sp_guardar_cargo @nombre = 'Asistente', @descripcion = 'Asistente de área';
EXEC adm.sp_guardar_cargo @nombre = 'Practicante', @descripcion = 'Apoyo pre-profesional';
EXEC adm.sp_guardar_cargo @nombre = 'Ejecutivo', @descripcion = 'Sénior / Especialista';
EXEC adm.sp_guardar_cargo @nombre = 'Jefe de área', @descripcion = 'Responsable de departamento';
GO

-- VERIFICAR RESULTADO
EXEC adm.sp_listar_cargos;
