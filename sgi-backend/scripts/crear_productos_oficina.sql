-- ============================================================
-- Script: Crear tablas para módulo Productos de Oficina
-- Schema: adm
-- Motor: SQL Server
-- Fecha: 2026-03-03
-- Descripción: Tablas para gestionar insumos de oficina
--              (lapiceros, cuadernos, merchandising, etc.)
-- ============================================================

-- 1. Tabla de categorías de productos de oficina
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = 'adm' AND t.name = 'categorias_producto_oficina')
BEGIN
    CREATE TABLE adm.categorias_producto_oficina (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL UNIQUE,
        descripcion NVARCHAR(300) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

-- 2. Tabla de productos de oficina
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = 'adm' AND t.name = 'productos_oficina')
BEGIN
    CREATE TABLE adm.productos_oficina (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(150) NOT NULL,
        categoria_id INT NULL REFERENCES adm.categorias_producto_oficina(id),
        unidad_medida NVARCHAR(30) NOT NULL DEFAULT 'unidad',
        stock_actual INT NOT NULL DEFAULT 0,
        stock_minimo INT NOT NULL DEFAULT 0,
        precio_unitario DECIMAL(10, 2) NULL,
        ubicacion NVARCHAR(100) NULL,
        observaciones NVARCHAR(MAX) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NULL
    );
END
GO

-- Índices para búsquedas frecuentes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_productos_oficina_categoria')
    CREATE INDEX idx_productos_oficina_categoria ON adm.productos_oficina(categoria_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_productos_oficina_nombre')
    CREATE INDEX idx_productos_oficina_nombre ON adm.productos_oficina(nombre);
GO

-- Categorías iniciales sugeridas
IF NOT EXISTS (SELECT 1 FROM adm.categorias_producto_oficina WHERE nombre = N'Útiles de escritorio')
    INSERT INTO adm.categorias_producto_oficina (nombre, descripcion) VALUES (N'Útiles de escritorio', N'Lapiceros, lápices, borradores, resaltadores, etc.');

IF NOT EXISTS (SELECT 1 FROM adm.categorias_producto_oficina WHERE nombre = N'Papelería')
    INSERT INTO adm.categorias_producto_oficina (nombre, descripcion) VALUES (N'Papelería', N'Cuadernos, hojas bond, folders, sobres, etc.');

IF NOT EXISTS (SELECT 1 FROM adm.categorias_producto_oficina WHERE nombre = N'Merchandising')
    INSERT INTO adm.categorias_producto_oficina (nombre, descripcion) VALUES (N'Merchandising', N'Material promocional, artículos con logo de la empresa');

IF NOT EXISTS (SELECT 1 FROM adm.categorias_producto_oficina WHERE nombre = N'Limpieza')
    INSERT INTO adm.categorias_producto_oficina (nombre, descripcion) VALUES (N'Limpieza', N'Productos de limpieza para la oficina');

IF NOT EXISTS (SELECT 1 FROM adm.categorias_producto_oficina WHERE nombre = N'Tecnología')
    INSERT INTO adm.categorias_producto_oficina (nombre, descripcion) VALUES (N'Tecnología', N'Cables, memorias USB, pilas, adaptadores, etc.');

IF NOT EXISTS (SELECT 1 FROM adm.categorias_producto_oficina WHERE nombre = N'Otros')
    INSERT INTO adm.categorias_producto_oficina (nombre, descripcion) VALUES (N'Otros', N'Productos que no encajan en otra categoría');
GO
