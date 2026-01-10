USE SGI_GrupoCorban
GO

/* =====================================================
   UBIGEO - DEPARTAMENTOS, PROVINCIAS, DISTRITOS
   Para selects en cascada
   ===================================================== */

/* =====================================================
   1. LISTAR DEPARTAMENTOS (Geográficos)
   ===================================================== */
CREATE OR ALTER PROCEDURE core.usp_listar_departamentos_geo
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT id, nombre, ubigeo
    FROM core.departamentos
    ORDER BY nombre ASC;
END
GO

/* =====================================================
   2. LISTAR PROVINCIAS POR DEPARTAMENTO
   ===================================================== */
CREATE OR ALTER PROCEDURE core.usp_listar_provincias
    @departamento_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT id, nombre, departamento_id, ubigeo
    FROM core.provincias
    WHERE @departamento_id IS NULL OR departamento_id = @departamento_id
    ORDER BY nombre ASC;
END
GO

/* =====================================================
   3. LISTAR DISTRITOS POR PROVINCIA
   ===================================================== */
CREATE OR ALTER PROCEDURE core.usp_listar_distritos
    @provincia_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT id, nombre, provincia_id, ubigeo
    FROM core.distritos
    WHERE @provincia_id IS NULL OR provincia_id = @provincia_id
    ORDER BY nombre ASC;
END
GO
