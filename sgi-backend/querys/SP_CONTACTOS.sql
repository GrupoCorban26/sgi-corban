USE SGI_GrupoCorban;
GO

-- =============================================
-- SP PARA LISTAR CONTACTOS POR RUC
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_listar_contactos_por_ruc
    @Ruc CHAR(11)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM comercial.cliente_contactos
    WHERE ruc = @Ruc AND is_active = 1
    ORDER BY created_at DESC;
END
GO

-- =============================================
-- SP PARA CREAR CONTACTO
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_crear_contacto
    @Ruc CHAR(11),
    @Cargo NVARCHAR(100) = NULL,
    @Telefono VARCHAR(20),
    @Email NVARCHAR(100) = NULL,
    @Origen VARCHAR(30) = 'MANUAL',
    @IsClient BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validar duplicado exacto
    IF NOT EXISTS (SELECT 1 FROM comercial.cliente_contactos WHERE ruc = @Ruc AND telefono = @Telefono AND is_active = 1)
    BEGIN
        INSERT INTO comercial.cliente_contactos (ruc, cargo, telefono, email, origen, is_client, is_active, estado)
        VALUES (@Ruc, @Cargo, @Telefono, @Email, @Origen, @IsClient, 1, 'DISPONIBLE');
        
        SELECT CAST(SCOPE_IDENTITY() as INT) as id;
    END
    ELSE
    BEGIN
        -- Ya existe, retornamos el ID existente
        SELECT id FROM comercial.cliente_contactos WHERE ruc = @Ruc AND telefono = @Telefono AND is_active = 1;
    END
END
GO

-- =============================================
-- SP PARA ACTUALIZAR CONTACTO
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_actualizar_contacto
    @Id INT,
    @Cargo NVARCHAR(100) = NULL,
    @Telefono VARCHAR(20) = NULL,
    @Email NVARCHAR(100) = NULL,
    @IsClient BIT = NULL,
    @Estado VARCHAR(30) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE comercial.cliente_contactos
    SET 
        cargo = COALESCE(@Cargo, cargo),
        telefono = COALESCE(@Telefono, telefono),
        email = COALESCE(@Email, email),
        is_client = COALESCE(@IsClient, is_client),
        estado = COALESCE(@Estado, estado),
        updated_at = GETDATE()
    WHERE id = @Id;
END
GO

-- =============================================
-- SP PARA ELIMINAR CONTACTO (Soft Delete)
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_eliminar_contacto
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE comercial.cliente_contactos
    SET is_active = 0, updated_at = GETDATE()
    WHERE id = @Id;
END
GO

-- =============================================
-- SP PARA ASIGNAR LOTE DE LEADS (Lógica de Negocio)
-- Asigna contactos de 50 EMPRESAS DIFERENTES al usuario
-- Si una empresa (RUC) ya tiene algún contacto asignado o en gestión,
-- TODOS sus contactos quedan bloqueados para otros comerciales.
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_asignar_lote_leads
    @UsuarioId INT,
    @CantidadEmpresas INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Obtener RUCs de empresas disponibles (sin ningún contacto asignado/en gestión)
    --    Limitamos a @CantidadEmpresas empresas únicas
    DECLARE @RucsDisponibles TABLE (ruc CHAR(11));
    
    INSERT INTO @RucsDisponibles (ruc)
    SELECT TOP (@CantidadEmpresas) ruc
    FROM (
        SELECT DISTINCT ruc
        FROM comercial.cliente_contactos
        WHERE 
            is_client = 0                           -- Solo no-clientes (prospectos)
            AND is_active = 1                       -- Activos
            AND estado = 'DISPONIBLE'               -- Estado disponible
            AND ruc NOT IN (                        -- Excluir RUCs que ya tienen contactos en gestión
                SELECT DISTINCT ruc 
                FROM comercial.cliente_contactos 
                WHERE estado IN ('EN_GESTION', 'ASIGNADO') 
                  AND is_active = 1
            )
    ) AS RucsUnicos
    ORDER BY NEWID();  -- Aleatorio para distribución justa

    -- 2. Asignar UN contacto por cada RUC seleccionado al usuario
    UPDATE c
    SET 
        asignado_a = @UsuarioId,
        fecha_asignacion = GETDATE(),
        lote_asignacion = ISNULL(lote_asignacion, 0) + 1,
        estado = 'ASIGNADO'
    FROM comercial.cliente_contactos c
    WHERE c.id IN (
        -- Seleccionar solo el primer contacto de cada RUC
        SELECT MIN(cc.id)
        FROM comercial.cliente_contactos cc
        WHERE cc.ruc IN (SELECT ruc FROM @RucsDisponibles)
          AND cc.is_active = 1
          AND cc.estado = 'DISPONIBLE'
        GROUP BY cc.ruc
    );

    -- 3. Marcar los OTROS contactos de esas mismas empresas como 'EN_GESTION'
    --    para que no caigan a otro comercial
    UPDATE comercial.cliente_contactos
    SET estado = 'EN_GESTION'
    WHERE ruc IN (SELECT ruc FROM @RucsDisponibles)
      AND estado = 'DISPONIBLE'
      AND is_active = 1;

    -- 4. Retornar los contactos asignados al usuario
    SELECT *
    FROM comercial.cliente_contactos
    WHERE asignado_a = @UsuarioId
      AND estado = 'ASIGNADO'
      AND is_active = 1
    ORDER BY fecha_asignacion DESC;
END
GO

-- =============================================
-- SP PARA ACTUALIZAR ESTADO DE LLAMADA
-- El comercial actualiza el resultado de la llamada
-- =============================================
CREATE OR ALTER PROCEDURE comercial.usp_actualizar_estado_llamada
    @ContactoId INT,
    @Estado VARCHAR(30),    -- CONTESTADO, NO_CONTESTO, NO_EXISTE, INTERESADO, RECHAZADO, etc.
    @Comentario NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE comercial.cliente_contactos
    SET 
        estado = @Estado,
        updated_at = GETDATE()
    WHERE id = @ContactoId;
    
    -- Si el estado es final (CONTESTADO, NO_EXISTE, RECHAZADO), 
    -- liberar otros contactos de la misma empresa
    IF @Estado IN ('CONTESTADO', 'NO_EXISTE', 'RECHAZADO', 'INTERESADO')
    BEGIN
        DECLARE @Ruc CHAR(11);
        SELECT @Ruc = ruc FROM comercial.cliente_contactos WHERE id = @ContactoId;
        
        -- Liberar los contactos en gestión de esta empresa
        UPDATE comercial.cliente_contactos
        SET estado = 'DISPONIBLE'
        WHERE ruc = @Ruc 
          AND estado = 'EN_GESTION'
          AND is_active = 1;
    END
END
GO
