-- =====================================================
-- Script de Creación de Base de Datos - CORREGIDO Y OPTIMIZADO
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- SQL Server 2025
-- Versión: 2.0
-- Fecha: Enero 2025
-- =====================================================

USE master;
GO

-- =====================================================
-- 1. CREACIÓN DE LA BASE DE DATOS
-- =====================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SGI_GrupoCorban')
BEGIN
    CREATE DATABASE SGI_GrupoCorban;
    PRINT '✓ Base de datos SGI_GrupoCorban creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠ La base de datos SGI_GrupoCorban ya existe';
END
GO

USE SGI_GrupoCorban;
GO

-- =====================================================
-- 2. CREACIÓN DE SCHEMAS
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'adm')
BEGIN
    EXEC('CREATE SCHEMA adm');
    PRINT '✓ Schema adm creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'seg')
BEGIN
    EXEC('CREATE SCHEMA seg');
    PRINT '✓ Schema seg creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'comercial')
BEGIN
    EXEC('CREATE SCHEMA comercial');
    PRINT '✓ Schema comercial creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'core')
BEGIN
    EXEC('CREATE SCHEMA core');
    PRINT '✓ Schema core creado';
END
GO

-- =====================================================
-- 3. SCHEMA SEGURIDAD
-- =====================================================

CREATE TABLE seg.roles(
    id INT IDENTITY(1,1),
    nombre VARCHAR(100),
    descripcion NVARCHAR(300),
    is_active BIT,
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE seg.permisos(
    id INT IDENTITY(1,1),
    nombre_tecnico VARCHAR(100),
    nombre_display VARCHAR(150),
    modulo VARCHAR(100),
    descripcion VARCHAR(300),
    is_active BIT,
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE seg.rol_permiso(
    rol_id INT,
    permiso_id INT,
    created_at DATETIME2,   
    created_by INT
);
GO

CREATE TABLE seg.usuarios(
    id INT IDENTITY(1,1),
    empleado_id INT,
    correo_corp NVARCHAR(100),
    password_hash NVARCHAR(255),
    is_active BIT,
    is_bloqueado BIT,
    intentos_fallidos INT,
    reset_token NVARCHAR(255),
    reset_token_expira DATETIME2,
    ultimo_acceso DATETIME2,
    debe_cambiar_pass BIT,
    create_at DATETIME2,
    update_at DATETIME2,
    created_by INT,
    updated_by INT
);
GO

CREATE TABLE seg.sesiones(
    id INT IDENTITY(1,1),
    usuario_id INT,
    refresh_token NVARCHAR(500),
    user_agent NVARCHAR(255),
    ip_address VARCHAR(45),
    expira_en DATETIME2,
    es_revocado BIT,
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE seg.logs_acceso(
    id INT IDENTITY(1,1),
    usuario_id INT,
    fecha_ingreso DATETIME2,
    exitoso BIT,
    ip_address VARCHAR(45)
);
GO

CREATE TABLE seg.usuarios_roles(
    usuario_id INT,
    rol_id INT,
    created_at DATETIME2,
    created_by INT,
);
GO

-- =====================================================
-- 4. SCHEMA ADMINISTRACION (GESTION DE RRHH)
-- =====================================================

CREATE TABLE adm.departamentos(
    id INT IDENTITY(1,1),
    nombre VARCHAR(100),
    descripcion VARCHAR(300),
    responsable_id INT,
    is_active BIT,
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE adm.areas(
    id INT IDENTITY(1,1),
    nombre NVARCHAR(100),
    descripcion NVARCHAR(300),
    departamento_id INT,
    area_padre INT,
    responsable_id INT,
    is_active BIT,
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE adm.cargos(
    id INT IDENTITY(1,1),
    nombre NVARCHAR(100),
    descripcion NVARCHAR(300),
    is_active BIT,
    area_id INT,
    created_at DATETIME2,
    update_at DATETIME2
);
GO

CREATE TABLE adm.activos(
    id INT IDENTITY(1,1),
    producto NVARCHAR(50),
    marca NVARCHAR(50),
    modelo NVARCHAR(50),
    serie NVARCHAR(100),
    codigo_inventario NVARCHAR(50),
    estado_fisico NVARCHAR(50),
    is_disponible BIT,
    observaciones NVARCHAR(MAX),
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE adm.empleado_activo(
    id INT IDENTITY(1,1),
    empleado_id INT,
    activo_id INT,
    fecha_entrega DATETIME2,
    fecha_devolucion DATETIME2,
    estado_al_entregar NVARCHAR(50),
    estado_al_devolver NVARCHAR(50),
    observaciones NVARCHAR(MAX),
    asignado_por INT
);
GO

CREATE TABLE adm.empleados(
    id INT IDENTITY(1,1),
    nombres NVARCHAR(100),
    apellido_paterno NVARCHAR(100),
    apellido_materno NVARCHAR(100),
    fecha_nacimiento DATE,
    tipo_documento VARCHAR(50),
    nro_documento varchar(20),
    celular varchar(20),
    email_personal nvarchar(100),
    direccion NVARCHAR(200),
    distrito_id INT,
    fecha_ingreso DATE,
    fecha_cese DATE,
    is_active BIT,
    cargo_id INT,
    area_id INT,
    departamento_id INT,
    jefe_id INT,
    created_at DATETIME2,
    updated_at DATETIME2,
    created_by INT,
    updated_by INT
);
GO

-- =====================================================
-- 5. SCHEMA CORE (CONFIGURACIONES DEL SISTEMA)
-- =====================================================

CREATE TABLE core.departamentos(
    id INT IDENTITY(1,1),
    nombre NVARCHAR(100),
    ubigeo CHAR(2)
);
GO

CREATE TABLE core.provincias(
    id INT IDENTITY(1,1),
    nombre NVARCHAR(100),
    departamento_id INT,
    ubigeo CHAR(4)
);
GO

CREATE TABLE core.distritos(
    id INT IDENTITY(1,1),
    nombre NVARCHAR(100),
    provincia_id INT,
    ubigeo CHAR(6)
);
GO

CREATE TABLE core.configuraciones(
    id INT IDENTITY(1,1),
    clave VARCHAR(100),
    valor NVARCHAR(500),
    tip_dato VARCHAR(20),
    categoria VARCHAR(100),
    descripcion NVARCHAR(300),
    create_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE core.notificaciones(
    id BIGINT IDENTITY(1,1),
    usuario_id INT,
    tipo VARCHAR(50),
    titulo NVARCHAR(150),
    mensaje NVARCHAR(500),
    url_destino NVARCHAR(300),
    leida BIT,
    fecha_lectura DATETIME2,
    created_at DATETIME2
);
GO

CREATE TABLE core.incoterms(
    id INT IDENTITY(1,1),
    nombre CHAR(3),
    nombre_largo VARCHAR(100),
    tipo VARCHAR(100),
    is_active BIT
);
GO

CREATE TABLE core.tipo_contenedor(
    id INT IDENTITY(1,1),
    nombre VARCHAR(50),
    descripcion VARCHAR(100),
    is_active BIT,
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE core.via(
    id INT IDENTITY(1,1),
    nombre VARCHAR(50),
    descripcion VARCHAR(100),
    is_active BIT,
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE core.tipo_mercaderia(
    id INT IDENTITY(1,1),
    nombre VARCHAR(50),
    descripcion VARCHAR(100),
    is_active BIT,
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

CREATE TABLE core.servicios(
    id INT IDENTITY(1,1),
    nombre VARCHAR(50),
    descripcion VARCHAR(100),
    is_active BIT,
    created_at DATETIME2,
    updated_at DATETIME2
);
GO

-- =====================================================
-- 6. SCHEMA COMERCIAL
-- =====================================================

CREATE TABLE clientes(
    id INT IDENTITY(1,1),
    
);
GO