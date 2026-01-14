USE SGI_GrupoCorban;
GO

-- =============================================
-- LISTAR TODOS LOS CASOS DE LLAMADA
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_listar_casos_llamada
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, nombre, contestado, created_at, updated_at
    FROM comercial.casos_llamada
    ORDER BY contestado, nombre;
END
GO

-- =============================================
-- OBTENER CASO POR ID
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_obtener_caso_llamada
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, nombre, contestado, created_at, updated_at
    FROM comercial.casos_llamada
    WHERE id = @Id;
END
GO

-- =============================================
-- CREAR CASO DE LLAMADA
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_crear_caso_llamada
    @Nombre VARCHAR(100),
    @Contestado BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO comercial.casos_llamada (nombre, contestado, created_at)
    VALUES (@Nombre, @Contestado, GETDATE());
    
    SELECT CAST(SCOPE_IDENTITY() as INT) as id;
END
GO

-- =============================================
-- ACTUALIZAR CASO DE LLAMADA
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_actualizar_caso_llamada
    @Id INT,
    @Nombre VARCHAR(100) = NULL,
    @Contestado BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE comercial.casos_llamada
    SET 
        nombre = COALESCE(@Nombre, nombre),
        contestado = COALESCE(@Contestado, contestado),
        updated_at = GETDATE()
    WHERE id = @Id;
END
GO

-- =============================================
-- ELIMINAR CASO DE LLAMADA (Hard Delete)
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_eliminar_caso_llamada
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Verificar si está en uso
    IF EXISTS (SELECT 1 FROM comercial.cliente_contactos WHERE caso_id = @Id)
    BEGIN
        RAISERROR('No se puede eliminar: el caso está en uso por contactos.', 16, 1);
        RETURN;
    END
    
    DELETE FROM comercial.casos_llamada WHERE id = @Id;
END
GO

PRINT '✓ CRUD Casos Llamada creado';
GO
