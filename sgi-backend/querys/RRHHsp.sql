-- =====================================================
-- STORED PROCEDURES - MÓDULO RRHH
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- =====================================================

USE SGI_GrupoCorban;
GO

-- =====================================================
-- SP: rrhh.sp_listar_empleados
-- Descripción: Lista empleados con paginación
-- =====================================================
CREATE OR ALTER PROCEDURE rrhh.sp_listar_empleados
    @page INT = 1,
    @page_size INT = 20,
    @busqueda NVARCHAR(100) = NULL,
    @activo BIT = NULL,
    @area_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @offset INT = (@page - 1) * @page_size;
    
    -- Contar total de registros
    DECLARE @total INT;
    
    SELECT @total = COUNT(*)
    FROM rrhh.empleados e
    WHERE (@busqueda IS NULL OR 
           e.nombres LIKE '%' + @busqueda + '%' OR
           e.apellido_paterno LIKE '%' + @busqueda + '%' OR
           e.apellido_materno LIKE '%' + @busqueda + '%' OR
           e.codigo_empleado LIKE '%' + @busqueda + '%' OR
           e.nro_documento LIKE '%' + @busqueda + '%')
      AND (@activo IS NULL OR e.activo = @activo)
      AND (@area_id IS NULL OR e.area_id = @area_id);
    
    -- Devolver datos con paginación
    SELECT 
        @total AS total,
        @page AS page,
        @page_size AS page_size,
        CEILING(CAST(@total AS FLOAT) / @page_size) AS total_pages,
        (
            SELECT 
                e.id,
                e.codigo_empleado,
                e.nombres,
                e.apellido_paterno,
                e.apellido_materno,
                e.nro_documento,
                e.celular,
                e.email_personal,
                e.fecha_ingreso,
                e.fecha_cese,
                e.activo,
                c.nombre AS cargo_nombre,
                a.nombre AS area_nombre,
                CONCAT(jefe.nombres, ' ', jefe.apellido_paterno, 
                       CASE WHEN jefe.apellido_materno IS NOT NULL 
                            THEN ' ' + jefe.apellido_materno 
                            ELSE '' END) AS jefe_nombre_completo
            FROM rrhh.empleados e
            INNER JOIN rrhh.cargos c ON e.cargo_id = c.id
            INNER JOIN rrhh.areas a ON e.area_id = a.id
            LEFT JOIN rrhh.empleados jefe ON e.jefe_id = jefe.id
            WHERE (@busqueda IS NULL OR 
                   e.nombres LIKE '%' + @busqueda + '%' OR
                   e.apellido_paterno LIKE '%' + @busqueda + '%' OR
                   e.apellido_materno LIKE '%' + @busqueda + '%' OR
                   e.codigo_empleado LIKE '%' + @busqueda + '%' OR
                   e.nro_documento LIKE '%' + @busqueda + '%')
              AND (@activo IS NULL OR e.activo = @activo)
              AND (@area_id IS NULL OR e.area_id = @area_id)
            ORDER BY e.created_at DESC
            OFFSET @offset ROWS
            FETCH NEXT @page_size ROWS ONLY
            FOR JSON PATH
        ) AS data
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END
GO

-- =====================================================
-- SP: rrhh.sp_obtener_empleado
-- Descripción: Obtiene un empleado por ID
-- =====================================================
CREATE OR ALTER PROCEDURE rrhh.sp_obtener_empleado
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validar que el empleado existe
    IF NOT EXISTS (SELECT 1 FROM rrhh.empleados WHERE id = @id)
    BEGIN
        RAISERROR('Empleado no encontrado', 16, 1);
        RETURN;
    END
    
    -- Devolver datos completos del empleado
    SELECT 
        e.id,
        e.codigo_empleado,
        e.nombres,
        e.apellido_paterno,
        e.apellido_materno,
        e.fecha_nacimiento,
        e.tipo_documento,
        e.nro_documento,
        e.celular,
        e.email_personal,
        e.direccion,
        e.distrito,
        e.provincia,
        e.fecha_ingreso,
        e.fecha_cese,
        e.activo,
        e.cargo_id,
        e.area_id,
        e.jefe_id,
        c.nombre AS cargo_nombre,
        a.nombre AS area_nombre,
        CONCAT(jefe.nombres, ' ', jefe.apellido_paterno, 
               CASE WHEN jefe.apellido_materno IS NOT NULL 
                    THEN ' ' + jefe.apellido_materno 
                    ELSE '' END) AS jefe_nombre_completo,
        e.created_at,
        e.updated_at
    FROM rrhh.empleados e
    INNER JOIN rrhh.cargos c ON e.cargo_id = c.id
    INNER JOIN rrhh.areas a ON e.area_id = a.id
    LEFT JOIN rrhh.empleados jefe ON e.jefe_id = jefe.id
    WHERE e.id = @id
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END
GO

-- =====================================================
-- SP: rrhh.sp_crear_empleado
-- Descripción: Crea un nuevo empleado
-- =====================================================
CREATE OR ALTER PROCEDURE rrhh.sp_crear_empleado
    @codigo_empleado VARCHAR(20),
    @nombres NVARCHAR(100),
    @apellido_paterno NVARCHAR(75),
    @apellido_materno NVARCHAR(75) = NULL,
    @fecha_nacimiento DATE = NULL,
    @tipo_documento VARCHAR(20),
    @nro_documento VARCHAR(20),
    @celular VARCHAR(20) = NULL,
    @email_personal NVARCHAR(100) = NULL,
    @direccion NVARCHAR(200) = NULL,
    @distrito NVARCHAR(100) = NULL,
    @provincia NVARCHAR(100) = NULL,
    @fecha_ingreso DATE,
    @cargo_id INT,
    @area_id INT,
    @jefe_id INT = NULL,
    @created_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validar que el código de empleado no exista
    IF EXISTS (SELECT 1 FROM rrhh.empleados WHERE codigo_empleado = @codigo_empleado)
    BEGIN
        RAISERROR('El código de empleado ya existe', 16, 1);
        RETURN;
    END
    
    -- Validar que el número de documento no exista
    IF EXISTS (SELECT 1 FROM rrhh.empleados WHERE nro_documento = @nro_documento)
    BEGIN
        RAISERROR('El número de documento ya está registrado', 16, 1);
        RETURN;
    END
    
    -- Validar que el cargo existe
    IF NOT EXISTS (SELECT 1 FROM rrhh.cargos WHERE id = @cargo_id AND is_active = 1)
    BEGIN
        RAISERROR('El cargo especificado no existe o está inactivo', 16, 1);
        RETURN;
    END
    
    -- Validar que el área existe
    IF NOT EXISTS (SELECT 1 FROM rrhh.areas WHERE id = @area_id AND is_active = 1)
    BEGIN
        RAISERROR('El área especificada no existe o está inactiva', 16, 1);
        RETURN;
    END
    
    -- Validar que el jefe existe (si se especificó)
    IF @jefe_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM rrhh.empleados WHERE id = @jefe_id AND activo = 1)
    BEGIN
        RAISERROR('El jefe especificado no existe o está inactivo', 16, 1);
        RETURN;
    END
    
    DECLARE @nuevo_id INT;
    
    -- Insertar empleado
    INSERT INTO rrhh.empleados (
        codigo_empleado, nombres, apellido_paterno, apellido_materno,
        fecha_nacimiento, tipo_documento, nro_documento,
        celular, email_personal, direccion, distrito, provincia,
        fecha_ingreso, activo,
        cargo_id, area_id, jefe_id, created_by
    )
    VALUES (
        @codigo_empleado, @nombres, @apellido_paterno, @apellido_materno,
        @fecha_nacimiento, @tipo_documento, @nro_documento,
        @celular, @email_personal, @direccion, @distrito, @provincia,
        @fecha_ingreso, 1,
        @cargo_id, @area_id, @jefe_id, @created_by
    );
    
    SET @nuevo_id = SCOPE_IDENTITY();
    
    -- Devolver el empleado creado
    EXEC rrhh.sp_obtener_empleado @id = @nuevo_id;
END
GO

-- =====================================================
-- SP: rrhh.sp_actualizar_empleado
-- Descripción: Actualiza un empleado existente
-- =====================================================
CREATE OR ALTER PROCEDURE rrhh.sp_actualizar_empleado
    @id INT,
    @nombres NVARCHAR(100) = NULL,
    @apellido_paterno NVARCHAR(75) = NULL,
    @apellido_materno NVARCHAR(75) = NULL,
    @fecha_nacimiento DATE = NULL,
    @tipo_documento VARCHAR(20) = NULL,
    @nro_documento VARCHAR(20) = NULL,
    @celular VARCHAR(20) = NULL,
    @email_personal NVARCHAR(100) = NULL,
    @direccion NVARCHAR(200) = NULL,
    @distrito NVARCHAR(100) = NULL,
    @provincia NVARCHAR(100) = NULL,
    @fecha_cese DATE = NULL,
    @activo BIT = NULL,
    @cargo_id INT = NULL,
    @area_id INT = NULL,
    @jefe_id INT = NULL,
    @updated_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validar que el empleado existe
    IF NOT EXISTS (SELECT 1 FROM rrhh.empleados WHERE id = @id)
    BEGIN
        RAISERROR('Empleado no encontrado', 16, 1);
        RETURN;
    END
    
    -- Validar documento duplicado (excepto el mismo empleado)
    IF @nro_documento IS NOT NULL AND EXISTS (
        SELECT 1 FROM rrhh.empleados 
        WHERE nro_documento = @nro_documento AND id != @id
    )
    BEGIN
        RAISERROR('El número de documento ya está registrado', 16, 1);
        RETURN;
    END
    
    -- Actualizar solo los campos que no son NULL
    UPDATE rrhh.empleados
    SET 
        nombres = ISNULL(@nombres, nombres),
        apellido_paterno = ISNULL(@apellido_paterno, apellido_paterno),
        apellido_materno = CASE WHEN @apellido_materno = '' THEN NULL ELSE ISNULL(@apellido_materno, apellido_materno) END,
        fecha_nacimiento = ISNULL(@fecha_nacimiento, fecha_nacimiento),
        tipo_documento = ISNULL(@tipo_documento, tipo_documento),
        nro_documento = ISNULL(@nro_documento, nro_documento),
        celular = ISNULL(@celular, celular),
        email_personal = ISNULL(@email_personal, email_personal),
        direccion = ISNULL(@direccion, direccion),
        distrito = ISNULL(@distrito, distrito),
        provincia = ISNULL(@provincia, provincia),
        fecha_cese = ISNULL(@fecha_cese, fecha_cese),
        activo = ISNULL(@activo, activo),
        cargo_id = ISNULL(@cargo_id, cargo_id),
        area_id = ISNULL(@area_id, area_id),
        jefe_id = ISNULL(@jefe_id, jefe_id),
        updated_by = @updated_by,
        updated_at = GETDATE()
    WHERE id = @id;
    
    -- Devolver el empleado actualizado
    EXEC rrhh.sp_obtener_empleado @id = @id;
END
GO

-- =====================================================
-- SP: rrhh.sp_desactivar_empleado
-- Descripción: Desactiva un empleado (soft delete)
-- =====================================================
CREATE OR ALTER PROCEDURE rrhh.sp_desactivar_empleado
    @id INT,
    @updated_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validar que el empleado existe
    IF NOT EXISTS (SELECT 1 FROM rrhh.empleados WHERE id = @id)
    BEGIN
        RAISERROR('Empleado no encontrado', 16, 1);
        RETURN;
    END
    
    -- Validar que el empleado no tiene usuario activo
    IF EXISTS (SELECT 1 FROM seg.usuarios WHERE empleado_id = @id AND is_active = 1)
    BEGIN
        RAISERROR('No se puede desactivar: el empleado tiene un usuario activo en el sistema', 16, 1);
        RETURN;
    END
    
    -- Desactivar empleado
    UPDATE rrhh.empleados
    SET activo = 0,
        fecha_cese = GETDATE(),
        updated_by = @updated_by,
        updated_at = GETDATE()
    WHERE id = @id;
    
    SELECT 
        'success' AS status,
        'Empleado desactivado exitosamente' AS message,
        @id AS id
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END
GO

-- =====================================================
-- SP: rrhh.sp_listar_cargos
-- Descripción: Lista todos los cargos activos
-- =====================================================
CREATE OR ALTER PROCEDURE rrhh.sp_listar_cargos
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        id,
        nombre,
        descripcion,
        is_active,
        created_at
    FROM rrhh.cargos
    WHERE is_active = 1
    ORDER BY nombre
    FOR JSON PATH;
END
GO

-- =====================================================
-- SP: rrhh.sp_listar_areas
-- Descripción: Lista todas las áreas activas
-- =====================================================
CREATE OR ALTER PROCEDURE rrhh.sp_listar_areas
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        id,
        nombre,
        descripcion,
        comisiona_ventas,
        is_active,
        created_at
    FROM rrhh.areas
    WHERE is_active = 1
    ORDER BY nombre
    FOR JSON PATH;
END
GO

-- =====================================================
-- GRANTS: Dar permisos de EXECUTE al usuario de Python
-- =====================================================
-- IMPORTANTE: Reemplaza 'tu_usuario_python' con el usuario real

GRANT EXECUTE ON rrhh.sp_listar_empleados TO AdminGeneral;
GRANT EXECUTE ON rrhh.sp_obtener_empleado TO AdminGeneral;
GRANT EXECUTE ON rrhh.sp_crear_empleado TO AdminGeneral;
GRANT EXECUTE ON rrhh.sp_actualizar_empleado TO AdminGeneral;
GRANT EXECUTE ON rrhh.sp_desactivar_empleado TO AdminGeneral;
GRANT EXECUTE ON rrhh.sp_listar_cargos TO AdminGeneral;
GRANT EXECUTE ON rrhh.sp_listar_areas TO AdminGeneral;

PRINT '✓ Stored Procedures de RRHH creados exitosamente';
GO