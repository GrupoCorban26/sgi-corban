-- =====================================================
-- Script de Creación de Base de Datos
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- SQL Server 2025
-- Versión: 1.0
-- Fecha: Diciembre 2024
-- =====================================================

-- =====================================================
-- 1. CREACIÓN DE LA BASE DE DATOS
-- =====================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SGI_GrupoCorban')
BEGIN
    CREATE DATABASE SGI_GrupoCorban;
END
ELSE
BEGIN
    PRINT 'La base de datos SGI_GrupoCorban ya existe';
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
-- 3. SCHEMA: ADM (Administración)
-- =====================================================

-- Tabla: adm.cargos
-- Descripción: Catálogo de cargos/puestos de trabajo
CREATE TABLE adm.cargos (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(300) NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

insert into adm.cargos(nombre, descripcion)
values
('Asistente', 'Asistente del área correspondiente, quien apoye directamente al jefe'),
('Practicante', 'Practicantes pre profesionales'),
('Ejecutivo', 'El ejecutivo comercial que se encargue de la gestion del area'),
('Jefe', 'Jefe del area correspondiente'),
('Pricing', 'Quien se encargue de los precios del area comercial')
go

-- Tabla: adm.areas
-- Descripción: Áreas organizacionales de la empresa
CREATE TABLE adm.areas (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL unique,
    descripcion NVARCHAR(300) NULL,
    parent_area_id INT NULL,
    responsable_id INT NULL,
    comisiona_ventas BIT DEFAULT 0, -- TRUE si el área genera comisiones
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Constraint: auto-referencia para jerarquía de áreas
    CONSTRAINT FK_areas_parent FOREIGN KEY (parent_area_id) 
        REFERENCES adm.areas(id)
);
GO

insert into adm.areas (nombre, descripcion, comisiona_ventas)
values
('Comercial', 'El area que se encarga de cerrar las ventas y atraer clientes', 1),
('Administracion', 'El area que se encarga del correcto funcionamiento de la empresa', 0),
('Sistemas', 'El area que se encarga del mantenimiento de los sistemas informaticos de la empresa', 0)
go

-- Tabla: rrhh.empleados
-- Descripción: Registro de empleados de la empresa
CREATE TABLE adm.empleados (
    id INT PRIMARY KEY IDENTITY(1,1),
    codigo_empleado VARCHAR(20) UNIQUE NOT NULL,
    
    -- Datos personales
    nombres NVARCHAR(100) NOT NULL,
    apellido_paterno NVARCHAR(75) NOT NULL,
    apellido_materno NVARCHAR(75) NULL, -- NULL para extranjeros
    fecha_nacimiento DATE NULL,
    
    -- Identificación
    tipo_documento VARCHAR(20) NOT NULL CHECK(tipo_documento IN ('DNI','CE','PASAPORTE','CARNET_EXT')),
    nro_documento VARCHAR(20) UNIQUE NOT NULL,
    
    -- Contacto
    celular VARCHAR(20) NULL,
    email_personal NVARCHAR(100) NULL,
    direccion NVARCHAR(200) NULL,
    distrito NVARCHAR(100) NULL,
    provincia NVARCHAR(100) NULL,
    
    -- Datos laborales
    fecha_ingreso DATE NOT NULL,
    fecha_cese DATE NULL,
    activo BIT DEFAULT 1,
    
    -- Relaciones
    cargo_id INT NOT NULL,
    area_id INT NOT NULL,
    jefe_id INT NULL, -- Auto-referencia: jefe inmediato
    
    -- Auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by INT NULL,
    updated_by INT NULL,
    
    -- Foreign Keys
    CONSTRAINT FK_empleados_cargo FOREIGN KEY (cargo_id) 
        REFERENCES adm.cargos(id),
    CONSTRAINT FK_empleados_area FOREIGN KEY (area_id) 
        REFERENCES adm.areas(id),
    CONSTRAINT FK_empleados_jefe FOREIGN KEY (jefe_id) 
        REFERENCES adm.empleados(id)
);
GO

-- Actualizar FK de responsable en areas (después de crear empleados)
ALTER TABLE adm.areas
ADD CONSTRAINT FK_areas_responsable FOREIGN KEY (responsable_id)
    REFERENCES adm.empleados(id);
GO

insert into adm.empleados (codigo_emplado, nombres, apellido_paterno, fecha_nacimiento, tipo_documento, nro_documento, celular, email_personal, direccion, distrito, provincia, fecha_ingreso cargo_id, area_id)
values
('ADM001', 'Maricielo', 'Criado', '1995-10-10', 'DNI', '74644421', '999999999', 'mari@gmail.com', 'Av. 199', 'Bocanegra', 'Callao', '2022-01-01', 4, 2),
('SIS001', 'Branco', 'Arguedas', '1999-10-10', 'DNI', '74644489', '907740534', 'bm.arguedasv@gmail.com', 'Madreselvas 144', 'Comas', 'Lima', '2025-03-15', 1, 3),
('COM001', 'Aranza', 'Rincon', '1994-02-05', 'DNI', '78766474', '999991299', 'aranza@gmail.com', 'Av. 124', 'Bocanegra', 'Callao', '2022-01-01', 4, 1),
('COM002', 'Karina', 'Avalos', '1996-05-08', 'DNI', '74644121', '987654321', 'karina@gmail.com', 'Av. 875', 'Surco', 'Lima', '2022-01-01', 5, 1),
go

-- =====================================================
-- 4. SCHEMA: SEG (Seguridad)
-- =====================================================

-- Tabla: seg.roles
-- Descripción: Roles del sistema (Admin, Jefe Comercial, Vendedor, etc.)
CREATE TABLE seg.roles (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(50) UNIQUE NOT NULL,
    descripcion NVARCHAR(300) NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

insert into seg.roles (nombre, descripcion)
values
('Super Administrador', 'Manejo absoluto sobre el sistema'),
('Auditor', 'Todos los permisos .ver'),
('Gestor de RRHH', 'Administra la ficha personal de la organizacion'),
('Aprobador', 'Quien puede autorizar si una tarea se cumplió correctamente'),
('Operador Comercial', 'Crea y gestiona cotizaciones y prospectos'),
('Soporte TI', 'Visualización de logs técnicos y mantenimiento de tablas maestras')
go

-- Tabla: seg.permisos
-- Descripción: Permisos granulares del sistema
CREATE TABLE seg.permisos (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre_tecnico VARCHAR(100) UNIQUE NOT NULL, -- Ej: 'comercial.cotizacion.crear'
    nombre_display NVARCHAR(150) NOT NULL, -- Ej: 'Crear Cotización'
    modulo VARCHAR(50) NOT NULL, -- 'comercial', 'rrhh', 'seg', 'core'
    descripcion NVARCHAR(300) NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

insert into seg.permisos(nombre_tecnico, nombre_display, modulo, descripcion)
values
('adm.area.crear', 'Crear area', 'adm', 'Permiso para crear un area organizacional'),
('adm.area.editar', 'Editar area', 'adm', 'Permiso para editar un area organizacional'),
('adm.area.desactivar', 'Desactivar area', 'adm', 'Permiso para desactivar un area organizacional'),
('adm.area.listar', 'Listar area', 'adm', 'Permiso para listar las areas organizacional'),
('adm.area.ver', 'Ver area', 'adm', 'Permoso para ver un area organizacional')
go

-- Tabla: seg.rol_permiso
-- Descripción: Relación N:M entre roles y permisos
CREATE TABLE seg.rol_permiso (
    rol_id INT NOT NULL,
    permiso_id INT NOT NULL,
    asignado_en DATETIME2 DEFAULT GETDATE(),
    asignado_por INT NULL,
    
    PRIMARY KEY (rol_id, permiso_id),
    
    CONSTRAINT FK_rol_permiso_rol FOREIGN KEY (rol_id) 
        REFERENCES seg.roles(id) ON DELETE CASCADE,
    CONSTRAINT FK_rol_permiso_permiso FOREIGN KEY (permiso_id) 
        REFERENCES seg.permisos(id) ON DELETE CASCADE
);
GO

insert into seg.rol_permiso(rol_id, permiso_id)
values
(3, 1),
(3, 2),
(3, 3),
(3, 4),
(3, 5),
go

-- Tabla: seg.usuarios
-- Descripción: Usuarios del sistema (credenciales de acceso)
CREATE TABLE seg.usuarios (
    id INT PRIMARY KEY IDENTITY(1,1),
    empleado_id INT UNIQUE NOT NULL,
    
    -- Credenciales
    correo_corp NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    
    -- Estado
    is_active BIT DEFAULT 1,
    is_bloqueado BIT DEFAULT 0,
    intentos_fallidos INT DEFAULT 0,
    
    -- Recuperación de contraseña
    reset_token NVARCHAR(255) NULL,
    reset_token_expira DATETIME2 NULL,
    
    -- Actividad
    ultimo_acceso DATETIME2 NULL,
    debe_cambiar_password BIT DEFAULT 1,
    
    -- Auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by INT NULL,
    updated_by INT NULL,
    
    -- Foreign Key
    CONSTRAINT FK_usuarios_empleado FOREIGN KEY (empleado_id) 
        REFERENCES adm.empleados(id)
);
GO

insert into seg.usuarios(empleado_id, correo_corp, password_hash)
values
(1,'facturacion@grupocorban.pe', 'mari123'),
(2,'basededatos@grupocorban.pe','branco123'),
(3,'a.rincon@grupocorban.pe','aranza123'),
(4, 'k.avalos@grupocorban.pe', 'karina123')
go

-- Tabla: seg.usuarios_roles
-- Descripción: Relación N:M entre usuarios y roles
CREATE TABLE seg.usuarios_roles (
    usuario_id INT NOT NULL,
    rol_id INT NOT NULL,
    asignado_en DATETIME2 DEFAULT GETDATE(),
    asignado_por INT NULL,
    
    PRIMARY KEY (usuario_id, rol_id),
    
    CONSTRAINT FK_usuarios_roles_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id) ON DELETE CASCADE,
    CONSTRAINT FK_usuarios_roles_rol FOREIGN KEY (rol_id) 
        REFERENCES seg.roles(id) ON DELETE CASCADE
);
GO

insert into seg.usuarios_roles(usuario_id, rol_id)
values
(1, 3)
go

CREATE TABLE seg.sesiones (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    usuario_id INT NOT NULL,
    refresh_token NVARCHAR(500) NOT NULL,
    user_agent NVARCHAR(255), -- Para saber si es móvil o web
    ip_address VARCHAR(45),
    expira_en DATETIME2 NOT NULL,
    is_revocado BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_sesiones_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id) ON DELETE CASCADE
);
GO

CREATE TABLE seg.logs_acceso (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    usuario_id INT NOT NULL,
    fecha_ingreso DATETIME2 DEFAULT GETDATE(),
    exitoso BIT,
    ip_address VARCHAR(45),
    
    CONSTRAINT FK_logs_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id)
);
GO

-- =====================================================
-- 5. SCHEMA: CORE (Configuraciones y utilidades)
-- =====================================================

-- Tabla: core.configuraciones
-- Descripción: Configuraciones del sistema (clave-valor)
CREATE TABLE core.configuraciones (
    id INT PRIMARY KEY IDENTITY(1,1),
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor NVARCHAR(500) NOT NULL,
    tipo_dato VARCHAR(20) CHECK(tipo_dato IN ('string','int','decimal','boolean','json')),
    categoria varchar(100),
    descripcion NVARCHAR(300) NULL,
    updated_at DATETIME2 DEFAULT GETDATE(),
    updated_by INT NULL
);
GO

insert into core.configuraciones(clave, valor, tipo_dato, descripcion)
values
('auth_session_time', 60, 'int', 'sistemas', 'Tiempo que dura el token'),
('com_igv_value', 18, 'decimal', 'comercial', 'Valor del igv en Perú'),
('com_quote_prefix', 'COT-2026-', 'string','comercial','Prefijo para folios de ventas'),
('app_theme_color_principal', '#013F5E', 'string', 'interfaz', 'Color azul de Grupo Corban'),
('app_theme_color_secundario', '#EA7C63', 'string', 'interfaz', 'Color naranja de Grupo Corban')
go

-- Tabla: core.notificaciones
-- Descripción: Notificaciones in-app para usuarios
CREATE TABLE core.notificaciones (
    id INT PRIMARY KEY IDENTITY(1,1),
    usuario_id INT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo NVARCHAR(150) NOT NULL,
    mensaje NVARCHAR(500) NOT NULL,
    url_destino NVARCHAR(300) NULL,
    leida BIT DEFAULT 0,
    fecha_lectura DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Key
    CONSTRAINT FK_notificaciones_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id) ON DELETE CASCADE
);
GO

-- Tabla: core.documentos
-- Descripción: Gestión de documentos adjuntos
CREATE TABLE core.documentos (
    id INT PRIMARY KEY IDENTITY(1,1),
    modulo VARCHAR(50) NOT NULL,
    tabla_origen VARCHAR(100) NOT NULL,
    registro_id INT NOT NULL,
    tipo_documento VARCHAR(50) NULL,
    nombre_archivo NVARCHAR(255) NOT NULL,
    ruta_archivo NVARCHAR(500) NOT NULL,
    tamano_kb INT NULL,
    mime_type VARCHAR(100) NULL,
    uploaded_by INT NOT NULL,
    uploaded_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Key
    CONSTRAINT FK_documentos_usuario FOREIGN KEY (uploaded_by) 
        REFERENCES seg.usuarios(id)
);
GO

CREATE TABLE core.incoterms(
    id int primary key identity(1,1),
    nombre char(3) unique not null,
    nombre_largo varchar(100) not null,
    tipo varchar(100) not null,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

insert into core.incoterms(nombre, nombre_largo, tipo)
values
('EXW', 'EX Works', 'cualquier transporte'),
('FCA', 'Free Carrier', 'cualquier transporte'),
('CPT', 'Carriage Paid To', 'cualquier transporte'),
('CIP', 'Carriage and Insurance paid to', 'cualquier transporte'),
('DPU', 'Delivered at Place Unloaded', 'cualquier transporte'),
('DAP', 'Delivered at Place', 'cualquier transporte'),
('DDP', 'Delivered Duty Paid', 'cualquier transporte'),
('FAS', 'Free Alongside Ship', 'solo maritimo'),
('FOB', 'Free on Board', 'solo maritimo'),
('CFR', 'Cost and Freight', 'solo maritimo'),
('CIF', 'Cost, Insurance and Freight', 'solo maritimo'),
go

CREATE TABLE core.tipo_contenedor(
    id int primary key identity(1,1),
    nombre varchar(50),
    descripcion varchar(100),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

insert into core.tipo_contenedor(nombre, descripcion)
values
('20''', 'Contenedor de 20'''),
('40''', 'Contenedor de 40'''),
('40'' HC', 'Contenedor de 40'' HC')
go

CREATE TABLE core.via(
    id int primary key identity(1,1),
    nombre varchar(50),
    descripcion varchar(255),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

insert into core.via(nombre, descripcion)
values
('marítimo', 'Vía de transporte maritima'),
('aereo', 'Via de transporte aérea')
go

CREATE TABLE core.tipo_mercaderia(
    id int primary key identity(1,1),
    nombre varchar(100) not null,
    descripcion varchar(255) not null,
    is_active bit default 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
go

insert into core.tipo_mercaderia(nombre, descripcion)
values
('Carga seca o general', 'Bienes no líquidos transportados en cajas, palets o contenedores.'),
('Mercancías peligrosas', 'Sustancias que representen riesgos para la salud, la seguridad, el medio ambiente o la propiedad durante el transporte.'),
('Carga refrigerada', 'Para mercancías sensibles a la temperatura.'),
('Artículos usados, chatarra o material de deshecho', 'Bienes o materiales de segunda mano únicamente para fines de reciclaje o descarte.'),
('Ganado, plantas o animales', 'Mascotas, ganado, plantas del hogar, etc.'),
('Bienes personales o domésticos', 'Artículos pertenecientes a particulares o familias únicamente para fines de mudanza.'),
('Artículos perecederos o frescos', 'Frutas y verduras frescas y otros artículos no enlatados.')
go

CREATE TABLE core.servicios (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre varchar(100) not null,
    descripcion varchar(255) not null,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

insert into core.servicios(nombre, descripcion)
values
('Carga', 'Servicio de traer un producto desde el exterior'),
('Aduanas', 'Servicio de legalizar la carga al llegar al Perú'),
('Transpote interno', 'Servicio de transporte interno'),
('Integral', 'Servicio integral que agrupa los servicios de Carga, Aduanas y Transporte Interno')
go

-- =====================================================
-- 6. SCHEMA: COMERCIAL
-- =====================================================

-- Tabla: comercial.clientes
-- Descripción: Base de datos de clientes y prospectos

CREATE TABLE comercial.lotes_carga(
    id bigint primary key identity(1,1),
    nombre_archivo varchar(100) not null,
    fecha_subida datetime not null,
    total_registros int not null,
    estado varchar(30) not null check(estado in ('En gestión', 'Terminada'))
);

CREATE TABLE comercial.leads(
    id bigint primary key identity(1,1),
    lote_id bigint,

    ruc char(11),
    razon_social varchar(255),
    telefono varchar(20),
    correo varchar(255),

    usuario_asignado_id int,
    
    estado_gestion varchar(50),
    comentarios text,
    fecha_terminado datetime,
    completado bit default 0,

    CONSTRAINT FK_lotes_lead FOREIGN KEY (lote_id) 
        REFERENCES comercial.lotes_carga(id),
    CONSTRAINT FK_usuarios_lead foreign key (usuario_asignado_id)
        REFERENCES seg.usuarios(id),
);

CREATE TABLE comercial.clientes (
    id INT PRIMARY KEY IDENTITY(1,1),
    
    -- Identificación
    tipo_documento VARCHAR(20) NOT NULL CHECK(tipo_documento IN ('RUC','DNI','CE')),
    nro_documento VARCHAR(20) UNIQUE NOT NULL,
    razon_social NVARCHAR(200) NOT NULL,
    
    -- Dirección
    direccion_fiscal NVARCHAR(300) NULL,
    
    -- Estado
    tipo_estado VARCHAR(20) DEFAULT 'prospecto' CHECK(tipo_estado IN ('prospecto','activo','inactivo')),
    
    -- Propiedad y Gestión
    propietario_area_id INT NOT NULL, -- Área que "posee" el cliente (Gerencia, Comercial, etc.)
    vendedor_asignado_id INT NOT NULL, -- Quien gestiona actualmente el cliente
    
    -- Auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by INT NULL,
    updated_by INT NULL,
    
    -- Foreign Keys
    CONSTRAINT FK_clientes_propietario_area FOREIGN KEY (propietario_area_id) 
        REFERENCES adm.areas(id),
    CONSTRAINT FK_clientes_vendedor FOREIGN KEY (vendedor_asignado_id) 
        REFERENCES adm.empleados(id)
);
GO

-- Tabla: comercial.clientes_contactos
-- Descripción: Contactos de cada cliente
CREATE TABLE comercial.clientes_contactos (
    id INT PRIMARY KEY IDENTITY(1,1),
    cliente_id INT NOT NULL,
    nombre_contacto NVARCHAR(150) NOT NULL,
    cargo NVARCHAR(100) NULL,
    celular VARCHAR(20) NULL,
    correo NVARCHAR(100) NULL,
    area_encargada NVARCHAR(100) NULL,
    is_principal BIT DEFAULT 0, -- Contacto principal
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Key
    CONSTRAINT FK_contactos_cliente FOREIGN KEY (cliente_id) 
        REFERENCES comercial.clientes(id) ON DELETE CASCADE
);
GO

-- 1. SOLICITUDES INICIALES (El primer contacto)
CREATE TABLE comercial.solicitudes_cotizacion (
    id INT PRIMARY KEY IDENTITY(1,1),
    cliente_id INT NOT NULL,
    comercial_asignado_id INT NOT NULL, -- El comercial que recibe el requerimiento
    descripcion_requerimiento NVARCHAR(MAX) NOT NULL,
    fecha_solicitud DATETIME2 DEFAULT GETDATE(),
    estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'cotizado', 'anulado')),
    
    CONSTRAINT FK_solicitud_cliente FOREIGN KEY (cliente_id) REFERENCES comercial.clientes(id),
    CONSTRAINT FK_solicitud_comercial FOREIGN KEY (comercial_asignado_id) REFERENCES adm.empleados(id)
);
GO

-- 2. COTIZACIONES (Cabecera y Control de Flujo)
CREATE TABLE comercial.cotizaciones (
    id INT PRIMARY KEY IDENTITY(1,1),
    codigo VARCHAR(30) UNIQUE NOT NULL, -- Ej: COT-2026-0001
    version INT DEFAULT 1,
    solicitud_id INT NULL,
    
    -- Actores del Proceso
    comercial_id INT NOT NULL,      -- El que arma la estructura/formato
    pricing_id INT NULL,            -- El que pone los costos/precios
    aprobador_id INT NULL,          -- El Jefe Comercial que evalúa
    asignado_a_id INT NOT NULL,     -- ¡CLAVE! ID del usuario que tiene la tarea pendiente ahora mismo
    
    cliente_id INT NOT NULL,
    contacto_id INT NULL,

    -- Estado del Workflow (Ajustado a tu proceso)
    estado VARCHAR(40) DEFAULT 'borrador' CHECK (estado IN (
        'borrador',                 -- Comercial llenando datos iniciales
        'en_pricing',               -- Esperando que Pricing ponga precios
        'revision_comercial',       -- Pricing terminó, Comercial arma el PDF/Formato
        'pendiente_aprobacion',     -- En manos del Jefe Comercial
        'rechazado_pricing',        -- Jefe rechazó por precios (vuelve a Pricing)
        'rechazado_comercial',      -- Jefe rechazó por formato (vuelve a Comercial)
        'aprobada',                 -- Lista para enviar al cliente
        'enviada_cliente',
        'ganada', 'perdida', 'vencida'
    )),

    -- Datos de Operación y Carga
    tipo_servicio_id INT NOT NULL,
    via_transporte_id INT NOT NULL,
    incoterm_id INT NOT NULL,
    contenedor_id INT NULL, -- Ej: 40' HC
    origen NVARCHAR(150) NOT NULL,
    destino NVARCHAR(150) NOT NULL,
    descripcion_carga NVARCHAR(500) NULL,
    
    -- Financiero
    moneda VARCHAR(3) DEFAULT 'USD',
    subtotal DECIMAL(18,2) DEFAULT 0,
    igv DECIMAL(18,2) DEFAULT 0,
    total DECIMAL(18,2) DEFAULT 0,
    
    -- Fechas y Validez
    fecha_emision DATETIME2 DEFAULT GETDATE(),
    fecha_validez DATE NOT NULL,
    
    -- Auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by INT NULL,
    updated_by INT NULL,

    CONSTRAINT FK_cotiz_comercial FOREIGN KEY (comercial_id) REFERENCES adm.empleados(id),
    CONSTRAINT FK_cotiz_pricing FOREIGN KEY (pricing_id) REFERENCES seg.usuarios(id),
    CONSTRAINT FK_cotiz_aprobador FOREIGN KEY (aprobador_id) REFERENCES seg.usuarios(id),
    CONSTRAINT FK_cotiz_asignado FOREIGN KEY (asignado_a_id) REFERENCES seg.usuarios(id),
    CONSTRAINT FK_cotiz_solicitud FOREIGN KEY (solicitud_id) REFERENCES comercial.solicitudes_cotizacion(id)
);
GO

-- 3. ITEMS DE COTIZACIÓN (Detalle de Costos y Precios)
CREATE TABLE comercial.cotizaciones_items (
    id INT PRIMARY KEY IDENTITY(1,1),
    cotizacion_id INT NOT NULL,
    concepto_id INT NOT NULL, -- Ej: Flete Marítimo, THC, Gastos Locales
    descripcion_detallada NVARCHAR(300) NULL,
    
    -- Pricing llena esto:
    costo_unitario DECIMAL(18,2) NOT NULL DEFAULT 0,
    
    -- Comercial/Pricing definen esto:
    precio_unitario DECIMAL(18,2) NOT NULL DEFAULT 0,
    cantidad DECIMAL(18,2) DEFAULT 1,
    
    -- Cálculos Automáticos
    subtotal_item AS (cantidad * precio_unitario) PERSISTED,
    margen_valor AS ((precio_unitario - costo_unitario) * cantidad) PERSISTED,

    CONSTRAINT FK_items_cotizacion FOREIGN KEY (cotizacion_id) REFERENCES comercial.cotizaciones(id) ON DELETE CASCADE
);
GO

-- 4. SEGUIMIENTO Y LOG DE RECHAZOS (La historia del "Ida y Vuelta")
CREATE TABLE comercial.cotizacion_seguimiento (
    id INT PRIMARY KEY IDENTITY(1,1),
    cotizacion_id INT NOT NULL,
    usuario_id INT NOT NULL,       -- Quién hizo el movimiento
    estado_anterior VARCHAR(40),
    estado_nuevo VARCHAR(40),
    
    -- El motivo del rechazo o comentario de aprobación
    comentario NVARCHAR(MAX) NULL, 
    
    -- Categoría de rechazo para saber a quién se le devolvió
    tipo_accion VARCHAR(30) CHECK (tipo_accion IN ('envio', 'aprobacion', 'rechazo_formato', 'rechazo_precio', 'comentario')),
    
    fecha_movimiento DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT FK_seg_cotizacion FOREIGN KEY (cotizacion_id) REFERENCES comercial.cotizaciones(id) ON DELETE CASCADE,
    CONSTRAINT FK_seg_usuario FOREIGN KEY (usuario_id) REFERENCES seg.usuarios(id)
);
GO

-- Tabla: comercial.auditoria_log
-- Descripción: Log de auditoría de acciones en el módulo comercial
CREATE TABLE comercial.auditoria_log (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    
    -- Usuario
    usuario_id INT NOT NULL,
    usuario_nombre NVARCHAR(150) NULL,
    
    -- Acción
    accion VARCHAR(50) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(100) NULL,
    registro_id INT NULL,
    
    -- Cambios
    detalle_antes NVARCHAR(MAX) NULL,
    detalle_despues NVARCHAR(MAX) NULL,
    descripcion NVARCHAR(500) NULL,
    
    -- Contexto
    ip_direccion VARCHAR(50) NULL,
    user_agent NVARCHAR(500) NULL,
    
    -- Fecha
    fecha_evento DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Key
    CONSTRAINT FK_auditoria_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id)
);
GO