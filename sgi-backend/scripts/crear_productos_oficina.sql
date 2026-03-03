-- ============================================================
-- Script: Crear tablas para módulo Productos de Oficina
-- Schema: adm
-- Fecha: 2026-03-03
-- Descripción: Tablas para gestionar insumos de oficina
--              (lapiceros, cuadernos, merchandising, etc.)
-- ============================================================

-- 1. Tabla de categorías de productos de oficina
CREATE TABLE IF NOT EXISTS adm.categorias_producto_oficina (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(300),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de productos de oficina
CREATE TABLE IF NOT EXISTS adm.productos_oficina (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria_id INTEGER REFERENCES adm.categorias_producto_oficina(id),
    unidad_medida VARCHAR(30) NOT NULL DEFAULT 'unidad',
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    precio_unitario NUMERIC(10, 2),
    ubicacion VARCHAR(100),
    observaciones TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_productos_oficina_categoria 
    ON adm.productos_oficina(categoria_id);

CREATE INDEX IF NOT EXISTS idx_productos_oficina_nombre 
    ON adm.productos_oficina(nombre);

-- Categorías iniciales sugeridas
INSERT INTO adm.categorias_producto_oficina (nombre, descripcion) VALUES
    ('Útiles de escritorio', 'Lapiceros, lápices, borradores, resaltadores, etc.'),
    ('Papelería', 'Cuadernos, hojas bond, folders, sobres, etc.'),
    ('Merchandising', 'Material promocional, artículos con logo de la empresa'),
    ('Limpieza', 'Productos de limpieza para la oficina'),
    ('Tecnología', 'Cables, memorias USB, pilas, adaptadores, etc.'),
    ('Otros', 'Productos que no encajan en otra categoría')
ON CONFLICT (nombre) DO NOTHING;
