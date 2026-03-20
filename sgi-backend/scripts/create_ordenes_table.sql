-- Migración: Centro de Carga de Órdenes
-- Tabla para importar órdenes desde SISPAC y SINTAD

-- 1. Crear tabla de órdenes
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'ordenes' AND s.name = 'comercial')
BEGIN
    CREATE TABLE comercial.ordenes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        numero_base INT NOT NULL,
        empresa_origen VARCHAR(10) NOT NULL,  -- CORBAN / EBL
        codigo_sispac VARCHAR(20) NULL,
        codigo_sintad VARCHAR(20) NULL,
        nro_orden_sintad VARCHAR(20) NULL,
        fecha_ingreso DATE NULL,
        tipo_servicio VARCHAR(30) NOT NULL,  -- CARGA, LOGISTICO, ADUANAS, INTEGRAL
        consignatario VARCHAR(255) NULL,
        comercial_iniciales VARCHAR(10) NULL,
        comercial_id INT NULL FOREIGN KEY REFERENCES seg.usuarios(id),
        cliente_id INT NULL FOREIGN KEY REFERENCES comercial.clientes(id),
        estado_sispac VARCHAR(20) NULL,
        estado_sintad VARCHAR(30) NULL,
        es_casa BIT NOT NULL DEFAULT 0,
        periodo VARCHAR(7) NOT NULL,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NULL,
        importado_por INT NULL FOREIGN KEY REFERENCES seg.usuarios(id),
        CONSTRAINT uq_orden_numero_empresa UNIQUE (numero_base, empresa_origen)
    );
    CREATE INDEX ix_ordenes_periodo ON comercial.ordenes(periodo);
    CREATE INDEX ix_ordenes_numero_base ON comercial.ordenes(numero_base);
    PRINT 'Tabla comercial.ordenes creada exitosamente';
END;

-- 2. Agregar campo iniciales_sispac a empleados
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('adm.empleados') AND name = 'iniciales_sispac')
BEGIN
    ALTER TABLE adm.empleados ADD iniciales_sispac VARCHAR(10) NULL;
    PRINT 'Campo iniciales_sispac agregado a adm.empleados';
END;
