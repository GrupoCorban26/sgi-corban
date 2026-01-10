USE SGI_GrupoCorban
GO

/* =====================================================
   1. LISTAR EMPLEADOS (CON PAGINACION Y BUSQUEDA)
   ===================================================== */

CREATE OR ALTER PROCEDURE adm.usp_listar_empleados
    @busqueda NVARCHAR(100) = NULL,
    @page INT = 1,
    @registro_por_pagina INT = 15,
    @departamento_id INT = NULL,
    @area_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    WITH Resultado AS (
        SELECT
            e.id,
            e.nombres,
            e.apellido_paterno,
            e.apellido_materno,
            e.fecha_nacimiento,
            e.tipo_documento,
            e.nro_documento,
            e.celular,
            e.email_personal,
            e.distrito_id,
            dist.distrito,
            p.provincia,
            dept.departamento,
            e.direccion,
            e.fecha_ingreso,
            e.fecha_cese,
            e.is_active,
            e.cargo_id,
            c.nombre AS cargo_nombre,
            e.area_id,
            a.nombre AS area_nombre,
            e.departamento_id,
            d.nombre AS departamento_nombre,
            e.jefe_id,
            ISNULL(emp_jefe.nombres + ' ' + emp_jefe.apellido_paterno, 'Sin jefe') AS jefe_nombre
        FROM adm.empleados e
        INNER JOIN core.distritos dist ON dist.id = e.distrito_id
        INNER JOIN core.provincias p ON p.id = dist.provincia_id
        INNER JOIN core.departamentos dept ON dept.id = p.departamento_id
        LEFT JOIN adm.cargos c ON c.id = e.cargo_id
        LEFT JOIN adm.areas a ON a.id = e.area_id
        LEFT JOIN adm.departamentos d ON d.id = e.departamento_id
        LEFT JOIN adm.empleados emp_jefe ON emp_jefe.id = e.jefe_id
        WHERE e.is_active = 1
          AND (@busqueda IS NULL 
               OR e.nombres LIKE '%' + @busqueda + '%' 
               OR e.apellido_paterno LIKE '%' + @busqueda + '%'
               OR e.apellido_materno LIKE '%' + @busqueda + '%')
          AND (@departamento_id IS NULL OR e.departamento_id = @departamento_id)
          AND (@area_id IS NULL OR e.area_id = @area_id)
    )
    SELECT *, (SELECT COUNT(*) FROM Resultado) AS total_registros
    FROM Resultado
    ORDER BY id
    OFFSET (@page - 1) * @registro_por_pagina ROWS 
    FETCH NEXT @registro_por_pagina ROWS ONLY;
END
GO

/* =====================================================
   2. CREAR EMPLEADOS (CON PAGINACION Y BUSQUEDA)
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_crear_empleados
    @nombre NVARCHAR(100),
    @apellido_paterno NVARCHAR(100),
    @apellido_materno NVARCHAR(100),
    @fecha_nacimiento DATE,
    @tipo_documento NVARCHAR(20),
    @nro_documento NVARCHAR(20),
    @celular NVARCHAR(20),
    @email_personal NVARCHAR(100),
    @distrito_id INT,
    @direccion NVARCHAR(200),
    @fecha_ingreso DATE,
    @fecha_cese DATE,
    @activo BIT,
    @cargo_id INT,
    @area_id INT,
    @departamento_id INT,
    @jefe_id INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM adm.departamentos WHERE id = @departamento_id AND is_active = 1)
    BEGIN
        RAISERROR('El departamento especificado no existe o est� inactivo.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM adm.cargos WHERE id = @cargo_id AND is_active = 1)
    BEGIN
        RAISERROR('El cargo especificado no existe o est� inactivo.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM adm.areas WHERE id = @area_id AND is_active = 1)
    BEGIN
        RAISERROR('El area especificada no existe o est� inactiva.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM adm.empleados WHERE id = @jefe_id AND is_active = 1)
    BEGIN
        RAISERROR('El jefe especificado no existe o est� inactivo.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM adm.empleados WHERE nro_documento = @nro_documento AND is_active = 1)
    BEGIN
        RAISERROR('Ya existe un empleado con el nro de documento especificado.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        INSERT INTO adm.empleados (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, tipo_documento, nro_documento, celular, email_personal, distrito_id, direccion, fecha_ingreso, fecha_cese, is_active, cargo_id, area_id, departamento_id, jefe_id)
        VALUES (@nombre, @apellido_paterno, @apellido_materno, @fecha_nacimiento, @tipo_documento, @nro_documento, @celular, @email_personal, @distrito_id, @direccion, @fecha_ingreso, @fecha_cese, @activo, @cargo_id, @area_id, @departamento_id, @jefe_id);

        SELECT 1 AS success, SCOPE_IDENTITY() AS id, 'Empleado creado exitosamente' AS message;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

/* =====================================================
   3. EDITAR EMPLEADOS
   ===================================================== */

CREATE OR ALTER PROCEDURE adm.usp_editar_empleados
    @id INT,
    @nombre NVARCHAR(100),
    @apellido_paterno NVARCHAR(100),
    @apellido_materno NVARCHAR(100),
    @fecha_nacimiento DATE,
    @tipo_documento NVARCHAR(20),
    @nro_documento NVARCHAR(20),
    @celular NVARCHAR(20),
    @email_personal NVARCHAR(100),
    @distrito_id INT,
    @direccion NVARCHAR(200),
    @fecha_ingreso DATE,
    @fecha_cese DATE,
    @activo BIT,
    @cargo_id INT,
    @area_id INT,
    @departamento_id INT,
    @jefe_id INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM adm.departamentos WHERE id = @departamento_id AND is_active = 1)
    BEGIN
        RAISERROR('El departamento especificado no existe o est� inactivo.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM adm.cargos WHERE id = @cargo_id AND is_active = 1)
    BEGIN
        RAISERROR('El cargo especificado no existe o est� inactivo.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM adm.areas WHERE id = @area_id AND is_active = 1)
    BEGIN
        RAISERROR('El area especificada no existe o est� inactiva.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM adm.empleados WHERE id = @jefe_id AND is_active = 1)
    BEGIN
        RAISERROR('El jefe especificado no existe o est� inactivo.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM adm.empleados WHERE nro_documento = @nro_documento AND is_active = 1)
    BEGIN
        RAISERROR('Ya existe un empleado con el nro de documento especificado.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        UPDATE adm.empleados
        SET nombres = @nombre,
            apellido_paterno = @apellido_paterno,
            apellido_materno = @apellido_materno,
            fecha_nacimiento = @fecha_nacimiento,
            tipo_documento = @tipo_documento,
            nro_documento = @nro_documento,
            celular = @celular,
            email_personal = @email_personal,
            distrito_id = @distrito_id,
            direccion = @direccion,
            fecha_ingreso = @fecha_ingreso,
            fecha_cese = @fecha_cese,
            is_active = @activo,
            cargo_id = @cargo_id,
            area_id = @area_id,
            departamento_id = @departamento_id,
            jefe_id = @jefe_id,
            updated_at = GETDATE()
        WHERE id = @id;

        SELECT 1 AS success, @id AS id, 'Empleado editado exitosamente' AS message;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

/* =====================================================
   3. DESACTIVAR EMPLEADOS
   ===================================================== */

CREATE OR ALTER PROCEDURE adm.usp_desactivar_empleados
    @id INT,
    @estado BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM adm.empleados WHERE id = @id)
    BEGIN
        RAISERROR('El empleado especificado no existe.', 16, 1);
        RETURN;
    END

    -- Verificar si el empleado es jefe de otros empleados activos
    IF @estado = 0 AND EXISTS (SELECT 1 FROM adm.empleados WHERE jefe_id = @id AND is_active = 1)
    BEGIN
        RAISERROR('No se puede desactivar un empleado que es jefe de otros empleados activos.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        UPDATE adm.empleados
        SET is_active = @estado,
            updated_at = GETDATE()
        WHERE id = @id;

        SELECT 1 AS success, @id AS id, 'Empleado desactivado exitosamente' AS message;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

/* =====================================================
   4. Listar ID Y NOMBRE de Areas para DropDown
   ===================================================== */
CREATE OR ALTER PROCEDURE adm.usp_listar_empleados_dropdown
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        id, 
        -- Creamos una sola columna 'nombre_completo' para el frontend
        CONCAT(
            nombres, 
            ' ', 
            apellido_paterno, 
            CASE 
                WHEN apellido_materno IS NOT NULL AND apellido_materno <> '' 
                -- Solo ponemos la inicial y el punto si existe el apellido
                THEN ' ' + LEFT(apellido_materno, 1) + '.' 
                ELSE '' 
            END
        ) AS nombre_completo
    FROM adm.empleados
    WHERE is_active = 1
    ORDER BY nombres ASC;
END
GO