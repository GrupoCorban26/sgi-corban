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
-- 3. SCHEMA: ADM (Administración)
-- =====================================================

-- Tabla: adm.departamento
create table adm.departamentos(
  id int primary key identity(1,1),
  nombre nvarchar(100) not null,
  descripcion nvarchar(300) not null,
  responsable_id int null,
  is_active bit default 1,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE()
);

-- Tabla: adm.areas
CREATE TABLE adm.areas (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL UNIQUE,
    descripcion NVARCHAR(300) NULL,
    area_padre_id INT NULL,
    responsable_id INT NULL,
    comisiona_ventas BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_areas_parent FOREIGN KEY (area_padre_id) 
        REFERENCES adm.areas(id)
);
GO

-- Tabla: adm.cargos
CREATE TABLE adm.cargos (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(300) NULL,
    is_active BIT DEFAULT 1,
    area_id int,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()

    CONSTRAINT FK_cargo_area Foreign key(area_id)
        REFERENCES adm.area(id)
);
GO

-- Tabla: adm.empleados (CON SYSTEM_VERSIONING)
CREATE TABLE adm.empleados (
    id INT PRIMARY KEY IDENTITY(1,1),

    -- Datos personales
    nombres NVARCHAR(100) NOT NULL,
    apellido_paterno NVARCHAR(75) NOT NULL,
    apellido_materno NVARCHAR(75) NULL,
    fecha_nacimiento DATE NULL,
    
    -- Identificación
    tipo_documento VARCHAR(20) NOT NULL CHECK(tipo_documento IN ('DNI','CE','PASAPORTE','CARNET_EXT')),
    nro_documento VARCHAR(20) UNIQUE NOT NULL,
    
    -- Contacto
    celular VARCHAR(20) NULL,
    email_personal NVARCHAR(100) NULL,
    direccion NVARCHAR(200) NULL,
    ubigeo_id char(6) null,
    
    -- Datos laborales
    fecha_ingreso DATE NOT NULL,
    fecha_cese DATE NULL,
    activo BIT DEFAULT 1,
    
    -- Relaciones
    cargo_id INT NOT NULL,
    area_id INT NOT NULL,
    jefe_id INT NULL,
    
    -- Auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by INT NULL,
    updated_by INT NULL,
    
    -- Columnas de versionamiento (ocultas)
    SysStartTime DATETIME2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL DEFAULT SYSUTCDATETIME(),
    SysEndTime DATETIME2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL DEFAULT CONVERT(DATETIME2, '9999-12-31 23:59:59.9999999'),
    PERIOD FOR SYSTEM_TIME (SysStartTime, SysEndTime),
    
    -- Foreign Keys
    CONSTRAINT FK_empleados_ubigeo FOREIGN KEY (ubigeo_id) 
        REFERENCES adm.cargos(id),
    CONSTRAINT FK_empleados_area FOREIGN KEY (area_id) 
        REFERENCES adm.areas(id),
    CONSTRAINT FK_empleados_jefe FOREIGN KEY (jefe_id) 
        REFERENCES adm.empleados(id)
);
GO

-- Activar versionamiento en empleados
ALTER TABLE adm.empleados
SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = adm.empleados_history));
GO

-- FK de responsable en areas
ALTER TABLE adm.areas
ADD CONSTRAINT FK_areas_responsable FOREIGN KEY (responsable_id)
    REFERENCES adm.empleados(id);
GO

-- =====================================================
-- 4. SCHEMA: SEG (Seguridad)
-- =====================================================

-- Tabla: seg.roles
CREATE TABLE seg.roles (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(50) UNIQUE NOT NULL,
    descripcion NVARCHAR(300) NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Tabla: seg.permisos
CREATE TABLE seg.permisos (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre_tecnico VARCHAR(100) UNIQUE NOT NULL,
    nombre_display NVARCHAR(150) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    descripcion NVARCHAR(300) NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Tabla: seg.rol_permiso
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

-- Tabla: seg.usuarios (CON SYSTEM_VERSIONING)
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
    
    -- Columnas de versionamiento
    SysStartTime DATETIME2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL DEFAULT SYSUTCDATETIME(),
    SysEndTime DATETIME2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL DEFAULT CONVERT(DATETIME2, '9999-12-31 23:59:59.9999999'),
    PERIOD FOR SYSTEM_TIME (SysStartTime, SysEndTime),
    
    CONSTRAINT FK_usuarios_empleado FOREIGN KEY (empleado_id) 
        REFERENCES adm.empleados(id)
);
GO

-- Activar versionamiento en usuarios
ALTER TABLE seg.usuarios
SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = seg.usuarios_history));
GO

-- Tabla: seg.usuarios_roles
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

-- Tabla: seg.sesiones
CREATE TABLE seg.sesiones (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    usuario_id INT NOT NULL,
    refresh_token NVARCHAR(500) NOT NULL,
    user_agent NVARCHAR(255),
    ip_address VARCHAR(45),
    expira_en DATETIME2 NOT NULL,
    is_revocado BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_sesiones_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id) ON DELETE CASCADE
);
GO

-- Tabla: seg.logs_acceso
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

-- Tabla: core.departamentos

CREATE TABLE core.departamentos(
    id bigint primary key identity(1,1),
    departamento NVARCHAR(50) NOT NULL,
    ubigeo VARCHAR(2) NOT NULL,
);

-- Tabla: core.provincias

CREATE TABLE core.provincias(
    id bigint primary key identity(1,1),
    provincia NVARCHAR(100) NOT NULL,
    ubigeo VARCHAR(4) NOT NULL,
    departamento_id BIGINT NOT NULL,
    CONSTRAINT PK_ubigeo_provincias PRIMARY KEY (id),
    CONSTRAINT FK_ubigeo_provincias_departamento FOREIGN KEY (departamento_id) 
        REFERENCES core.ubigeo_departamentos (id)
);

-- Tabla: core.distritos

CREATE TABLE core.distritos(
    id bigint primary key identity(1,1),
    distrito NVARCHAR(150) NOT NULL,
    ubigeo VARCHAR(6) NOT NULL,
    provincia_id BIGINT NOT NULL,
    departamento_id BIGINT NOT NULL,
    CONSTRAINT FK_ubigeo_distritos_provincia FOREIGN KEY (provincia_id) 
        REFERENCES core.ubigeo_provincias (id),
    CONSTRAINT FK_ubigeo_distritos_departamento FOREIGN KEY (departamento_id) 
        REFERENCES core.ubigeo_departamentos (id)
);
GO

-- Tabla: core.configuraciones

CREATE TABLE core.configuraciones (
    id INT PRIMARY KEY IDENTITY(1,1),
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor NVARCHAR(500) NOT NULL,
    tipo_dato VARCHAR(20) CHECK(tipo_dato IN ('string','int','decimal','boolean','json')),
    categoria VARCHAR(100),
    descripcion NVARCHAR(300) NULL,
    updated_at DATETIME2 DEFAULT GETDATE(),
    updated_by INT NULL
);
GO

-- Tabla: core.notificaciones
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
    
    CONSTRAINT FK_notificaciones_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id) ON DELETE CASCADE
);
GO

-- Tabla: core.documentos
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
    
    CONSTRAINT FK_documentos_usuario FOREIGN KEY (uploaded_by) 
        REFERENCES seg.usuarios(id)
);
GO

-- Tabla: core.incoterms
CREATE TABLE core.incoterms (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre CHAR(3) UNIQUE NOT NULL,
    nombre_largo VARCHAR(100) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Tabla: core.tipo_contenedor
CREATE TABLE core.tipo_contenedor (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(50),
    descripcion VARCHAR(100),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Tabla: core.via
CREATE TABLE core.via (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(50),
    descripcion VARCHAR(255),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Tabla: core.tipo_mercaderia
CREATE TABLE core.tipo_mercaderia (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Tabla: core.servicios
CREATE TABLE core.servicios (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- =====================================================
-- 6. SCHEMA: COMERCIAL
-- =====================================================

-- Tabla: comercial.estados_lead (NUEVA)
CREATE TABLE comercial.estados_lead (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion NVARCHAR(200),
    color VARCHAR(7),
    orden INT,
    is_active BIT DEFAULT 1
);
GO

-- Tabla: comercial.conceptos (NUEVA - FALTABA)
CREATE TABLE comercial.conceptos (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(300),
    categoria VARCHAR(50),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Tabla: comercial.lotes_carga
CREATE TABLE comercial.lotes_carga (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    nombre_archivo VARCHAR(100) NOT NULL,
    fecha_subida DATETIME2 NOT NULL DEFAULT GETDATE(),
    total_registros INT NOT NULL,
    estado VARCHAR(30) NOT NULL CHECK(estado IN ('en_gestion', 'terminada')),
    uploaded_by INT NOT NULL,
    
    CONSTRAINT FK_lotes_usuario FOREIGN KEY (uploaded_by)
        REFERENCES seg.usuarios(id)
);
GO

-- Tabla: comercial.leads
CREATE TABLE comercial.leads (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    lote_id BIGINT,
    
    -- Datos del lead
    ruc CHAR(11),
    razon_social VARCHAR(255),
    telefono VARCHAR(20),
    correo VARCHAR(255),
    
    -- Gestión
    usuario_asignado_id INT,
    estado_lead_id INT,
    comentarios NVARCHAR(MAX),
    intentos_contacto INT DEFAULT 0,
    ultima_gestion DATETIME2 NULL,
    fecha_terminado DATETIME2,
    completado BIT DEFAULT 0,
    
    -- Conversión a cliente
    convertido_cliente_id INT NULL,
    fecha_conversion DATETIME2 NULL,
    
    CONSTRAINT FK_lotes_lead FOREIGN KEY (lote_id) 
        REFERENCES comercial.lotes_carga(id),
    CONSTRAINT FK_usuarios_lead FOREIGN KEY (usuario_asignado_id)
        REFERENCES seg.usuarios(id),
    CONSTRAINT FK_estado_lead FOREIGN KEY (estado_lead_id)
        REFERENCES comercial.estados_lead(id)
);
GO

-- Tabla: comercial.clientes (CON SYSTEM_VERSIONING)
CREATE TABLE comercial.clientes (
    id INT PRIMARY KEY IDENTITY(1,1),
    
    -- Identificación
    tipo_documento VARCHAR(20) NOT NULL CHECK(tipo_documento IN ('RUC','DNI','CE')),
    nro_documento VARCHAR(20) UNIQUE NOT NULL,
    razon_social NVARCHAR(200) NOT NULL,
    
    -- Dirección
    direccion_fiscal NVARCHAR(300) NULL,
    
    -- Estado
    tipo_estado VARCHAR(20) DEFAULT 'prospecto' CHECK(tipo_estado IN ('activo','inactivo')),
    
    -- Propiedad y Gestión (CORREGIDO: todos apuntan a seg.usuarios)
    propietario_area_id INT NOT NULL,
    vendedor_asignado_id INT NOT NULL,
    
    -- Origen
    origen_lead_id BIGINT NULL,
    
    -- Auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by INT NULL,
    updated_by INT NULL,
    
    -- Columnas de versionamiento
    SysStartTime DATETIME2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL DEFAULT SYSUTCDATETIME(),
    SysEndTime DATETIME2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL DEFAULT CONVERT(DATETIME2, '9999-12-31 23:59:59.9999999'),
    PERIOD FOR SYSTEM_TIME (SysStartTime, SysEndTime),
    
    -- Foreign Keys
    CONSTRAINT FK_clientes_propietario_area FOREIGN KEY (propietario_area_id) 
        REFERENCES adm.areas(id),
    CONSTRAINT FK_clientes_vendedor FOREIGN KEY (vendedor_asignado_id) 
        REFERENCES seg.usuarios(id),
    CONSTRAINT FK_clientes_lead FOREIGN KEY (origen_lead_id)
        REFERENCES comercial.leads(id)
);
GO

-- Activar versionamiento en clientes
ALTER TABLE comercial.clientes
SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = comercial.clientes_history));
GO

-- FK inversa en leads
ALTER TABLE comercial.leads
ADD CONSTRAINT FK_lead_cliente FOREIGN KEY (convertido_cliente_id)
    REFERENCES comercial.clientes(id);
GO

-- Tabla: comercial.clientes_contactos
CREATE TABLE comercial.clientes_contactos (
    id INT PRIMARY KEY IDENTITY(1,1),
    cliente_id INT NOT NULL,
    nombre_contacto NVARCHAR(150) NOT NULL,
    cargo NVARCHAR(100) NULL,
    celular VARCHAR(20) NULL,
    correo NVARCHAR(100) NULL,
    area_encargada NVARCHAR(100) NULL,
    is_principal BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_contactos_cliente FOREIGN KEY (cliente_id) 
        REFERENCES comercial.clientes(id) ON DELETE CASCADE
);
GO

-- Tabla: comercial.solicitudes_cotizacion
CREATE TABLE comercial.solicitudes_cotizacion (
    id INT PRIMARY KEY IDENTITY(1,1),
    cliente_id INT NOT NULL,
    comercial_asignado_id INT NOT NULL,
    descripcion_requerimiento NVARCHAR(MAX) NOT NULL,
    canal_origen VARCHAR(50) CHECK(canal_origen IN ('whatsapp', 'email', 'telefono', 'web', 'presencial')),
    fecha_solicitud DATETIME2 DEFAULT GETDATE(),
    estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'cotizado', 'anulado')),
    
    CONSTRAINT FK_solicitud_cliente FOREIGN KEY (cliente_id) 
        REFERENCES comercial.clientes(id),
    CONSTRAINT FK_solicitud_comercial FOREIGN KEY (comercial_asignado_id) 
        REFERENCES seg.usuarios(id)
);
GO

-- Tabla: comercial.cotizaciones (CON SYSTEM_VERSIONING - CORREGIDA)
CREATE TABLE comercial.cotizaciones (
    id INT PRIMARY KEY IDENTITY(1,1),
    codigo VARCHAR(30) UNIQUE NOT NULL,
    version INT DEFAULT 1,
    solicitud_id INT NULL,
    
    -- Actores del Proceso (TODOS APUNTAN A seg.usuarios)
    comercial_id INT NOT NULL,
    pricing_id INT NULL,
    aprobador_id INT NULL,
    asignado_a_id INT NOT NULL,
    
    cliente_id INT NOT NULL,
    contacto_id INT NULL,

    -- Estado del Workflow
    estado VARCHAR(40) DEFAULT 'borrador' CHECK (estado IN (
        'borrador',
        'en_pricing',
        'revision_comercial',
        'pendiente_aprobacion',
        'rechazado_pricing',
        'rechazado_comercial',
        'aprobada',
        'enviada_cliente',
        'ganada', 'perdida', 'vencida'
    )),

    -- Datos de Operación y Carga
    tipo_servicio_id INT NOT NULL,
    via_transporte_id INT NOT NULL,
    incoterm_id INT NOT NULL,
    contenedor_id INT NULL,
    contenedores_detalle NVARCHAR(500),
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
    
    -- Columnas de versionamiento
    SysStartTime DATETIME2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL DEFAULT SYSUTCDATETIME(),
    SysEndTime DATETIME2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL DEFAULT CONVERT(DATETIME2, '9999-12-31 23:59:59.9999999'),
    PERIOD FOR SYSTEM_TIME (SysStartTime, SysEndTime),

    -- Foreign Keys (CORREGIDAS - todas a seg.usuarios)
    CONSTRAINT FK_cotiz_comercial FOREIGN KEY (comercial_id) 
        REFERENCES seg.usuarios(id),
    CONSTRAINT FK_cotiz_pricing FOREIGN KEY (pricing_id) 
        REFERENCES seg.usuarios(id),
    CONSTRAINT FK_cotiz_aprobador FOREIGN KEY (aprobador_id) 
        REFERENCES seg.usuarios(id),
    CONSTRAINT FK_cotiz_asignado FOREIGN KEY (asignado_a_id) 
        REFERENCES seg.usuarios(id),
    CONSTRAINT FK_cotiz_cliente FOREIGN KEY (cliente_id)
        REFERENCES comercial.clientes(id),
    CONSTRAINT FK_cotiz_contacto FOREIGN KEY (contacto_id)
        REFERENCES comercial.clientes_contactos(id),
    CONSTRAINT FK_cotiz_solicitud FOREIGN KEY (solicitud_id) 
        REFERENCES comercial.solicitudes_cotizacion(id),
    CONSTRAINT FK_cotiz_servicio FOREIGN KEY (tipo_servicio_id)
        REFERENCES core.servicios(id),
    CONSTRAINT FK_cotiz_via FOREIGN KEY (via_transporte_id)
        REFERENCES core.via(id),
    CONSTRAINT FK_cotiz_incoterm FOREIGN KEY (incoterm_id)
        REFERENCES core.incoterms(id),
    CONSTRAINT FK_cotiz_contenedor FOREIGN KEY (contenedor_id)
        REFERENCES core.tipo_contenedor(id)
);
GO

-- Activar versionamiento en cotizaciones
ALTER TABLE comercial.cotizaciones
SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = comercial.cotizaciones_history));
GO

-- Tabla: comercial.cotizaciones_items (CON SYSTEM_VERSIONING)
CREATE TABLE comercial.cotizaciones_items (
    id INT PRIMARY KEY IDENTITY(1,1),
    cotizacion_id INT NOT NULL,
    concepto_id INT NOT NULL,
    descripcion_detallada NVARCHAR(300) NULL,
    
    -- Pricing llena esto
    costo_unitario DECIMAL(18,2) NOT NULL DEFAULT 0,
    
    -- Comercial/Pricing definen esto
    precio_unitario DECIMAL(18,2) NOT NULL DEFAULT 0,
    cantidad DECIMAL(18,2) DEFAULT 1,
    
    -- Cálculos automáticos
    subtotal_item AS (cantidad * precio_unitario) PERSISTED,
    margen_valor AS ((precio_unitario - costo_unitario) * cantidad) PERSISTED,
    
    -- Columnas de versionamiento
    SysStartTime DATETIME2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL DEFAULT SYSUTCDATETIME(),
    SysEndTime DATETIME2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL DEFAULT CONVERT(DATETIME2, '9999-12-31 23:59:59.9999999'),
    PERIOD FOR SYSTEM_TIME (SysStartTime, SysEndTime),

    CONSTRAINT FK_items_cotizacion FOREIGN KEY (cotizacion_id) 
        REFERENCES comercial.cotizaciones(id) ON DELETE CASCADE,
    CONSTRAINT FK_items_concepto FOREIGN KEY (concepto_id)
        REFERENCES comercial.conceptos(id)
);
GO

-- Activar versionamiento en items
ALTER TABLE comercial.cotizaciones_items
SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = comercial.cotizaciones_items_history));
GO

-- Tabla: comercial.cotizacion_seguimiento
CREATE TABLE comercial.cotizacion_seguimiento (
    id INT PRIMARY KEY IDENTITY(1,1),
    cotizacion_id INT NOT NULL,
    usuario_id INT NOT NULL,
    estado_anterior VARCHAR(40),
    estado_nuevo VARCHAR(40),
    comentario NVARCHAR(MAX) NULL,
    tipo_accion VARCHAR(30) CHECK (tipo_accion IN ('envio', 'aprobacion', 'rechazo_formato', 'rechazo_precio', 'comentario')),
    fecha_movimiento DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT FK_seg_cotizacion FOREIGN KEY (cotizacion_id) 
        REFERENCES comercial.cotizaciones(id) ON DELETE CASCADE,
    CONSTRAINT FK_seg_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id)
);
GO

-- Tabla: comercial.auditoria_log
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
    
    CONSTRAINT FK_auditoria_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id)
);
GO

-- =====================================================
-- 7. ÍNDICES OPTIMIZADOS
-- =====================================================

-- Índices en adm.empleados
CREATE INDEX idx_empleados_area ON adm.empleados(area_id);
CREATE INDEX idx_empleados_cargo ON adm.empleados(cargo_id);
CREATE INDEX idx_empleados_jefe ON adm.empleados(jefe_id);
CREATE INDEX idx_empleados_documento ON adm.empleados(tipo_documento, nro_documento);
CREATE INDEX idx_empleados_activo ON adm.empleados(activo);
GO

-- Índices en seg.usuarios
CREATE INDEX idx_usuarios_empleado ON seg.usuarios(empleado_id);
CREATE INDEX idx_usuarios_correo ON seg.usuarios(correo_corp);
CREATE INDEX idx_usuarios_activo ON seg.usuarios(is_active);
GO

-- Índices en comercial.leads
CREATE INDEX idx_leads_usuario ON comercial.leads(usuario_asignado_id, completado);
CREATE INDEX idx_leads_lote ON comercial.leads(lote_id);
CREATE INDEX idx_leads_estado ON comercial.leads(estado_lead_id);
GO

-- Índices en comercial.clientes
CREATE INDEX idx_clientes_vendedor ON comercial.clientes(vendedor_asignado_id);
CREATE INDEX idx_clientes_area ON comercial.clientes(propietario_area_id);
CREATE INDEX idx_clientes_documento ON comercial.clientes(tipo_documento, nro_documento);
CREATE INDEX idx_clientes_estado ON comercial.clientes(tipo_estado);
GO

-- Índices en comercial.cotizaciones (completar)
CREATE INDEX idx_cotiz_cliente ON comercial.cotizaciones(cliente_id);
CREATE INDEX idx_cotiz_comercial ON comercial.cotizaciones(comercial_id);
CREATE INDEX idx_cotiz_estado ON comercial.cotizaciones(estado);
CREATE INDEX idx_cotiz_fecha_emision ON comercial.cotizaciones(fecha_emision DESC);
CREATE INDEX idx_cotiz_fecha_validez ON comercial.cotizaciones(fecha_validez);
CREATE INDEX idx_cotiz_pricing ON comercial.cotizaciones(pricing_id);
CREATE INDEX idx_cotiz_asignado ON comercial.cotizaciones(asignado_a_id);
GO

-- Índices en comercial.cotizaciones_items
CREATE INDEX idx_items_cotizacion ON comercial.cotizaciones_items(cotizacion_id);
CREATE INDEX idx_items_concepto ON comercial.cotizaciones_items(concepto_id);
GO

-- Índices en comercial.cotizacion_seguimiento
CREATE INDEX idx_seg_cotizacion ON comercial.cotizacion_seguimiento(cotizacion_id);
CREATE INDEX idx_seg_fecha ON comercial.cotizacion_seguimiento(fecha_movimiento DESC);
GO

-- Índices en seg.sesiones
CREATE INDEX idx_sesiones_usuario ON seg.sesiones(usuario_id);
CREATE INDEX idx_sesiones_token ON seg.sesiones(refresh_token);
CREATE INDEX idx_sesiones_expira ON seg.sesiones(expira_en);
GO

-- Índices en core.notificaciones
CREATE INDEX idx_notif_usuario ON core.notificaciones(usuario_id, leida);
CREATE INDEX idx_notif_fecha ON core.notificaciones(created_at DESC);
GO

-- Índices en core.documentos
CREATE INDEX idx_doc_modulo ON core.documentos(modulo, tabla_origen, registro_id);
CREATE INDEX idx_doc_usuario ON core.documentos(uploaded_by);
GO

-- Indices en core.provincias
CREATE INDEX IX_ubigeo_provincias_departamento_id ON core.ubigeo_provincias (departamento_id);
CREATE INDEX IX_ubigeo_distritos_provincia_id ON core.ubigeo_distritos (provincia_id);
CREATE INDEX IX_ubigeo_distritos_departamento_id ON core.ubigeo_distritos (departamento_id);
GO

-- Índices en comercial.auditoria_log
CREATE INDEX idx_audit_usuario ON comercial.auditoria_log(usuario_id);
CREATE INDEX idx_audit_fecha ON comercial.auditoria_log(fecha_evento DESC);
CREATE INDEX idx_audit_modulo ON comercial.auditoria_log(modulo, tabla_afectada);
GO

PRINT '✓ Índices creados exitosamente';
GO

-- =====================================================
-- 8. TRIGGERS DE AUDITORÍA Y NEGOCIO
-- =====================================================

-- Trigger: Actualizar updated_at automáticamente en empleados
CREATE TRIGGER trg_empleados_update
ON adm.empleados
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE adm.empleados
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger: Actualizar updated_at en clientes
CREATE TRIGGER trg_clientes_update
ON comercial.clientes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE comercial.clientes
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger: Actualizar updated_at en cotizaciones
CREATE TRIGGER trg_cotizaciones_update
ON comercial.cotizaciones
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE comercial.cotizaciones
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger: Recalcular totales de cotización cuando cambian los items
CREATE TRIGGER trg_recalcular_totales_cotizacion
ON comercial.cotizaciones_items
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- IDs afectados
    DECLARE @CotizacionesAfectadas TABLE (cotizacion_id INT);
    
    INSERT INTO @CotizacionesAfectadas
    SELECT DISTINCT cotizacion_id FROM inserted
    UNION
    SELECT DISTINCT cotizacion_id FROM deleted;
    
    -- Recalcular totales
    UPDATE c
    SET 
        subtotal = ISNULL((
            SELECT SUM(subtotal_item)
            FROM comercial.cotizaciones_items
            WHERE cotizacion_id = c.id
        ), 0),
        igv = ROUND(ISNULL((
            SELECT SUM(subtotal_item) * 0.18
            FROM comercial.cotizaciones_items
            WHERE cotizacion_id = c.id
        ), 0), 2),
        total = ROUND(ISNULL((
            SELECT SUM(subtotal_item) * 1.18
            FROM comercial.cotizaciones_items
            WHERE cotizacion_id = c.id
        ), 0), 2)
    FROM comercial.cotizaciones c
    INNER JOIN @CotizacionesAfectadas ca ON c.id = ca.cotizacion_id;
END;
GO

-- Trigger: Auditar cambios en cotizaciones
CREATE TRIGGER trg_audit_cotizaciones
ON comercial.cotizaciones
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        -- UPDATE
        INSERT INTO comercial.auditoria_log (
            usuario_id, usuario_nombre, accion, modulo, tabla_afectada, 
            registro_id, detalle_antes, detalle_despues, descripcion
        )
        SELECT 
            ISNULL(i.updated_by, i.created_by),
            (SELECT CONCAT(nombres, ' ', apellido_paterno) 
             FROM adm.empleados e 
             INNER JOIN seg.usuarios u ON e.id = u.empleado_id 
             WHERE u.id = ISNULL(i.updated_by, i.created_by)),
            'UPDATE',
            'COMERCIAL',
            'cotizaciones',
            i.id,
            (SELECT codigo, estado, total FROM deleted d WHERE d.id = i.id FOR JSON PATH),
            (SELECT codigo, estado, total FROM inserted i2 WHERE i2.id = i.id FOR JSON PATH),
            'Cotización actualizada: ' + i.codigo
        FROM inserted i
        INNER JOIN deleted d ON i.id = d.id;
    END
    ELSE IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        -- INSERT
        INSERT INTO comercial.auditoria_log (
            usuario_id, usuario_nombre, accion, modulo, tabla_afectada, 
            registro_id, detalle_despues, descripcion
        )
        SELECT 
            i.created_by,
            (SELECT CONCAT(nombres, ' ', apellido_paterno) 
             FROM adm.empleados e 
             INNER JOIN seg.usuarios u ON e.id = u.empleado_id 
             WHERE u.id = i.created_by),
            'INSERT',
            'COMERCIAL',
            'cotizaciones',
            i.id,
            (SELECT codigo, estado, cliente_id FROM inserted i2 WHERE i2.id = i.id FOR JSON PATH),
            'Nueva cotización creada: ' + i.codigo
        FROM inserted i;
    END
END;
GO

-- Trigger: Bloquear eliminación de empleados activos
CREATE TRIGGER trg_prevent_delete_active_empleados
ON adm.empleados
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    IF EXISTS (SELECT 1 FROM deleted WHERE activo = 1)
    BEGIN
        RAISERROR('No se puede eliminar empleados activos. Primero debe cesarlos.', 16, 1);
        ROLLBACK TRANSACTION;
    END
    ELSE
    BEGIN
        DELETE FROM adm.empleados WHERE id IN (SELECT id FROM deleted);
    END
END;
GO

PRINT '✓ Triggers creados exitosamente';
GO

-- =====================================================
-- 9. VISTAS ESTRATÉGICAS
-- =====================================================

-- Vista: Información completa de empleados
CREATE VIEW adm.v_empleados_completa AS
SELECT 
    e.id,
    e.codigo_empleado,
    CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', ISNULL(e.apellido_materno, '')) AS nombre_completo,
    e.tipo_documento,
    e.nro_documento,
    e.celular,
    e.email_personal,
    e.fecha_ingreso,
    e.fecha_cese,
    e.activo,
    c.nombre AS cargo,
    a.nombre AS area,
    CONCAT(j.nombres, ' ', j.apellido_paterno) AS jefe_nombre,
    e.created_at,
    e.updated_at
FROM adm.empleados e
INNER JOIN adm.cargos c ON e.cargo_id = c.id
INNER JOIN adm.areas a ON e.area_id = a.id
LEFT JOIN adm.empleados j ON e.jefe_id = j.id;
GO

-- Vista: Usuarios con información de empleado y roles
CREATE VIEW seg.v_usuarios_completa AS
SELECT 
    u.id AS usuario_id,
    u.correo_corp,
    u.is_active,
    u.is_bloqueado,
    u.ultimo_acceso,
    e.id AS empleado_id,
    e.codigo_empleado,
    CONCAT(e.nombres, ' ', e.apellido_paterno) AS nombre_completo,
    e.celular,
    c.nombre AS cargo,
    a.nombre AS area,
    STRING_AGG(r.nombre, ', ') AS roles
FROM seg.usuarios u
INNER JOIN adm.empleados e ON u.empleado_id = e.id
INNER JOIN adm.cargos c ON e.cargo_id = c.id
INNER JOIN adm.areas a ON e.area_id = a.id
LEFT JOIN seg.usuarios_roles ur ON u.id = ur.usuario_id
LEFT JOIN seg.roles r ON ur.rol_id = r.id
GROUP BY 
    u.id, u.correo_corp, u.is_active, u.is_bloqueado, u.ultimo_acceso,
    e.id, e.codigo_empleado, e.nombres, e.apellido_paterno, e.celular,
    c.nombre, a.nombre;
GO

-- Vista: Clientes con información completa
CREATE VIEW comercial.v_clientes_completa AS
SELECT 
    c.id,
    c.tipo_documento,
    c.nro_documento,
    c.razon_social,
    c.direccion_fiscal,
    c.tipo_estado,
    a.nombre AS area_propietaria,
    CONCAT(ev.nombres, ' ', ev.apellido_paterno) AS vendedor_asignado,
    uv.correo_corp AS correo_vendedor,
    c.created_at,
    c.updated_at,
    (SELECT COUNT(*) FROM comercial.cotizaciones WHERE cliente_id = c.id) AS total_cotizaciones,
    (SELECT COUNT(*) FROM comercial.cotizaciones WHERE cliente_id = c.id AND estado = 'ganada') AS cotizaciones_ganadas
FROM comercial.clientes c
INNER JOIN adm.areas a ON c.propietario_area_id = a.id
INNER JOIN seg.usuarios uv ON c.vendedor_asignado_id = uv.id
INNER JOIN adm.empleados ev ON uv.empleado_id = ev.id;
GO

-- Vista: Dashboard de cotizaciones
CREATE VIEW comercial.v_dashboard_cotizaciones AS
SELECT 
    cot.id,
    cot.codigo,
    cot.version,
    cot.estado,
    cli.razon_social AS cliente,
    CONCAT(ec.nombres, ' ', ec.apellido_paterno) AS comercial,
    CONCAT(ep.nombres, ' ', ep.apellido_paterno) AS pricing,
    cot.moneda,
    cot.total,
    cot.fecha_emision,
    cot.fecha_validez,
    DATEDIFF(DAY, GETDATE(), cot.fecha_validez) AS dias_vigencia,
    s.nombre AS servicio,
    v.nombre AS via,
    i.nombre AS incoterm,
    cot.origen,
    cot.destino,
    cot.created_at
FROM comercial.cotizaciones cot
INNER JOIN comercial.clientes cli ON cot.cliente_id = cli.id
INNER JOIN seg.usuarios uc ON cot.comercial_id = uc.id
INNER JOIN adm.empleados ec ON uc.empleado_id = ec.id
LEFT JOIN seg.usuarios up ON cot.pricing_id = up.id
LEFT JOIN adm.empleados ep ON up.empleado_id = ep.id
INNER JOIN core.servicios s ON cot.tipo_servicio_id = s.id
INNER JOIN core.via v ON cot.via_transporte_id = v.id
INNER JOIN core.incoterms i ON cot.incoterm_id = i.id;
GO

-- Vista: Análisis de rentabilidad por cotización
CREATE VIEW comercial.v_rentabilidad_cotizaciones AS
SELECT 
    cot.id AS cotizacion_id,
    cot.codigo,
    cot.estado,
    cli.razon_social AS cliente,
    cot.total AS venta_total,
    SUM(items.costo_unitario * items.cantidad) AS costo_total,
    SUM(items.margen_valor) AS margen_total,
    CASE 
        WHEN SUM(items.costo_unitario * items.cantidad) > 0 
        THEN ROUND((SUM(items.margen_valor) / SUM(items.costo_unitario * items.cantidad)) * 100, 2)
        ELSE 0
    END AS margen_porcentaje,
    cot.fecha_emision
FROM comercial.cotizaciones cot
INNER JOIN comercial.clientes cli ON cot.cliente_id = cli.id
INNER JOIN comercial.cotizaciones_items items ON cot.id = items.cotizacion_id
GROUP BY cot.id, cot.codigo, cot.estado, cli.razon_social, cot.total, cot.fecha_emision;
GO

-- Vista: Pipeline comercial
CREATE VIEW comercial.v_pipeline_comercial AS
SELECT 
    CONCAT(e.nombres, ' ', e.apellido_paterno) AS comercial,
    a.nombre AS area,
    COUNT(DISTINCT CASE WHEN cot.estado IN ('borrador', 'en_pricing', 'revision_comercial') THEN cot.id END) AS cotiz_en_proceso,
    COUNT(DISTINCT CASE WHEN cot.estado = 'enviada_cliente' THEN cot.id END) AS cotiz_enviadas,
    COUNT(DISTINCT CASE WHEN cot.estado = 'ganada' THEN cot.id END) AS cotiz_ganadas,
    COUNT(DISTINCT CASE WHEN cot.estado = 'perdida' THEN cot.id END) AS cotiz_perdidas,
    SUM(CASE WHEN cot.estado = 'enviada_cliente' THEN cot.total ELSE 0 END) AS valor_pipeline,
    SUM(CASE WHEN cot.estado = 'ganada' THEN cot.total ELSE 0 END) AS valor_ganado,
    CASE 
        WHEN COUNT(CASE WHEN cot.estado IN ('ganada', 'perdida') THEN 1 END) > 0
        THEN ROUND(
            CAST(COUNT(CASE WHEN cot.estado = 'ganada' THEN 1 END) AS FLOAT) / 
            COUNT(CASE WHEN cot.estado IN ('ganada', 'perdida') THEN 1 END) * 100, 2
        )
        ELSE 0
    END AS tasa_conversion
FROM seg.usuarios u
INNER JOIN adm.empleados e ON u.empleado_id = e.id
INNER JOIN adm.areas a ON e.area_id = a.id
LEFT JOIN comercial.cotizaciones cot ON u.id = cot.comercial_id
    AND cot.fecha_emision >= DATEADD(MONTH, -3, GETDATE())
WHERE u.is_active = 1
GROUP BY e.nombres, e.apellido_paterno, a.nombre;
GO

PRINT '✓ Vistas creadas exitosamente';
GO

-- =====================================================
-- 10. STORED PROCEDURES BÁSICOS
-- =====================================================

-- SP: Crear nueva cotización con código automático
CREATE PROCEDURE comercial.sp_crear_cotizacion
    @comercial_id INT,
    @cliente_id INT,
    @tipo_servicio_id INT,
    @via_transporte_id INT,
    @incoterm_id INT,
    @origen NVARCHAR(150),
    @destino NVARCHAR(150),
    @fecha_validez DATE,
    @cotizacion_id INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Generar código único
        DECLARE @anio CHAR(4) = CAST(YEAR(GETDATE()) AS CHAR(4));
        DECLARE @mes CHAR(2) = RIGHT('0' + CAST(MONTH(GETDATE()) AS VARCHAR), 2);
        DECLARE @correlativo INT;
        
        SELECT @correlativo = ISNULL(MAX(CAST(RIGHT(codigo, 4) AS INT)), 0) + 1
        FROM comercial.cotizaciones
        WHERE codigo LIKE 'COT-' + @anio + @mes + '%';
        
        DECLARE @codigo VARCHAR(30) = 'COT-' + @anio + @mes + '-' + RIGHT('0000' + CAST(@correlativo AS VARCHAR), 4);
        
        -- Insertar cotización
        INSERT INTO comercial.cotizaciones (
            codigo, comercial_id, asignado_a_id, cliente_id, tipo_servicio_id,
            via_transporte_id, incoterm_id, origen, destino, fecha_validez,
            estado, created_by
        )
        VALUES (
            @codigo, @comercial_id, @comercial_id, @cliente_id, @tipo_servicio_id,
            @via_transporte_id, @incoterm_id, @origen, @destino, @fecha_validez,
            'borrador', @comercial_id
        );
        
        SET @cotizacion_id = SCOPE_IDENTITY();
        
        COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- SP: Cambiar estado de cotización con validaciones
CREATE PROCEDURE comercial.sp_cambiar_estado_cotizacion
    @cotizacion_id INT,
    @nuevo_estado VARCHAR(40),
    @usuario_id INT,
    @comentario NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        DECLARE @estado_actual VARCHAR(40);
        
        SELECT @estado_actual = estado
        FROM comercial.cotizaciones
        WHERE id = @cotizacion_id;
        
        IF @estado_actual IS NULL
        BEGIN
            RAISERROR('Cotización no encontrada', 16, 1);
            RETURN -1;
        END
        
        -- Validar transición de estados
        IF (@estado_actual = 'borrador' AND @nuevo_estado NOT IN ('en_pricing', 'anulado'))
           OR (@estado_actual = 'en_pricing' AND @nuevo_estado NOT IN ('revision_comercial', 'rechazado_pricing'))
           OR (@estado_actual = 'revision_comercial' AND @nuevo_estado NOT IN ('pendiente_aprobacion', 'rechazado_comercial', 'en_pricing'))
           OR (@estado_actual = 'pendiente_aprobacion' AND @nuevo_estado NOT IN ('aprobada', 'rechazado_comercial'))
           OR (@estado_actual = 'aprobada' AND @nuevo_estado NOT IN ('enviada_cliente'))
           OR (@estado_actual = 'enviada_cliente' AND @nuevo_estado NOT IN ('ganada', 'perdida', 'vencida'))
        BEGIN
            RAISERROR('Transición de estado no permitida', 16, 1);
            RETURN -1;
        END
        
        -- Actualizar estado
        UPDATE comercial.cotizaciones
        SET estado = @nuevo_estado,
            updated_by = @usuario_id
        WHERE id = @cotizacion_id;
        
        -- Registrar en seguimiento
        INSERT INTO comercial.cotizacion_seguimiento (
            cotizacion_id, usuario_id, estado_anterior, estado_nuevo, 
            comentario, tipo_accion
        )
        VALUES (
            @cotizacion_id, @usuario_id, @estado_actual, @nuevo_estado,
            @comentario, 'comentario'
        );
        
        COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- SP: Convertir lead a cliente
CREATE PROCEDURE comercial.sp_convertir_lead_a_cliente
    @lead_id BIGINT,
    @vendedor_asignado_id INT,
    @area_propietaria_id INT,
    @usuario_conversion_id INT,
    @cliente_id INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        DECLARE @ruc VARCHAR(11), @razon_social VARCHAR(255);
        
        SELECT @ruc = ruc, @razon_social = razon_social
        FROM comercial.leads
        WHERE id = @lead_id AND completado = 0;
        
        IF @ruc IS NULL
        BEGIN
            RAISERROR('Lead no encontrado o ya procesado', 16, 1);
            RETURN -1;
        END
        
        -- Crear cliente
        INSERT INTO comercial.clientes (
            tipo_documento, nro_documento, razon_social,
            tipo_estado, propietario_area_id, vendedor_asignado_id,
            origen_lead_id, created_by
        )
        VALUES (
            'RUC', @ruc, @razon_social,
            'activo', @area_propietaria_id, @vendedor_asignado_id,
            @lead_id, @usuario_conversion_id
        );
        
        SET @cliente_id = SCOPE_IDENTITY();
        
        -- Actualizar lead
        UPDATE comercial.leads
        SET convertido_cliente_id = @cliente_id,
            fecha_conversion = GETDATE(),
            completado = 1,
            fecha_terminado = GETDATE()
        WHERE id = @lead_id;
        
        COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- SP: Reporte de ventas por período
CREATE PROCEDURE comercial.sp_reporte_ventas
    @fecha_inicio DATE,
    @fecha_fin DATE,
    @area_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        CONCAT(e.nombres, ' ', e.apellido_paterno) AS comercial,
        a.nombre AS area,
        COUNT(c.id) AS total_cotizaciones,
        COUNT(CASE WHEN c.estado = 'ganada' THEN 1 END) AS cotizaciones_ganadas,
        SUM(CASE WHEN c.estado = 'ganada' THEN c.total ELSE 0 END) AS ventas_totales,
        AVG(CASE WHEN c.estado = 'ganada' THEN c.total END) AS ticket_promedio,
        CASE 
            WHEN COUNT(CASE WHEN c.estado IN ('ganada', 'perdida') THEN 1 END) > 0
            THEN ROUND(
                CAST(COUNT(CASE WHEN c.estado = 'ganada' THEN 1 END) AS FLOAT) /
                COUNT(CASE WHEN c.estado IN ('ganada', 'perdida') THEN 1 END) * 100, 2
            )
            ELSE 0
        END AS tasa_conversion
    FROM comercial.cotizaciones c
    INNER JOIN seg.usuarios u ON c.comercial_id = u.id
    INNER JOIN adm.empleados e ON u.empleado_id = e.id
    INNER JOIN adm.areas a ON e.area_id = a.id
    WHERE c.fecha_emision BETWEEN @fecha_inicio AND @fecha_fin
        AND (@area_id IS NULL OR a.id = @area_id)
    GROUP BY e.nombres, e.apellido_paterno, a.nombre
    ORDER BY ventas_totales DESC;
END;
GO

PRINT '✓ Stored Procedures creados exitosamente';
GO

-- =====================================================
-- 11. SEED DATA - DATOS INICIALES
-- =====================================================

-- Roles del sistema
SET IDENTITY_INSERT seg.roles ON;
INSERT INTO seg.roles (id, nombre, descripcion) VALUES
(1, 'Super Admin', 'Acceso total al sistema'),
(2, 'Gerente General', 'Gestión general y reportes ejecutivos'),
(3, 'Gerente Comercial', 'Gestión del área comercial'),
(4, 'Comercial', 'Gestión de leads, clientes y cotizaciones'),
(5, 'Pricing', 'Costeo y pricing de cotizaciones'),
(6, 'Operaciones', 'Gestión operativa'),
(7, 'Finanzas', 'Gestión financiera'),
(8, 'RRHH', 'Gestión de recursos humanos'),
(9, 'Auditor', 'Solo lectura y auditoría');
SET IDENTITY_INSERT seg.roles OFF;
GO

-- Permisos por módulo
SET IDENTITY_INSERT seg.permisos ON;
INSERT INTO seg.permisos (id, nombre_tecnico, nombre_display, modulo) VALUES
-- Administración
(1, 'adm.empleados.ver', 'Ver Empleados', 'Administración'),
(2, 'adm.empleados.crear', 'Crear Empleados', 'Administración'),
(3, 'adm.empleados.editar', 'Editar Empleados', 'Administración'),
(4, 'adm.empleados.eliminar', 'Eliminar Empleados', 'Administración'),
(5, 'adm.areas.gestionar', 'Gestionar Áreas', 'Administración'),
(6, 'adm.cargos.gestionar', 'Gestionar Cargos', 'Administración'),
-- Seguridad
(10, 'seg.usuarios.ver', 'Ver Usuarios', 'Seguridad'),
(11, 'seg.usuarios.crear', 'Crear Usuarios', 'Seguridad'),
(12, 'seg.usuarios.editar', 'Editar Usuarios', 'Seguridad'),
(13, 'seg.roles.gestionar', 'Gestionar Roles y Permisos', 'Seguridad'),
(14, 'seg.auditoria.ver', 'Ver Auditoría', 'Seguridad'),
-- Comercial - Leads
(20, 'com.leads.ver', 'Ver Leads', 'Comercial'),
(21, 'com.leads.gestionar', 'Gestionar Leads', 'Comercial'),
(22, 'com.leads.importar', 'Importar Leads', 'Comercial'),
(23, 'com.leads.asignar', 'Asignar Leads', 'Comercial'),
-- Comercial - Clientes
(30, 'com.clientes.ver', 'Ver Clientes', 'Comercial'),
(31, 'com.clientes.crear', 'Crear Clientes', 'Comercial'),
(32, 'com.clientes.editar', 'Editar Clientes', 'Comercial'),
(33, 'com.clientes.ver_todos', 'Ver Todos los Clientes', 'Comercial'),
-- Comercial - Cotizaciones
(40, 'com.cotizaciones.ver', 'Ver Cotizaciones', 'Comercial'),
(41, 'com.cotizaciones.crear', 'Crear Cotizaciones', 'Comercial'),
(42, 'com.cotizaciones.editar', 'Editar Cotizaciones', 'Comercial'),
(43, 'com.cotizaciones.aprobar', 'Aprobar Cotizaciones', 'Comercial'),
(44, 'com.cotizaciones.pricing', 'Gestionar Pricing', 'Comercial'),
(45, 'com.cotizaciones.ver_costos', 'Ver Costos y Márgenes', 'Comercial'),
-- Reportes
(50, 'reportes.ventas', 'Reportes de Ventas', 'Reportes'),
(51, 'reportes.comerciales', 'Reportes Comerciales', 'Reportes'),
(52, 'reportes.rentabilidad', 'Reportes de Rentabilidad', 'Reportes'),
(53, 'reportes.ejecutivos', 'Reportes Ejecutivos', 'Reportes');
SET IDENTITY_INSERT seg.permisos OFF;
GO

-- Asignar permisos a roles
INSERT INTO seg.rol_permiso (rol_id, permiso_id) 
SELECT 1, id FROM seg.permisos; -- Super Admin: todos los permisos

INSERT INTO seg.rol_permiso (rol_id, permiso_id) VALUES
-- Gerente General
(2, 1), (2, 10), (2, 14), (2, 20), (2, 30), (2, 33), (2, 40), (2, 45), (2, 50), (2, 51), (2, 52), (2, 53),
-- Gerente Comercial
(3, 1), (3, 20), (3, 21), (3, 22), (3, 23), (3, 30), (3, 31), (3, 32), (3, 33), (3, 40), (3, 41), (3, 42), (3, 43), (3, 45), (3, 50), (3, 51), (3, 52),
-- Comercial
(4, 1), (4, 20), (4, 21), (4, 30), (4, 31), (4, 32), (4, 40), (4, 41), (4, 42),
-- Pricing
(5, 1), (5, 40), (5, 44), (5, 45),
-- Auditor
(9, 1), (9, 10), (9, 14), (9, 20), (9, 30), (9, 40), (9, 50), (9, 51), (9, 52), (9, 53);
GO

-- Cargos
SET IDENTITY_INSERT adm.cargos ON;
INSERT INTO adm.cargos (id, nombre, descripcion) VALUES
(1, 'Gerente General', 'Máxima autoridad ejecutiva'),
(2, 'Gerente Comercial', 'Responsable del área comercial'),
(3, 'Gerente de Operaciones', 'Responsable del área operativa'),
(4, 'Gerente de Finanzas', 'Responsable del área financiera'),
(5, 'Jefe de Pricing', 'Responsable de costeo y precios'),
(6, 'Ejecutivo Comercial', 'Gestión de clientes y ventas'),
(7, 'Coordinador de Operaciones', 'Coordinación operativa'),
(8, 'Asistente Comercial', 'Apoyo al área comercial'),
(9, 'Analista de Pricing', 'Análisis de costos y precios'),
(10, 'Contador', 'Gestión contable'),
(11, 'Asistente Administrativo', 'Apoyo administrativo');
SET IDENTITY_INSERT adm.cargos OFF;
GO

-- Áreas
SET IDENTITY_INSERT adm.areas ON;
INSERT INTO adm.areas (id, nombre, descripcion, comisiona_ventas) VALUES
(1, 'Gerencia General', 'Dirección ejecutiva', 0),
(2, 'Comercial', 'Área de ventas y comercial', 1),
(3, 'Operaciones', 'Área operativa', 0),
(4, 'Pricing', 'Costeo y pricing', 0),
(5, 'Finanzas', 'Área financiera', 0),
(6, 'Recursos Humanos', 'Gestión de personal', 0),
(7, 'Sistemas', 'TI y sistemas', 0);
SET IDENTITY_INSERT adm.areas OFF;
GO

-- Estados de Lead
SET IDENTITY_INSERT comercial.estados_lead ON;
INSERT INTO comercial.estados_lead (id, nombre, descripcion, color, orden) VALUES
(1, 'Nuevo', 'Lead recién ingresado', '#3B82F6', 1),
(2, 'Contactado', 'Primer contacto realizado', '#8B5CF6', 2),
(3, 'Calificado', 'Lead calificado como potencial', '#10B981', 3),
(4, 'En negociación', 'En proceso de negociación', '#F59E0B', 4),
(5, 'No interesado', 'No tiene interés', '#EF4444', 5),
(6, 'Convertido', 'Convertido a cliente', '#059669', 6);
SET IDENTITY_INSERT comercial.estados_lead OFF;
GO

-- Conceptos de cotización
SET IDENTITY_INSERT comercial.conceptos ON;
INSERT INTO comercial.conceptos (id, nombre, descripcion, categoria) VALUES
(1, 'Flete Internacional', 'Transporte internacional de mercancía', 'Transporte'),
(2, 'Flete Local', 'Transporte local/nacional', 'Transporte'),
(3, 'Manipuleo de Carga', 'Carga y descarga de mercancía', 'Operaciones'),
(4, 'Almacenaje', 'Almacenamiento de mercancía', 'Operaciones'),
(5, 'Documentación', 'Gestión documental', 'Administrativo'),
(6, 'Agenciamiento de Aduanas', 'Trámites aduaneros', 'Aduanas'),
(7, 'Seguro de Carga', 'Seguro de mercancía', 'Seguros'),
(8, 'Certificaciones', 'Certificaciones requeridas', 'Documentos'),
(9, 'Inspección', 'Inspección de carga', 'Operaciones'),
(10, 'Embalaje', 'Embalaje especial', 'Operaciones');
SET IDENTITY_INSERT comercial.conceptos OFF;
GO

-- Incoterms
SET IDENTITY_INSERT core.incoterms ON;
INSERT INTO core.incoterms (id, nombre, nombre_largo, tipo) VALUES
(1, 'EXW', 'Ex Works', 'Cualquier modo'),
(2, 'FCA', 'Free Carrier', 'Cualquier modo'),
(3, 'CPT', 'Carriage Paid To', 'Cualquier modo'),
(4, 'CIP', 'Carriage and Insurance Paid To', 'Cualquier modo'),
(5, 'DAP', 'Delivered At Place', 'Cualquier modo'),
(6, 'DPU', 'Delivered at Place Unloaded', 'Cualquier modo'),
(7, 'DDP', 'Delivered Duty Paid', 'Cualquier modo'),
(8, 'FAS', 'Free Alongside Ship', 'Marítimo'),
(9, 'FOB', 'Free On Board', 'Marítimo'),
(10, 'CFR', 'Cost and Freight', 'Marítimo'),
(11, 'CIF', 'Cost, Insurance and Freight', 'Marítimo');
SET IDENTITY_INSERT core.incoterms OFF;
GO

-- Tipos de contenedor
SET IDENTITY_INSERT core.tipo_contenedor ON;
INSERT INTO core.tipo_contenedor (id, nombre, descripcion) VALUES
(1, '20 ST', 'Contenedor estándar 20 pies'),
(2, '40 ST', 'Contenedor estándar 40 pies'),
(3, '40 HC', 'Contenedor High Cube 40 pies'),
(4, '20 RF', 'Contenedor refrigerado 20 pies'),
(5, '40 RF', 'Contenedor refrigerado 40 pies'),
(6, 'LCL', 'Less than Container Load'),
(7, 'FCL', 'Full Container Load');
SET IDENTITY_INSERT core.tipo_contenedor OFF;
GO

-- Vías de transporte
SET IDENTITY_INSERT core.via ON;
INSERT INTO core.via (id, nombre, descripcion) VALUES
(1, 'Marítima', 'Transporte por vía marítima'),
(2, 'Aérea', 'Transporte por vía aérea'),
(3, 'Terrestre', 'Transporte por vía terrestre'),
(4, 'Multimodal', 'Combinación de vías de transporte');
SET IDENTITY_INSERT core.via OFF;
GO

-- Tipos de mercadería
SET IDENTITY_INSERT core.tipo_mercaderia ON;
INSERT INTO core.tipo_mercaderia (id, nombre, descripcion) VALUES
(1, 'Carga General', 'Mercancía general sin características especiales'),
(2, 'Carga Refrigerada', 'Mercancía que requiere temperatura controlada'),
(3, 'Carga Peligrosa', 'Mercancía con materiales peligrosos'),
(4, 'Carga Sobredimensionada', 'Mercancía de gran tamaño'),
(5, 'Carga Frágil', 'Mercancía delicada'),
(6, 'Perecibles', 'Productos perecederos'),
(7, 'Químicos', 'Productos químicos'),
(8, 'Electrónica', 'Equipos electrónicos'),
(9, 'Textiles', 'Productos textiles'),
(10, 'Alimentos', 'Productos alimenticios');
SET IDENTITY_INSERT core.tipo_mercaderia OFF;
GO

-- Servicios
SET IDENTITY_INSERT core.servicios ON;
INSERT INTO core.servicios (id, nombre, descripcion) VALUES
(1, 'Importación', 'Servicio de importación de mercancías'),
(2, 'Exportación', 'Servicio de exportación de mercancías'),
(3, 'Transporte Internacional', 'Transporte internacional de carga'),
(4, 'Agenciamiento de Aduanas', 'Trámites aduaneros'),
(5, 'Almacenamiento', 'Servicios de almacenaje'),
(6, 'Distribución', 'Distribución local'),
(7, 'Consolidación', 'Consolidación de carga'),
(8, 'Desconsolidación', 'Desconsolidación de carga'),
(9, 'Consultoría Logística', 'Asesoría en logística');
SET IDENTITY_INSERT core.servicios OFF;
GO

-- Configuraciones del sistema
SET IDENTITY_INSERT core.configuraciones ON;
INSERT INTO core.configuraciones (id, clave, valor, tipo_dato, categoria, descripcion) VALUES
(1, 'empresa.nombre', 'Grupo Corban', 'string', 'Empresa', 'Nombre de la empresa'),
(2, 'empresa.ruc', '20XXXXXXXXX', 'string', 'Empresa', 'RUC de la empresa'),
(3, 'empresa.direccion', 'Lima, Perú', 'string', 'Empresa', 'Dirección fiscal'),
(4, 'sistema.moneda_default', 'USD', 'string', 'Sistema', 'Moneda por defecto'),
(5, 'sistema.igv_porcentaje', '18', 'decimal', 'Sistema', 'Porcentaje de IGV'),
(6, 'cotizacion.validez_dias', '15', 'int', 'Cotización', 'Días de validez por defecto'),
(7, 'cotizacion.aprobacion_monto', '10000', 'decimal', 'Cotización', 'Monto que requiere aprobación'),
(8, 'notificaciones.email_activo', 'true', 'boolean', 'Notificaciones', 'Activar notificaciones por email'),
(9, 'seguridad.intentos_login', '5', 'int', 'Seguridad', 'Intentos de login antes de bloqueo'),
(10, 'seguridad.sesion_expira_minutos', '480', 'int', 'Seguridad', 'Tiempo de expiración de sesión');
SET IDENTITY_INSERT core.configuraciones OFF;
GO

PRINT '✓ Seed data insertado exitosamente';
GO

-- =====================================================
-- 12. USUARIO ADMINISTRADOR INICIAL
-- =====================================================

-- Empleado admin
SET IDENTITY_INSERT adm.empleados ON;
INSERT INTO adm.empleados (
    id, codigo_empleado, nombres, apellido_paterno, apellido_materno,
    fecha_nacimiento, tipo_documento, nro_documento, celular, email_personal,
    fecha_ingreso, activo, cargo_id, area_id
) VALUES (
    1, 'EMP-0001', 'Administrador', 'Sistema', NULL,
    '1990-01-01', 'DNI', '00000001', '999999999', 'admin@grupocorban.com',
    GETDATE(), 1, 1, 1
);
SET IDENTITY_INSERT adm.empleados OFF;
GO

-- Usuario admin (password: Admin123!)
SET IDENTITY_INSERT seg.usuarios ON;
INSERT INTO seg.usuarios (
    id, empleado_id, correo_corp, password_hash, is_active, debe_cambiar_password
) VALUES (
    1, 1, 'admin@grupocorban.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Admin123!
    1, 1
);
SET IDENTITY_INSERT seg.usuarios OFF;
GO

-- Asignar rol Super Admin
INSERT INTO seg.usuarios_roles (usuario_id, rol_id) VALUES (1, 1);
GO

PRINT '✓ Usuario administrador creado (admin@grupocorban.com / Admin123!)';
GO

-- =====================================================
-- 13. ESTADÍSTICAS Y VALIDACIÓN FINAL
-- =====================================================

PRINT '';
PRINT '========================================================';
PRINT '✓ BASE DE DATOS SGI - GRUPO CORBAN CREADA EXITOSAMENTE';
PRINT '========================================================';
PRINT '';
PRINT 'RESUMEN DE OBJETOS CREADOS:';
PRINT '----------------------------';

SELECT 
    'Tablas' AS Tipo,
    COUNT(*) AS Cantidad
FROM sys.tables
WHERE schema_id IN (
    SCHEMA_ID('adm'), SCHEMA_ID('seg'), 
    SCHEMA_ID('comercial'), SCHEMA_ID('core')
)
UNION ALL
SELECT 'Vistas', COUNT(*)
FROM sys.views
WHERE schema_id IN (
    SCHEMA_ID('adm'), SCHEMA_ID('seg'), 
    SCHEMA_ID('comercial'), SCHEMA_ID('core')
)
UNION ALL
SELECT 'Stored Procedures', COUNT(*)
FROM sys.procedures
WHERE schema_id IN (
    SCHEMA_ID('adm'), SCHEMA_ID('seg'), 
    SCHEMA_ID('comercial'), SCHEMA_ID('core')
)
UNION ALL
SELECT 'Triggers', COUNT(*)
FROM sys.triggers
WHERE parent_class = 1
UNION ALL
SELECT 'Índices', COUNT(*)
FROM sys.indexes
WHERE object_id IN (
    SELECT object_id FROM sys.tables
    WHERE schema_id IN (
        SCHEMA_ID('adm'), SCHEMA_ID('seg'), 
        SCHEMA_ID('comercial'), SCHEMA_ID('core')
    )
)
AND type > 0;

PRINT '';
PRINT 'CREDENCIALES INICIALES:';
PRINT '----------------------';
PRINT 'Usuario: admin@grupocorban.com';
PRINT 'Password: Admin123!';
PRINT '⚠ IMPORTANTE: Cambiar contraseña en el primer acceso';
PRINT '';
PRINT '========================================================';
GO