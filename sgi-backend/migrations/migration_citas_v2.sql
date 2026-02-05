-- ============================================================
-- MIGRACIÓN: Remodelación del Sistema de Citas v2
-- Fecha: 2026-02-04
-- ============================================================

-- 1. Agregar columna tipo_agenda (INDIVIDUAL o SALIDA_CAMPO)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('comercial.citas') AND name = 'tipo_agenda')
BEGIN
    ALTER TABLE comercial.citas ADD tipo_agenda VARCHAR(30) DEFAULT 'INDIVIDUAL' NOT NULL;
    PRINT 'Columna tipo_agenda agregada';
END

-- 2. Agregar columna objetivo_campo (para salidas a campo)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('comercial.citas') AND name = 'objetivo_campo')
BEGIN
    ALTER TABLE comercial.citas ADD objetivo_campo VARCHAR(500) NULL;
    PRINT 'Columna objetivo_campo agregada';
END

-- 3. Hacer cliente_id nullable (para salidas a campo sin cliente específico)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('comercial.citas') AND name = 'cliente_id' AND is_nullable = 0)
BEGIN
    ALTER TABLE comercial.citas ALTER COLUMN cliente_id INT NULL;
    PRINT 'Columna cliente_id ahora permite NULL';
END

-- 4. Hacer conductor_id opcional (ya no es obligatorio)
-- (conductor_id ya es nullable, no requiere acción)

-- 5. Crear tabla para múltiples comerciales en salida a campo
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('comercial.cita_comerciales'))
BEGIN
    CREATE TABLE comercial.cita_comerciales (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cita_id INT NOT NULL,
        usuario_id INT NOT NULL,
        confirmado BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT FK_cita_comerciales_cita FOREIGN KEY (cita_id) 
            REFERENCES comercial.citas(id) ON DELETE CASCADE,
        CONSTRAINT FK_cita_comerciales_usuario FOREIGN KEY (usuario_id) 
            REFERENCES seg.usuarios(id),
        CONSTRAINT UQ_cita_comercial UNIQUE (cita_id, usuario_id)
    );
    PRINT 'Tabla cita_comerciales creada';
END

-- 6. Actualizar registros existentes con tipo_agenda = 'INDIVIDUAL'
UPDATE comercial.citas SET tipo_agenda = 'INDIVIDUAL' WHERE tipo_agenda IS NULL;

PRINT '=== Migración completada exitosamente ===';
