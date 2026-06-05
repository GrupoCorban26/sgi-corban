-- ============================================================
-- Script: Migración de Empresas y Unicidad en Clientes
-- Objetivo: Crear la tabla core.empresas, agregar empresa_id a
--            comercial.clientes y configurar la restricción
--            única filtrada de RUC + empresa_id.
-- ============================================================

BEGIN TRANSACTION;

-- 1. Crear la tabla core.empresas si no existe
IF OBJECT_ID('core.empresas', 'U') IS NULL
BEGIN
    CREATE TABLE core.empresas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        razon_social VARCHAR(255) NOT NULL,
        ruc VARCHAR(11) NOT NULL UNIQUE,
        oficina VARCHAR(100),
        modulo VARCHAR(100)
    );
    PRINT 'Tabla core.empresas creada.';
END
ELSE
BEGIN
    PRINT 'La tabla core.empresas ya existe. Omitiendo creación.';
END
GO

-- 2. Insertar registros semilla de empresas si no existen
IF NOT EXISTS (SELECT 1 FROM core.empresas WHERE ruc = '20601111111')
BEGIN
    INSERT INTO core.empresas (razon_social, ruc, oficina, modulo)
    VALUES ('CORBAN ADUANAS S.A.C.', '20601111111', 'Oficina Aduanas - Callao', 'Aduanas');
    PRINT 'Empresa semilla Corban Aduanas insertada.';
END

IF NOT EXISTS (SELECT 1 FROM core.empresas WHERE ruc = '20601234567')
BEGIN
    INSERT INTO core.empresas (razon_social, ruc, oficina, modulo)
    VALUES ('CORBAN TRANS LOGISTIC S.A.C.', '20601234567', 'Oficina Principal - Lima', 'Transporte');
    PRINT 'Empresa semilla Corban Trans Logistic insertada.';
END

IF NOT EXISTS (SELECT 1 FROM core.empresas WHERE ruc = '20607654321')
BEGIN
    INSERT INTO core.empresas (razon_social, ruc, oficina, modulo)
    VALUES ('EBL GROUP S.A.C.', '20607654321', 'Oficina Principal - San Isidro', 'Operaciones');
    PRINT 'Empresa semilla EBL insertada.';
END
GO

-- 3. Agregar columna empresa_id a comercial.clientes si no existe
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('comercial.clientes') AND name = 'empresa_id'
)
BEGIN
    ALTER TABLE comercial.clientes ADD empresa_id INT NULL;
    ALTER TABLE comercial.clientes ADD CONSTRAINT FK_clientes_empresa FOREIGN KEY (empresa_id) REFERENCES core.empresas(id);
    PRINT 'Columna empresa_id y FK agregada a comercial.clientes.';
END
ELSE
BEGIN
    PRINT 'La columna empresa_id ya existe en comercial.clientes. Omitiendo creación.';
END
GO

-- 4. Poblar empresa_id en los clientes existentes basándonos en la empresa de su comercial asignado
DECLARE @corban_aduanas_id INT;
DECLARE @corban_trans_id INT;
DECLARE @ebl_id INT;

SELECT @corban_aduanas_id = id FROM core.empresas WHERE razon_social LIKE '%ADUANAS%';
SELECT @corban_trans_id = id FROM core.empresas WHERE razon_social LIKE '%TRANS%';
SELECT @ebl_id = id FROM core.empresas WHERE razon_social LIKE '%EBL%';

IF @corban_aduanas_id IS NOT NULL
BEGIN
    UPDATE c
    SET c.empresa_id = @corban_aduanas_id
    FROM comercial.clientes c
    INNER JOIN seg.usuarios u ON c.comercial_encargado_id = u.id
    INNER JOIN adm.empleados e ON u.empleado_id = e.id
    WHERE e.empresa LIKE '%Aduanas%' AND c.empresa_id IS NULL;
    PRINT 'Clientes existentes actualizados con empresa Corban Aduanas.';
END

IF @corban_trans_id IS NOT NULL
BEGIN
    UPDATE c
    SET c.empresa_id = @corban_trans_id
    FROM comercial.clientes c
    INNER JOIN seg.usuarios u ON c.comercial_encargado_id = u.id
    INNER JOIN adm.empleados e ON u.empleado_id = e.id
    WHERE e.empresa LIKE '%Trans%' AND c.empresa_id IS NULL;
    PRINT 'Clientes existentes actualizados con empresa Corban Trans Logistic.';
END

IF @ebl_id IS NOT NULL
BEGIN
    UPDATE c
    SET c.empresa_id = @ebl_id
    FROM comercial.clientes c
    INNER JOIN seg.usuarios u ON c.comercial_encargado_id = u.id
    INNER JOIN adm.empleados e ON u.empleado_id = e.id
    WHERE e.empresa LIKE '%EBL%' AND c.empresa_id IS NULL;
    PRINT 'Clientes existentes actualizados con empresa EBL.';
END
GO

-- 5. Crear el índice único filtrado para ruc + empresa_id para clientes activos
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE object_id = OBJECT_ID('comercial.clientes') AND name = 'uq_cliente_active_ruc_empresa'
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX uq_cliente_active_ruc_empresa
    ON comercial.clientes (ruc, empresa_id)
    WHERE is_active = 1 AND ruc IS NOT NULL;
    PRINT 'Índice único filtrado uq_cliente_active_ruc_empresa creado.';
END
ELSE
BEGIN
    PRINT 'El índice uq_cliente_active_ruc_empresa ya existe. Omitiendo creación.';
END
GO

COMMIT TRANSACTION;
PRINT 'Transacción de migración completada exitosamente.';
GO
