-- ============================================================
-- Script: Agregar IDENTITY a comercial.clientes.id
-- Problema: La columna 'id' no tiene IDENTITY, lo que causa
--           IntegrityError al insertar nuevos clientes.
-- Ejecutar en: Servidor de Base de Datos
-- ============================================================

-- 1. Verificar estado actual (ejecutar primero para confirmar el problema)
SELECT 
    COLUMNPROPERTY(OBJECT_ID('comercial.clientes'), 'id', 'IsIdentity') AS tiene_identity,
    MAX(id) AS max_id_actual,
    COUNT(*) AS total_registros
FROM comercial.clientes;
GO

-- Si tiene_identity = 0, continuar con el script.
-- Si tiene_identity = 1, NO es necesario ejecutar el resto.

-- ============================================================
-- 2. Recrear la tabla con IDENTITY
-- ============================================================

BEGIN TRANSACTION;

-- 2a. Crear tabla temporal con la misma estructura pero CON IDENTITY
CREATE TABLE comercial.clientes_temp (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ruc VARCHAR(11),
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    direccion_fiscal VARCHAR(255),
    distrito_id INT,
    area_encargada_id INT,
    comercial_encargado_id INT,
    ultimo_contacto DATETIMEOFFSET,
    comentario_ultima_llamada VARCHAR(500),
    proxima_fecha_contacto DATE,
    motivo_perdida VARCHAR(50),
    fecha_perdida DATE,
    fecha_reactivacion DATE,
    tipo_estado VARCHAR(20) NOT NULL DEFAULT 'PROSPECTO',
    origen VARCHAR(50),
    sub_origen VARCHAR(100),
    inbox_origen_id INT,
    is_active BIT NOT NULL DEFAULT 1,
    fecha_primer_contacto DATETIMEOFFSET,
    fecha_conversion_cliente DATETIMEOFFSET,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET,
    created_by INT,
    updated_by INT
);

-- 2b. Copiar datos existentes preservando los IDs originales
SET IDENTITY_INSERT comercial.clientes_temp ON;

INSERT INTO comercial.clientes_temp (
    id, ruc, razon_social, nombre_comercial, direccion_fiscal,
    distrito_id, area_encargada_id, comercial_encargado_id,
    ultimo_contacto, comentario_ultima_llamada, proxima_fecha_contacto,
    motivo_perdida, fecha_perdida, fecha_reactivacion,
    tipo_estado, origen, sub_origen, inbox_origen_id, is_active,
    fecha_primer_contacto, fecha_conversion_cliente,
    created_at, updated_at, created_by, updated_by
)
SELECT 
    id, ruc, razon_social, nombre_comercial, direccion_fiscal,
    distrito_id, area_encargada_id, comercial_encargado_id,
    ultimo_contacto, comentario_ultima_llamada, proxima_fecha_contacto,
    motivo_perdida, fecha_perdida, fecha_reactivacion,
    tipo_estado, origen, sub_origen, inbox_origen_id, is_active,
    fecha_primer_contacto, fecha_conversion_cliente,
    created_at, updated_at, created_by, updated_by
FROM comercial.clientes;

SET IDENTITY_INSERT comercial.clientes_temp OFF;

-- 2c. Verificar que se copiaron todos los registros
DECLARE @original INT, @copia INT;
SELECT @original = COUNT(*) FROM comercial.clientes;
SELECT @copia = COUNT(*) FROM comercial.clientes_temp;

IF @original <> @copia
BEGIN
    PRINT 'ERROR: No coinciden los registros. Original: ' + CAST(@original AS VARCHAR) + ', Copia: ' + CAST(@copia AS VARCHAR);
    ROLLBACK;
    RETURN;
END

PRINT 'Registros verificados: ' + CAST(@copia AS VARCHAR) + ' copiados correctamente.';

-- 2d. Eliminar FKs que apuntan a comercial.clientes
-- (Citas tienen FK a clientes.id)
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('comercial.citas') AND name LIKE '%clientes%')
BEGIN
    DECLARE @fk_name NVARCHAR(256);
    SELECT @fk_name = name FROM sys.foreign_keys 
    WHERE parent_object_id = OBJECT_ID('comercial.citas') 
    AND referenced_object_id = OBJECT_ID('comercial.clientes');
    
    IF @fk_name IS NOT NULL
        EXEC('ALTER TABLE comercial.citas DROP CONSTRAINT [' + @fk_name + ']');
END

-- 2e. Renombrar tablas
EXEC sp_rename 'comercial.clientes', 'clientes_old';
EXEC sp_rename 'comercial.clientes_temp', 'clientes';

-- 2f. Recrear FKs
ALTER TABLE comercial.citas 
    ADD CONSTRAINT FK_citas_cliente 
    FOREIGN KEY (cliente_id) REFERENCES comercial.clientes(id);

-- 2g. Recrear índice en id (ya tiene PK, agregar índice si es necesario)
-- El PK ya incluye el índice clustered.

COMMIT;

PRINT '============================================';
PRINT 'IDENTITY agregado exitosamente a comercial.clientes';
PRINT '============================================';

-- 3. Verificar resultado final
SELECT 
    COLUMNPROPERTY(OBJECT_ID('comercial.clientes'), 'id', 'IsIdentity') AS tiene_identity,
    IDENT_CURRENT('comercial.clientes') AS identity_actual,
    MAX(id) AS max_id
FROM comercial.clientes;

-- 4. (Opcional) Eliminar tabla vieja después de verificar que todo funciona
-- DROP TABLE comercial.clientes_old;
