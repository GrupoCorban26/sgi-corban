-- ==========================================
-- FASE 1: REESTRUCTURACIÓN BASE COMERCIAL
-- ==========================================

-- 1.1 Backup de seguridad (Se crea una copia de las tablas actuales)
SELECT * INTO comercial.BKP_cliente_contactos FROM comercial.cliente_contactos;
SELECT * INTO comercial.BKP_historial_llamadas FROM comercial.historial_llamadas;
SELECT * INTO comercial.BKP_lotes_contactos FROM comercial.lotes_contactos;
SELECT * INTO comercial.BKP_registro_importaciones FROM comercial.registro_importaciones;
GO

-- 1.2 Crear comercial.lotes
CREATE TABLE comercial.lotes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_archivo NVARCHAR(200) NOT NULL,
    empresa NVARCHAR(30) NULL,           -- 'CORBAN' | 'EBL' | NULL (ambas)
    estado NVARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE',  -- DISPONIBLE | FINALIZADO
    created_by INT NULL REFERENCES seg.usuarios(id),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 NULL
);
GO

-- 1.3 Crear comercial.bases
CREATE TABLE comercial.bases (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lote_id INT NOT NULL REFERENCES comercial.lotes(id),
    ruc NVARCHAR(11) NOT NULL,
    razon_social NVARCHAR(250) NULL,
    sector NVARCHAR(500) NULL,
    paises NVARCHAR(500) NULL,
    telefono NVARCHAR(20) NOT NULL,
    nombre NVARCHAR(150) NULL,
    correo NVARCHAR(100) NULL,
    estado NVARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE',  -- DISPONIBLE | ASIGNADO | GESTIONADO
    asignado_a INT NULL REFERENCES seg.usuarios(id),
    created_at DATETIME2 DEFAULT GETDATE(),
);
GO

-- Crear índices de comercial.bases
CREATE INDEX IX_bases_lote_id ON comercial.bases(lote_id);
CREATE INDEX IX_bases_ruc ON comercial.bases(ruc);
CREATE INDEX IX_bases_telefono ON comercial.bases(telefono);
CREATE INDEX IX_bases_estado ON comercial.bases(estado);
CREATE INDEX IX_bases_asignado ON comercial.bases(asignado_a);
GO

-- 1.4 Recrear comercial.historial_llamadas

-- Renombrar la vieja
EXEC sp_rename 'comercial.historial_llamadas', 'historial_llamadas_OLD';
GO

-- Crear la nueva
CREATE TABLE comercial.historial_llamadas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    base_id INT NOT NULL REFERENCES comercial.bases(id),
    comercial_id INT NOT NULL REFERENCES seg.usuarios(id),
    caso_id INT NULL REFERENCES comercial.casos_llamada(id),
    comentario NVARCHAR(500) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
);
GO

-- Crear índices para historial
CREATE INDEX IX_hl_base_id ON comercial.historial_llamadas(base_id);
CREATE INDEX IX_hl_comercial ON comercial.historial_llamadas(comercial_id);
CREATE INDEX IX_hl_caso ON comercial.historial_llamadas(caso_id);
GO

-- 1.5 Modificar comercial.cliente_contactos

-- Agregar cliente_id
ALTER TABLE comercial.cliente_contactos
    ADD cliente_id INT NULL REFERENCES comercial.clientes(id);
GO

-- Poblar cliente_id desde RUC existente (solo a los que ya existen en clientes activos)
UPDATE cc
SET cc.cliente_id = c.id
FROM comercial.cliente_contactos cc
INNER JOIN comercial.clientes c ON cc.ruc = c.ruc
WHERE c.is_active = 1;
GO

-- Crear índice
CREATE INDEX IX_cc_cliente_id ON comercial.cliente_contactos(cliente_id);
GO

-- NOTA: NO eliminamos estado_id ni lote_id todavía. Se limpian en Fase 6.
