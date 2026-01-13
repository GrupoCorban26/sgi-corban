USE SGI_GrupoCorban;
GO

-- =============================================
-- SP PARA LISTAR IMPORTACIONES (Paginado + Búsqueda)
-- Retorna datos Y total en result sets separados
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_listar_importaciones
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SearchTerm NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    DECLARE @TotalRecords INT;

    -- Contar total
    SELECT @TotalRecords = COUNT(*)
    FROM comercial.registro_importaciones
    WHERE (@SearchTerm IS NULL OR 
           ruc LIKE '%' + @SearchTerm + '%' OR 
           razon_social LIKE '%' + @SearchTerm + '%');

    -- Retornar total como primer result set
    SELECT @TotalRecords AS TotalRecords;

    -- Obtener registros como segundo result set
    SELECT 
        id,
        ruc,
        anio,
        razon_social,
        aduanas,
        via_transporte,
        paises_origen,
        puertos_embarque,
        embarcadores,
        agente_aduanas,
        partida_arancelaria_cod,
        partida_arancelaria_descripcion,
        fob_min,
        fob_max,
        fob_prom,
        fob_anual,
        total_operaciones,
        cantidad_agentes,
        cantidad_paises,
        cantidad_partidas,
        primera_importacion,
        ultima_importacion
    FROM comercial.registro_importaciones
    WHERE (@SearchTerm IS NULL OR 
           ruc LIKE '%' + @SearchTerm + '%' OR 
           razon_social LIKE '%' + @SearchTerm + '%')
    ORDER BY anio DESC, fob_anual DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- =============================================
-- SP PARA LIMPIAR TABLA IMPORTACIONES
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_limpiar_registro_importaciones
AS
BEGIN
    SET NOCOUNT ON;
    TRUNCATE TABLE comercial.registro_importaciones;
END
GO
