-- =========================================================================
-- 1. CREACIÓN DE CATÁLOGOS COMERCIALES
-- =========================================================================

-- Catálogo: Tipo de Carga (FCL, LCL, AEREO, COURIER)
IF OBJECT_ID('comercial.tipo_carga', 'U') IS NULL
BEGIN
    CREATE TABLE comercial.tipo_carga (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        nombre     VARCHAR(20) NOT NULL UNIQUE,
        orden      INT NOT NULL,
        is_active  BIT NOT NULL DEFAULT 1
    );
    INSERT INTO comercial.tipo_carga (nombre, orden) VALUES
        ('FCL', 1), ('LCL', 2), ('AEREO', 3), ('COURIER', 4);
END;

-- Catálogo: Tipo de Servicio Comercial (INTEGRAL, ADUANA, CARGA, COURIER)
IF OBJECT_ID('comercial.tipo_servicio_comercial', 'U') IS NULL
BEGIN
    CREATE TABLE comercial.tipo_servicio_comercial (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        nombre     VARCHAR(30) NOT NULL UNIQUE,
        orden      INT NOT NULL,
        is_active  BIT NOT NULL DEFAULT 1
    );
    INSERT INTO comercial.tipo_servicio_comercial (nombre, orden) VALUES
        ('INTEGRAL', 1), ('ADUANA', 2), ('CARGA', 3), ('COURIER', 4);
END;

-- Catálogo: Segmentación de Cierre (Origen del Cierre a nivel de Cotización/Venta)
IF OBJECT_ID('comercial.segmentacion_cierre', 'U') IS NULL
BEGIN
    CREATE TABLE comercial.segmentacion_cierre (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        nombre     VARCHAR(30) NOT NULL UNIQUE,
        orden      INT NOT NULL,
        is_active  BIT NOT NULL DEFAULT 1
    );
    INSERT INTO comercial.segmentacion_cierre (nombre, orden) VALUES
        ('DE_CASA', 1),
        ('BASE_DATOS', 2),
        ('META', 3),
        ('FERIA', 4),
        ('RECOMENDADO', 5),
        ('WHATSAPP', 6),
        ('LEAD_WEB', 7);
END;

-- =========================================================================
-- 2. TABLAS PRINCIPALES DEL PIPELINE KANBAN
-- =========================================================================

-- Tabla: comercial.seguimientos (Tarjetas del Kanban)
IF OBJECT_ID('comercial.seguimientos', 'U') IS NULL
BEGIN
    CREATE TABLE comercial.seguimientos (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id    INT NOT NULL,
        comercial_id  INT NOT NULL,
        titulo        VARCHAR(150) NOT NULL, -- Ej: "Embarque Repuestos China"
        estado        VARCHAR(20) NOT NULL DEFAULT 'SEGUIMIENTO', -- 'SEGUIMIENTO', 'CERRADO', 'CAIDO'
        
        -- Datos de caída (si la negociación total se cae)
        motivo_caida  NVARCHAR(500) NULL,
        
        -- Auditoría y Trazabilidad
        is_active     BIT NOT NULL DEFAULT 1,
        created_at    DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at    DATETIMEOFFSET NULL,
        created_by    INT NULL,
        updated_by    INT NULL,
        
        CONSTRAINT fk_seg_cliente FOREIGN KEY (cliente_id) 
            REFERENCES comercial.clientes(id),
        CONSTRAINT fk_seg_comercial FOREIGN KEY (comercial_id) 
            REFERENCES seg.usuarios(id),
        CONSTRAINT fk_seg_creator FOREIGN KEY (created_by) 
            REFERENCES seg.usuarios(id),
        CONSTRAINT fk_seg_updater FOREIGN KEY (updated_by) 
            REFERENCES seg.usuarios(id),
        CONSTRAINT chk_seg_estado 
            CHECK (estado IN ('SEGUIMIENTO', 'CERRADO', 'CAIDO'))
    );
    
    CREATE INDEX ix_seg_cliente ON comercial.seguimientos(cliente_id);
    CREATE INDEX ix_seg_comercial ON comercial.seguimientos(comercial_id);
    CREATE INDEX ix_seg_estado ON comercial.seguimientos(estado);
END;

-- Tabla: comercial.cotizaciones (Ítems/opciones dentro de cada seguimiento)
IF OBJECT_ID('comercial.cotizaciones', 'U') IS NULL
BEGIN
    CREATE TABLE comercial.cotizaciones (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        seguimiento_id    INT NOT NULL,
        
        -- Detalles de carga
        tipo_carga_id     INT NOT NULL,
        tipo_servicio_id  INT NOT NULL,
        tipo_operacion    VARCHAR(20) NULL, -- CHECK: 'IMPORTACION', 'EXPORTACION'
        pais_origen       VARCHAR(50) NULL,
        
        -- Estado de la cotización/opción individual
        estado            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'DESCARTADO'
        
        -- Datos de cierre (cuando pasa a ACEPTADO)
        codigo_operacion  VARCHAR(20) NULL, -- Código COR asignado por SISPAC
        segmentacion_id   INT NULL,         -- Atribución específica del cierre (Meta, Web, etc.)
        fecha_cierre      DATE NULL,
        
        is_active         BIT NOT NULL DEFAULT 1,
        created_at        DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at        DATETIMEOFFSET NULL,
        
        CONSTRAINT fk_cot_seguimiento FOREIGN KEY (seguimiento_id) 
            REFERENCES comercial.seguimientos(id),
        CONSTRAINT fk_cot_tipo_carga FOREIGN KEY (tipo_carga_id) 
            REFERENCES comercial.tipo_carga(id),
        CONSTRAINT fk_cot_tipo_servicio FOREIGN KEY (tipo_servicio_id) 
            REFERENCES comercial.tipo_servicio_comercial(id),
        CONSTRAINT fk_cot_segmentacion FOREIGN KEY (segmentacion_id) 
            REFERENCES comercial.segmentacion_cierre(id),
        CONSTRAINT chk_cot_estado 
            CHECK (estado IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'DESCARTADO'))
    );
    
    CREATE INDEX ix_cot_seguimiento ON comercial.cotizaciones(seguimiento_id);
    CREATE INDEX ix_cot_estado ON comercial.cotizaciones(estado);
END;

-- =========================================================================
-- 3. AUDITORÍA, COMENTARIOS Y HISTORIAL KANBAN
-- =========================================================================

-- Tabla: comercial.seguimiento_comentarios (Gestiones registradas por el comercial)
IF OBJECT_ID('comercial.seguimiento_comentarios', 'U') IS NULL
BEGIN
    CREATE TABLE comercial.seguimiento_comentarios (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        seguimiento_id    INT NOT NULL,
        comentario        NVARCHAR(MAX) NOT NULL,
        medio_gestion_id  INT NULL, -- Relación directa con comercial.medio_gestion (Llamada, WhatsApp, Correo)
        created_at        DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by        INT NULL,
        
        CONSTRAINT fk_seg_com_seguimiento FOREIGN KEY (seguimiento_id) 
            REFERENCES comercial.seguimientos(id),
        CONSTRAINT fk_seg_com_medio FOREIGN KEY (medio_gestion_id)
            REFERENCES comercial.medio_gestion(id),
        CONSTRAINT fk_seg_com_creator FOREIGN KEY (created_by) 
            REFERENCES seg.usuarios(id)
    );
    
    CREATE INDEX ix_seg_com_seguimiento ON comercial.seguimiento_comentarios(seguimiento_id);
END;

-- Tabla: comercial.seguimiento_historial (Auditoría de transiciones de columnas en el Kanban)
IF OBJECT_ID('comercial.seguimiento_historial', 'U') IS NULL
BEGIN
    CREATE TABLE comercial.seguimiento_historial (
        id                         INT IDENTITY(1,1) PRIMARY KEY,
        seguimiento_id             INT NOT NULL,
        estado_anterior            VARCHAR(20) NULL,
        estado_nuevo               VARCHAR(20) NOT NULL,
        comentario                 NVARCHAR(500) NULL,
        tiempo_en_estado_anterior  INT NULL, -- Tiempo acumulado en minutos
        fecha_cambio               DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        registrado_por             INT NULL,
        
        CONSTRAINT fk_seg_hist_seguimiento FOREIGN KEY (seguimiento_id) 
            REFERENCES comercial.seguimientos(id),
        CONSTRAINT fk_seg_hist_usuario FOREIGN KEY (registrado_por) 
            REFERENCES seg.usuarios(id)
    );
    
    CREATE INDEX ix_seg_hist_seguimiento ON comercial.seguimiento_historial(seguimiento_id);
END;

-- =========================================================================
-- 4. INCIDENCIAS OPERATIVAS COMERCIALES
-- =========================================================================

-- Tabla: comercial.incidencias
IF OBJECT_ID('comercial.incidencias', 'U') IS NULL
BEGIN
    CREATE TABLE comercial.incidencias (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        seguimiento_id    INT NULL, -- Vinculación opcional a una tarjeta del Kanban
        cliente_id        INT NOT NULL,
        comercial_id      INT NOT NULL,
        codigo_operacion  VARCHAR(20) NULL, -- Código COR al que se le asocia la incidencia
        
        descripcion       NVARCHAR(MAX) NOT NULL, -- Detalle del reclamo/incidencia
        observacion       NVARCHAR(MAX) NULL,
        estado            VARCHAR(20) NOT NULL DEFAULT 'ABIERTA', -- 'ABIERTA', 'EN_INVESTIGACION', 'RESUELTA'
        resolucion        NVARCHAR(MAX) NULL,     -- Qué solución o acuerdo se tomó
        fecha_resolucion  DATE NULL,
        
        is_active         BIT NOT NULL DEFAULT 1,
        created_at        DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at        DATETIMEOFFSET NULL,
        created_by        INT NULL,
        updated_by        INT NULL,
        
        CONSTRAINT fk_inc_seguimiento FOREIGN KEY (seguimiento_id) 
            REFERENCES comercial.seguimientos(id),
        CONSTRAINT fk_inc_cliente FOREIGN KEY (cliente_id) 
            REFERENCES comercial.clientes(id),
        CONSTRAINT fk_inc_comercial FOREIGN KEY (comercial_id) 
            REFERENCES seg.usuarios(id),
        CONSTRAINT fk_inc_creator FOREIGN KEY (created_by) 
            REFERENCES seg.usuarios(id),
        CONSTRAINT fk_inc_updater FOREIGN KEY (updated_by) 
            REFERENCES seg.usuarios(id),
        CONSTRAINT chk_inc_estado 
            CHECK (estado IN ('ABIERTA', 'EN_INVESTIGACION', 'RESUELTA'))
    );
    
    CREATE INDEX ix_inc_cliente ON comercial.incidencias(cliente_id);
    CREATE INDEX ix_inc_comercial ON comercial.incidencias(comercial_id);
    CREATE INDEX ix_inc_estado ON comercial.incidencias(estado);
END;

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
IF NOT EXISTS (SELECT 1 FROM core.empresas WHERE ruc = '20601234567')
BEGIN
    INSERT INTO core.empresas (razon_social, ruc, oficina, modulo)
    VALUES ('CORBAN TRANS LOGISTIC S.A.C.', '20601234567', 'Oficina Principal - Lima', 'Comercial');
    PRINT 'Empresa semilla Corban insertada.';
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
DECLARE @corban_id INT;
DECLARE @ebl_id INT;

SELECT @corban_id = id FROM core.empresas WHERE razon_social LIKE '%CORBAN%';
SELECT @ebl_id = id FROM core.empresas WHERE razon_social LIKE '%EBL%';

IF @corban_id IS NOT NULL
BEGIN
    UPDATE c
    SET c.empresa_id = @corban_id
    FROM comercial.clientes c
    INNER JOIN seg.usuarios u ON c.comercial_encargado_id = u.id
    INNER JOIN adm.empleados e ON u.empleado_id = e.id
    WHERE e.empresa LIKE '%CORBAN%' AND c.empresa_id IS NULL;
    PRINT 'Clientes existentes actualizados con empresa Corban.';
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

