-- =====================================================
-- SP_COMERCIAL_BASE - Stored Procedures para Comercial/Base
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- =====================================================

USE SGI_GrupoCorban;
GO

-- =====================================================
-- 1. SEEDS PARA CASOS_LLAMADA
-- =====================================================
PRINT '>> Insertando Casos de Llamada...';

-- Limpiar tabla si existe data
IF NOT EXISTS (SELECT 1 FROM comercial.casos_llamada WHERE nombre = 'Carta de presentación enviada')
BEGIN
    -- Casos POSITIVOS (contestado = 1, is_positive = 1)
    INSERT INTO comercial.casos_llamada (nombre, contestado) VALUES
        ('Carta de presentación enviada', 1),
        ('Cotizado', 1),
        ('Pendiente a cotizar', 1),
        ('Interesado', 1),
        ('Agendado', 1);

    -- Casos NEGATIVOS (contestado puede variar, is_positive = 0)
    INSERT INTO comercial.casos_llamada (nombre, contestado) VALUES
        ('Número no existe', 0),
        ('Cuelga al escuchar', 1),
        ('Número equivocado', 1),
        ('Número no pertenece a la empresa', 1),
        ('Número no es del área', 1),
        ('No realiza importaciones', 1),
        ('No interesado', 1);

    PRINT '✓ Casos de Llamada insertados';
END
ELSE
    PRINT '⚠ Casos de Llamada ya existen';
GO

-- =====================================================
-- 2. AGREGAR COLUMNA is_positive A casos_llamada
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('comercial.casos_llamada') AND name = 'is_positive')
BEGIN
    ALTER TABLE comercial.casos_llamada ADD is_positive BIT NOT NULL DEFAULT 0;
    PRINT '✓ Columna is_positive agregada';
END
GO

-- Actualizar casos positivos
UPDATE comercial.casos_llamada SET is_positive = 1 
WHERE nombre IN ('Carta de presentación enviada', 'Cotizado', 'Pendiente a cotizar', 'Interesado', 'Agendado');
GO

-- =====================================================
-- 3. AGREGAR COLUMNA comentario A cliente_contactos
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('comercial.cliente_contactos') AND name = 'comentario')
BEGIN
    ALTER TABLE comercial.cliente_contactos ADD comentario NVARCHAR(500);
    PRINT '✓ Columna comentario agregada a cliente_contactos';
END
GO

-- =====================================================
-- 4. SP PARA OBTENER CONTACTOS ASIGNADOS AL COMERCIAL
-- =====================================================
CREATE OR ALTER PROCEDURE comercial.usp_obtener_mis_contactos_asignados
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        cc.id,
        cc.ruc,
        COALESCE(ri.razon_social, cl.razon_social, 'Sin razón social') as razon_social,
        cc.telefono,
        cc.correo,
        CASE WHEN caso.contestado = 1 THEN 1 ELSE 0 END as contesto,
        cc.caso_id,
        caso.nombre as caso_nombre,
        cc.comentario,
        cc.estado,
        cc.fecha_asignacion
    FROM comercial.cliente_contactos cc
    LEFT JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
    LEFT JOIN comercial.clientes cl ON cc.ruc = cl.ruc
    LEFT JOIN comercial.casos_llamada caso ON cc.caso_id = caso.id
    WHERE cc.asignado_a = @UsuarioId
      AND cc.estado = 'ASIGNADO'
      AND cc.is_active = 1
    ORDER BY cc.fecha_asignacion DESC;
END
GO

-- =====================================================
-- 5. SP PARA ASIGNAR LOTE DE LEADS (ACTUALIZADO)
-- Incluye filtros de país y partida arancelaria
-- =====================================================
CREATE OR ALTER PROCEDURE comercial.usp_asignar_lote_leads
    @UsuarioId INT,
    @CantidadEmpresas INT = 50,
    @PaisOrigen NVARCHAR(100) = NULL,
    @PartidaArancelaria NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Verificar que el usuario no tenga leads pendientes
    DECLARE @LeadsPendientes INT;
    SELECT @LeadsPendientes = COUNT(*)
    FROM comercial.cliente_contactos
    WHERE asignado_a = @UsuarioId AND estado = 'ASIGNADO' AND is_active = 1;
    
    IF @LeadsPendientes > 0
    BEGIN
        RAISERROR('Ya tienes %d contactos pendientes. Envía feedback primero.', 16, 1, @LeadsPendientes);
        RETURN;
    END

    -- 1. Obtener RUCs de empresas disponibles con filtros
    DECLARE @RucsDisponibles TABLE (ruc CHAR(11));
    
    INSERT INTO @RucsDisponibles (ruc)
    SELECT TOP (@CantidadEmpresas) cc.ruc
    FROM (
        SELECT DISTINCT cc.ruc
        FROM comercial.cliente_contactos cc
        -- JOIN con transacciones para filtros
        INNER JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
        WHERE 
            cc.is_client = 0
            AND cc.is_active = 1
            AND cc.estado = 'DISPONIBLE'
            -- Filtro país origen
            AND (@PaisOrigen IS NULL OR ri.paises_origen LIKE '%' + @PaisOrigen + '%')
            -- Filtro partida arancelaria
            AND (@PartidaArancelaria IS NULL OR ri.partida_arancelaria_cod LIKE '%' + @PartidaArancelaria + '%')
            -- Excluir RUCs que ya tienen contactos en gestión
            AND cc.ruc NOT IN (
                SELECT DISTINCT ruc 
                FROM comercial.cliente_contactos 
                WHERE estado IN ('EN_GESTION', 'ASIGNADO') 
                  AND is_active = 1
            )
    ) AS RucsUnicos
    INNER JOIN comercial.cliente_contactos cc ON RucsUnicos.ruc = cc.ruc
    GROUP BY cc.ruc
    ORDER BY NEWID();

    -- 2. Asignar UN contacto por cada RUC seleccionado
    UPDATE c
    SET 
        asignado_a = @UsuarioId,
        fecha_asignacion = GETDATE(),
        lote_asignacion = ISNULL(lote_asignacion, 0) + 1,
        estado = 'ASIGNADO',
        caso_id = NULL,
        comentario = NULL
    FROM comercial.cliente_contactos c
    WHERE c.id IN (
        SELECT MIN(cc.id)
        FROM comercial.cliente_contactos cc
        WHERE cc.ruc IN (SELECT ruc FROM @RucsDisponibles)
          AND cc.is_active = 1
          AND cc.estado = 'DISPONIBLE'
        GROUP BY cc.ruc
    );

    -- 3. Marcar los OTROS contactos de esas empresas como 'EN_GESTION'
    UPDATE comercial.cliente_contactos
    SET estado = 'EN_GESTION'
    WHERE ruc IN (SELECT ruc FROM @RucsDisponibles)
      AND estado = 'DISPONIBLE'
      AND is_active = 1;

    -- 4. Retornar los contactos asignados
    EXEC comercial.usp_obtener_mis_contactos_asignados @UsuarioId;
END
GO

-- =====================================================
-- 6. SP PARA ACTUALIZAR FEEDBACK DE UN CONTACTO
-- =====================================================
CREATE OR ALTER PROCEDURE comercial.usp_actualizar_feedback_contacto
    @ContactoId INT,
    @CasoId INT,
    @Comentario NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Actualizar el contacto
    UPDATE comercial.cliente_contactos
    SET 
        caso_id = @CasoId,
        comentario = @Comentario,
        updated_at = GETDATE()
    WHERE id = @ContactoId;
    
    SELECT 1 as success;
END
GO

-- =====================================================
-- 7. SP PARA ENVIAR FEEDBACK COMPLETO
-- Procesa todos los contactos asignados y los marca como gestionados
-- =====================================================
CREATE OR ALTER PROCEDURE comercial.usp_enviar_feedback_lote
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Verificar que todos los contactos tengan feedback
    DECLARE @SinFeedback INT;
    SELECT @SinFeedback = COUNT(*)
    FROM comercial.cliente_contactos
    WHERE asignado_a = @UsuarioId 
      AND estado = 'ASIGNADO' 
      AND is_active = 1
      AND (caso_id IS NULL OR comentario IS NULL OR comentario = '');
    
    IF @SinFeedback > 0
    BEGIN
        RAISERROR('Tienes %d contactos sin feedback completo (caso y comentario).', 16, 1, @SinFeedback);
        RETURN;
    END
    
    -- Obtener RUCs de contactos asignados
    DECLARE @RucsAsignados TABLE (ruc CHAR(11), caso_id INT, is_positive BIT);
    
    INSERT INTO @RucsAsignados (ruc, caso_id, is_positive)
    SELECT cc.ruc, cc.caso_id, ISNULL(caso.is_positive, 0)
    FROM comercial.cliente_contactos cc
    LEFT JOIN comercial.casos_llamada caso ON cc.caso_id = caso.id
    WHERE cc.asignado_a = @UsuarioId 
      AND cc.estado = 'ASIGNADO' 
      AND cc.is_active = 1;
    
    -- Para casos POSITIVOS: is_client = 1, otros contactos a GESTIONADO
    UPDATE comercial.cliente_contactos
    SET is_client = 1
    WHERE asignado_a = @UsuarioId 
      AND estado = 'ASIGNADO'
      AND ruc IN (SELECT ruc FROM @RucsAsignados WHERE is_positive = 1);
    
    UPDATE comercial.cliente_contactos
    SET estado = 'GESTIONADO'
    WHERE ruc IN (SELECT ruc FROM @RucsAsignados WHERE is_positive = 1)
      AND estado = 'EN_GESTION'
      AND is_active = 1;
    
    -- Para casos NEGATIVOS: otros contactos vuelven a DISPONIBLE
    UPDATE comercial.cliente_contactos
    SET estado = 'DISPONIBLE'
    WHERE ruc IN (SELECT ruc FROM @RucsAsignados WHERE is_positive = 0)
      AND estado = 'EN_GESTION'
      AND is_active = 1;
    
    -- Marcar contactos principales como GESTIONADO
    UPDATE comercial.cliente_contactos
    SET estado = 'GESTIONADO'
    WHERE asignado_a = @UsuarioId 
      AND estado = 'ASIGNADO'
      AND is_active = 1;
    
    SELECT @@ROWCOUNT as contactos_procesados;
END
GO

-- =====================================================
-- 8. SP PARA OBTENER FILTROS DISPONIBLES (PAÍSES Y PARTIDAS)
-- =====================================================
CREATE OR ALTER PROCEDURE comercial.usp_obtener_filtros_base
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Países únicos (top 50 más frecuentes)
    SELECT TOP 50 
        TRIM(value) as pais,
        COUNT(*) as cantidad
    FROM comercial.registro_importaciones
    CROSS APPLY STRING_SPLIT(paises_origen, ',')
    WHERE TRIM(value) != ''
    GROUP BY TRIM(value)
    ORDER BY COUNT(*) DESC;
    
    -- Partidas únicas (top 50 más frecuentes) - simplificado a 4 dígitos
    SELECT TOP 50 
        LEFT(TRIM(value), 4) as partida,
        COUNT(*) as cantidad
    FROM comercial.registro_importaciones
    CROSS APPLY STRING_SPLIT(partida_arancelaria_cod, ',')
    WHERE TRIM(value) != ''
    GROUP BY LEFT(TRIM(value), 4)
    ORDER BY COUNT(*) DESC;
END
GO

PRINT '';
PRINT '=====================================================';
PRINT '✓ SPs para Comercial/Base creados correctamente';
PRINT '=====================================================';
GO
