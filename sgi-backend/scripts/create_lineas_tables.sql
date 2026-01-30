-- Script para crear las tablas de Líneas Corporativas
-- Ejecutar en SQL Server

-- Tabla principal de líneas corporativas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lineas_corporativas' AND schema_id = SCHEMA_ID('adm'))
BEGIN
    CREATE TABLE adm.lineas_corporativas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        numero VARCHAR(20) NOT NULL UNIQUE,
        gmail VARCHAR(100) NOT NULL UNIQUE,
        operador VARCHAR(30) NULL,
        [plan] VARCHAR(50) NULL,  -- Escapado porque 'plan' es palabra reservada
        activo_id INT NULL REFERENCES adm.activos(id),
        empleado_id INT NULL REFERENCES adm.empleados(id),
        fecha_asignacion DATETIME NULL,
        is_active BIT NOT NULL DEFAULT 1,
        observaciones VARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME NULL
    );
    PRINT 'Tabla adm.lineas_corporativas creada correctamente';
END
ELSE
BEGIN
    PRINT 'La tabla adm.lineas_corporativas ya existe';
END
GO

-- Tabla de historial de cambios de líneas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'linea_historial' AND schema_id = SCHEMA_ID('adm'))
BEGIN
    CREATE TABLE adm.linea_historial (
        id INT IDENTITY(1,1) PRIMARY KEY,
        linea_id INT NOT NULL REFERENCES adm.lineas_corporativas(id),
        tipo_cambio VARCHAR(30) NOT NULL, -- 'CREACION', 'CAMBIO_CELULAR', 'ASIGNACION', 'DESASIGNACION', 'BAJA'
        activo_anterior_id INT NULL REFERENCES adm.activos(id),
        activo_nuevo_id INT NULL REFERENCES adm.activos(id),
        empleado_anterior_id INT NULL REFERENCES adm.empleados(id),
        empleado_nuevo_id INT NULL REFERENCES adm.empleados(id),
        observaciones VARCHAR(500) NULL,
        registrado_por INT NULL REFERENCES seg.usuarios(id),
        fecha_cambio DATETIME NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla adm.linea_historial creada correctamente';
END
ELSE
BEGIN
    PRINT 'La tabla adm.linea_historial ya existe';
END
GO

-- Índices para mejor rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_lineas_corporativas_empleado')
    CREATE INDEX IX_lineas_corporativas_empleado ON adm.lineas_corporativas(empleado_id) WHERE empleado_id IS NOT NULL;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_lineas_corporativas_activo')
    CREATE INDEX IX_lineas_corporativas_activo ON adm.lineas_corporativas(activo_id) WHERE activo_id IS NOT NULL;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_linea_historial_linea')
    CREATE INDEX IX_linea_historial_linea ON adm.linea_historial(linea_id);
GO

PRINT 'Script de líneas corporativas ejecutado correctamente';
