-- =====================================================
-- STORED PROCEDURES - MÓDULO RRHH
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- CRUD PARA TABLA 'AREAS'
-- =====================================================

USE SGI_GrupoCorban;
GO

-- =====================================================
-- SP: adm.sp_listar_areas
-- Descripción: Lista de áreas con paginación
-- =====================================================

CREATE OR ALTER PROCEDURE adm.sp_listar_areas
    @page INT = 1,
    @page_size INT = 20,
    @busqueda NVARCHAR(100) = NULL,
    @activo BIT = NULL,
    @area_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @offset INT = (@page - 1) * @page_size;
    DECLARE @total INT;

    -- 1. Contar el total para la metadata
    SELECT @total = COUNT(*)
    FROM adm.areas
    WHERE (@busqueda IS NULL OR 
           nombre LIKE '%' + @busqueda + '%' OR 
           descripcion LIKE '%' + @busqueda + '%')
      AND (@activo IS NULL OR is_active = @activo)
      AND (@area_id IS NULL OR id = @area_id); -- Filtro de area_id añadido

    -- 2. Devolver objeto JSON completo
    SELECT 
        @total AS total,
        @page AS page,
        @page_size AS page_size,
        CEILING(CAST(@total AS FLOAT) / @page_size) AS total_pages,
        (
            SELECT 
                id, 
                nombre, 
                descripcion, 
                parent_area_id, 
                responsable_id, 
                comisiona_ventas, 
                is_active, 
                created_at, 
                updated_at
            FROM adm.areas
            WHERE (@busqueda IS NULL OR 
                   nombre LIKE '%' + @busqueda + '%' OR 
                   descripcion LIKE '%' + @busqueda + '%')
              AND (@activo IS NULL OR is_active = @activo)
              AND (@area_id IS NULL OR id = @area_id)
            ORDER BY id -- Es obligatorio tener un ORDER BY para usar OFFSET
            OFFSET @offset ROWS
            FETCH NEXT @page_size ROWS ONLY
            FOR JSON PATH -- Quitamos el punto y coma aquí
        ) AS data
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END
GO

-- =====================================================
-- SP: adm.sp_crear_area
-- Descripción: Crea una area
-- =====================================================

CREATE OR ALTER PROCEDURE adm.sp_crear_area
    @id INT = NULL,
    @nombre NVARCHAR(100),
    @descripcion NVARCHAR(300) = NULL,
    @parent_area_id INT = NULL,
    @responsable_id INT = NULL,
    @comisiona_ventas BIT = 0,
    @is_active BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @id IS NULL OR @id = 0
        BEGIN
            -- INSERTAR
            INSERT INTO adm.areas (nombre, descripcion, parent_area_id, responsable_id, comisiona_ventas, is_active)
            VALUES (@nombre, @descripcion, @parent_area_id, @responsable_id, @comisiona_ventas, @is_active);
            
            SELECT @id = SCOPE_IDENTITY();
            PRINT '✓ Área creada correctamente';
        END
        ELSE
        BEGIN
            -- ACTUALIZAR
            UPDATE adm.areas
            SET nombre = @nombre,
                descripcion = @descripcion,
                parent_area_id = @parent_area_id,
                responsable_id = @responsable_id,
                comisiona_ventas = @comisiona_ventas,
                is_active = @is_active,
                updated_at = GETDATE()
            WHERE id = @id;
            
            PRINT '✓ Área actualizada correctamente';
        END

        -- Devolvemos el registro afectado en formato JSON
        SELECT 
            success = 1,
            message = 'Operación exitosa',
            id = @id
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;

    END TRY
    BEGIN CATCH
        SELECT 
            success = 0,
            message = ERROR_MESSAGE(),
            id = NULL
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
    END CATCH
END
GO

-- =====================================================
-- SP: adm.sp_borrar_area
-- Descripción: Cambia el estado del area (De inactivo a activo o al reves)
-- =====================================================

CREATE OR ALTER PROCEDURE adm.sp_estado_area
    @id INT,
    @is_active BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE adm.areas 
        SET is_active = @is_active, 
            updated_at = GETDATE() 
        WHERE id = @id;

        SELECT 
            success = 1, 
            message = 'Estado actualizado correctamente'
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
    END TRY
    BEGIN CATCH
        SELECT 
            success = 0, 
            message = ERROR_MESSAGE()
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
    END CATCH
END
GO

-- =====================================================
-- SP: adm.sp_obtener_area
-- Descripción: Devuelve una sola area
-- =====================================================

CREATE OR ALTER PROCEDURE adm.sp_obtener_area
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM adm.areas 
    WHERE id = @id
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END
GO

-- CREANDO AREAS
EXEC adm.sp_crear_area
    @nombre = 'Comercial',
    @descripcion = 'Área comercial de Grupo Corban',
    @comisiona_ventas = 1
GO

EXEC adm.sp_crear_area
    @nombre = 'Administración',
    @descripcion = 'Area de administración de Grupo Corban',
    @comisiona_ventas = 0
GO

EXEC adm.sp_crear_area
    @nombre = 'Sistemas',
    @descripcion = 'Area de sistemas de Grupo Corban',
    @comisiona_ventas = 0
GO

EXEC adm.sp_crear_area
    @nombre = 'Marketing',
    @descripcion = 'Area de marketing de Grupo Corban',
    @comisiona_ventas = 0
GO

EXEC adm.sp_crear_area
    @nombre = 'Facturación',
    @descripcion = 'Area de facturación de Grupo Corban',
    @comisiona_ventas = 0
GO

EXEC adm.sp_crear_area
    @nombre = 'Liquidación',
    @descripcion = 'Area de liquidación de Grupo Corban',
    @comisiona_ventas = 0
GO

EXEC adm.sp_crear_area
    @nombre = 'Operaciones',
    @descripcion = 'Area de operaciones de Grupo Corban',
    @comisiona_ventas = 0
GO

EXEC adm.sp_listar_areas
go

select * from adm.areas
go

select * from seg.roles
go

INSERT INTO seg.permisos (nombre_tecnico, nombre_display, modulo, descripcion)
VALUES
  ('adm.cargos.listar', 'Listar Cargos', 'adm', 'Permite ver la lista general de cargos'),
  ('adm.cargos.ver', 'Ver Detalle de Cargo', 'adm', 'Permite ver la información detallada de un cargo'),
  ('adm.cargos.crear', 'Crear Cargo', 'adm', 'Permite registrar un nuevo cargo en el sistema'),
  ('adm.cargos.editar', 'Editar Cargo', 'adm', 'Permite modificar la información de un cargo existente'),
  ('adm.cargos.desactivar', 'Desactivar Cargo', 'adm', 'Permite dar de baja un cargo sin eliminarlo'),
  
  ('adm.areas.listar', 'Listar Áreas', 'adm', 'Permite ver la lista general de áreas'),
  ('adm.areas.ver', 'Ver Detalle de Área', 'adm', 'Permite ver la información detallada de un área'),
  ('adm.areas.crear', 'Crear Área', 'adm', 'Permite registrar una nueva área en el sistema'),
  ('adm.areas.editar', 'Editar Área', 'adm', 'Permite modificar la información de una área existente'),
  ('adm.areas.desactivar', 'Desactivar Área', 'adm', 'Permite dar de baja una área sin eliminarla');
GO

insert into seg.roles(nombre, descripcion)
values
('Administrador de Jerarquias', 'Este usuario modificará todo el organigrama de la empresa')
go

DECLARE @RolId INT;
SELECT @RolId = id FROM seg.roles WHERE nombre = 'Administrador de Jerarquias';

INSERT INTO seg.rol_permiso (rol_id, permiso_id)
SELECT @RolId, id 
FROM seg.permisos 
WHERE nombre_tecnico LIKE 'adm.areas.%' 
   OR nombre_tecnico LIKE 'adm.cargos.%';

select * from adm.empleados
go

select * from seg.usuarios
go

select * from seg.usuarios_roles
go

insert into seg.usuarios(empleado_id, correo_corp, password_hash)
values
(1, 'maricielo@grupocorban.pe', 'mari123')

update seg.usuarios
set password_hash='$2b$12$wrrSOi/0YlMG.zh1SPKjou8HQqeGNhSSHGGjvJmf7jLPVXbECNYNG'
where id=3
go

insert into seg.usuarios_roles(usuario_id, rol_id, asignado_por)
values
()
