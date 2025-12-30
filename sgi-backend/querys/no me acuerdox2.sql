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
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'rrhh')
BEGIN
    EXEC('CREATE SCHEMA rrhh');
    PRINT '✓ Schema rrhh creado';
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
-- 3. SCHEMA: RRHH (Recursos Humanos)
-- =====================================================

-- Tabla: rrhh.cargos
-- Descripción: Catálogo de cargos/puestos de trabajo
CREATE TABLE rrhh.cargos (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(300) NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Tabla: rrhh.areas
-- Descripción: Áreas organizacionales de la empresa
CREATE TABLE rrhh.areas (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(300) NULL,
    parent_area_id INT NULL,
    responsable_id INT NULL,
    comisiona_ventas BIT DEFAULT 0, -- TRUE si el área genera comisiones
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Constraint: auto-referencia para jerarquía de áreas
    CONSTRAINT FK_areas_parent FOREIGN KEY (parent_area_id) 
        REFERENCES rrhh.areas(id)
);
GO

-- Tabla: rrhh.empleados
-- Descripción: Registro de empleados de la empresa
CREATE TABLE rrhh.empleados (
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
        REFERENCES rrhh.cargos(id),
    CONSTRAINT FK_empleados_area FOREIGN KEY (area_id) 
        REFERENCES rrhh.areas(id),
    CONSTRAINT FK_empleados_jefe FOREIGN KEY (jefe_id) 
        REFERENCES rrhh.empleados(id)
);
GO

-- Actualizar FK de responsable en areas (después de crear empleados)
ALTER TABLE rrhh.areas
ADD CONSTRAINT FK_areas_responsable FOREIGN KEY (responsable_id)
    REFERENCES rrhh.empleados(id);
GO

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
        REFERENCES rrhh.empleados(id)
);
GO

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

-- =====================================================
-- 5. SCHEMA: COMERCIAL
-- =====================================================

-- Tabla: comercial.clientes
-- Descripción: Base de datos de clientes y prospectos

CREATE TABLE comercial.lotes_carga(
    id int primary key identity(1,1),
    nombre_archivo varchar(100) not null,
    fecha_subida datetime not null,
    total_registros int not null,
    estado varchar(30) not null check(estado in ('En gestión', 'Terminada'))
);

CREATE TABLE comercial.leads(
    id int primary key identity(1,1),
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
);

CREATE TABLE comercial.clientes (
    id INT PRIMARY KEY IDENTITY(1,1),
    codigo_cliente VARCHAR(20) UNIQUE NOT NULL,
    
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
        REFERENCES rrhh.areas(id),
    CONSTRAINT FK_clientes_vendedor FOREIGN KEY (vendedor_asignado_id) 
        REFERENCES rrhh.empleados(id)
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

CREATE TABLE comercial.solicitudes_cotizacion(
    id INT PRIMARY KEY IDENTITY(1,1),
    cliente_id int null,
    lead_id int null,
    comercial_id int not null,

);

-- Tabla: comercial.servicios
-- Descripción: Catálogo de servicios que ofrece la empresa


-- Tabla: comercial.cotizaciones
-- Descripción: Cotizaciones comerciales
CREATE TABLE comercial.cotizaciones (
    id INT PRIMARY KEY IDENTITY(1,1),
    codigo VARCHAR(30) UNIQUE NOT NULL, -- COT-000001
    version INT DEFAULT 1,
    cotizacion_padre_id INT NULL, -- Si es revisión de otra cotización
    
    -- Responsable
    vendedor_id INT NOT NULL,
    cliente_id INT NOT NULL,
    contacto_cliente_id INT NULL,
    
    -- Estado
    estado VARCHAR(30) DEFAULT 'borrador' CHECK(estado IN (
        'borrador',
        'pendiente_aprobacion',
        'aprobada',
        'rechazada',
        'enviada_cliente',
        'ganada',
        'perdida',
        'vencida'
    )),
    
    -- Datos de operación
    tipo_servicio int not null,
    via_transporte int not null,
    incoterm int not null,
    tipo_contenedor int not null,
    
    -- Ruta
    origen NVARCHAR(150) NOT NULL,
    destino NVARCHAR(150) NOT NULL,
    
    -- Carga
    descripcion_carga NVARCHAR(500) NULL,
    peso_total DECIMAL(18,2) NULL,
    volumen_total DECIMAL(18,2) NULL,
    cantidad_bultos INT NULL,
    tipo_carga VARCHAR(50) NULL,
    
    -- Financiero
    moneda VARCHAR(3) DEFAULT 'USD' CHECK(moneda IN ('USD','PEN','EUR')),
    tipo_cambio DECIMAL(10,4) NULL,
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    igv DECIMAL(18,2) DEFAULT 0,
    total DECIMAL(18,2) NOT NULL DEFAULT 0,
    
    -- Validez
    fecha_validez DATE NOT NULL,
    tiempo_transito_dias INT NULL,
    
    -- Observaciones
    observaciones NVARCHAR(1000) NULL,
    terminos_condiciones NVARCHAR(2000) NULL,
    
    -- Aprobación
    aprobado_por_id INT NULL,
    fecha_aprobacion DATETIME2 NULL,
    motivo_rechazo NVARCHAR(500) NULL,
    
    -- Resultado con cliente
    resultado_cliente VARCHAR(20) NULL CHECK(resultado_cliente IN ('ganada','perdida','pendiente')),
    motivo_perdida NVARCHAR(500) NULL,
    
    -- Auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by INT NULL,
    updated_by INT NULL,
    
    -- Foreign Keys
    CONSTRAINT FK_cotizaciones_vendedor FOREIGN KEY (vendedor_id) 
        REFERENCES rrhh.empleados(id),
    CONSTRAINT FK_cotizaciones_cliente FOREIGN KEY (cliente_id) 
        REFERENCES comercial.clientes(id),
    CONSTRAINT FK_cotizaciones_contacto FOREIGN KEY (contacto_cliente_id) 
        REFERENCES comercial.clientes_contactos(id),
    CONSTRAINT FK_cotizaciones_aprobador FOREIGN KEY (aprobado_por_id) 
        REFERENCES seg.usuarios(id),
    CONSTRAINT FK_cotizaciones_padre FOREIGN KEY (cotizacion_padre_id) 
        REFERENCES comercial.cotizaciones(id)
);
GO

-- Tabla: comercial.cotizaciones_items
-- Descripción: Líneas de detalle de cada cotización
CREATE TABLE comercial.cotizaciones_items (
    id INT PRIMARY KEY IDENTITY(1,1),
    cotizacion_id INT NOT NULL,
    servicio_id INT NOT NULL,
    
    -- Detalle
    descripcion_item NVARCHAR(300) NULL,
    cantidad DECIMAL(18,2) NOT NULL DEFAULT 1,
    unidad_medida VARCHAR(20) NULL,
    
    -- Costos
    costo_unitario DECIMAL(18,2) NOT NULL DEFAULT 0,
    costo_total AS (cantidad * costo_unitario) PERSISTED,
    
    -- Precios
    precio_unitario DECIMAL(18,2) NOT NULL,
    precio_total AS (cantidad * precio_unitario) PERSISTED,
    margen_porcentaje AS (
        CASE 
            WHEN costo_unitario > 0 
            THEN ((precio_unitario - costo_unitario) / costo_unitario) * 100 
            ELSE 0 
        END
    ) PERSISTED,
    
    -- Otros
    observacion NVARCHAR(500) NULL,
    orden INT DEFAULT 1,
    
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    CONSTRAINT FK_items_cotizacion FOREIGN KEY (cotizacion_id) 
        REFERENCES comercial.cotizaciones(id) ON DELETE CASCADE,
    CONSTRAINT FK_items_servicio FOREIGN KEY (servicio_id) 
        REFERENCES comercial.servicios(id)
);
GO

-- Tabla: comercial.cotizacion_seguimiento
-- Descripción: Historial de cambios de estado de cotizaciones
CREATE TABLE comercial.cotizacion_seguimiento (
    id INT PRIMARY KEY IDENTITY(1,1),
    cotizacion_id INT NOT NULL,
    estado_anterior VARCHAR(30) NULL,
    estado_actual VARCHAR(30) NOT NULL,
    usuario_id INT NOT NULL,
    comentario NVARCHAR(1000) NULL,
    tipo_cambio VARCHAR(50) DEFAULT 'cambio_estado',
    documento_url NVARCHAR(500) NULL,
    fecha_cambio DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Keys
    CONSTRAINT FK_seguimiento_cotizacion FOREIGN KEY (cotizacion_id) 
        REFERENCES comercial.cotizaciones(id) ON DELETE CASCADE,
    CONSTRAINT FK_seguimiento_usuario FOREIGN KEY (usuario_id) 
        REFERENCES seg.usuarios(id)
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

-- =====================================================
-- 6. SCHEMA: CORE (Configuraciones y utilidades)
-- =====================================================

-- Tabla: core.configuraciones
-- Descripción: Configuraciones del sistema (clave-valor)
CREATE TABLE core.configuraciones (
    id INT PRIMARY KEY IDENTITY(1,1),
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor NVARCHAR(500) NOT NULL,
    tipo_dato VARCHAR(20) CHECK(tipo_dato IN ('string','int','decimal','boolean','json')),
    descripcion NVARCHAR(300) NULL,
    updated_at DATETIME2 DEFAULT GETDATE(),
    updated_by INT NULL
);
GO

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
);
GO

CREATE TABLE core.tipo_contenedor(
    id int primary key identity(1,1),
    nombre varchar(50),
    descripcion varchar(100)
);
GO

CREATE TABLE core.via(
    id int primary key identity(1,1),
    nombre varchar(50),
    descripcion varchar(255)
);
GO

CREATE TABLE core.servicios (
    id INT PRIMARY KEY IDENTITY(1,1),
    codigo_servicio VARCHAR(20) UNIQUE NOT NULL,
    nombre varchar(100) not null,
    descripcion varchar(255) not null,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- =====================================================
-- 7. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices en rrhh.empleados
CREATE INDEX idx_empleados_area ON rrhh.empleados(area_id);
CREATE INDEX idx_empleados_cargo ON rrhh.empleados(cargo_id);
CREATE INDEX idx_empleados_jefe ON rrhh.empleados(jefe_id);
CREATE INDEX idx_empleados_documento ON rrhh.empleados(tipo_documento, nro_documento);
CREATE INDEX idx_empleados_activo ON rrhh.empleados(activo);
GO

-- Índices en seg.usuarios
CREATE INDEX idx_usuarios_empleado ON seg.usuarios(empleado_id);
CREATE INDEX idx_usuarios_correo ON seg.usuarios(correo_corp);
CREATE INDEX idx_usuarios_activo ON seg.usuarios(is_active);
GO

-- Índices en comercial.clientes
CREATE INDEX idx_clientes_vendedor ON comercial.clientes(vendedor_asignado_id);
CREATE INDEX idx_clientes_area_propietaria ON comercial.clientes(propietario_area_id);
CREATE INDEX idx_clientes_estado ON comercial.clientes(tipo_estado);
CREATE INDEX idx_clientes_documento ON comercial.clientes(tipo_documento, nro_documento);
GO

-- Índices en comercial.cotizaciones
CREATE INDEX idx_cotizaciones_vendedor ON comercial.cotizaciones(vendedor_id);
CREATE INDEX idx_cotizaciones_cliente ON comercial.cotizaciones(cliente_id);
CREATE INDEX idx_cotizaciones_estado ON comercial.cotizaciones(estado);
CREATE INDEX idx_cotizaciones_fecha ON comercial.cotizaciones(created_at DESC);
CREATE INDEX idx_cotizaciones_codigo ON comercial.cotizaciones(codigo);
CREATE INDEX idx_cotizaciones_validez ON comercial.cotizaciones(fecha_validez);
GO

-- Índices en comercial.cotizaciones_items
CREATE INDEX idx_items_cotizacion ON comercial.cotizaciones_items(cotizacion_id);
CREATE INDEX idx_items_servicio ON comercial.cotizaciones_items(servicio_id);
GO

-- Índices en comercial.cotizacion_seguimiento
CREATE INDEX idx_seguimiento_cotizacion ON comercial.cotizacion_seguimiento(cotizacion_id);
CREATE INDEX idx_seguimiento_fecha ON comercial.cotizacion_seguimiento(fecha_cambio DESC);
GO

-- Índices en comercial.auditoria_log
CREATE INDEX idx_auditoria_usuario ON comercial.auditoria_log(usuario_id);
CREATE INDEX idx_auditoria_fecha ON comercial.auditoria_log(fecha_evento DESC);
CREATE INDEX idx_auditoria_tabla ON comercial.auditoria_log(tabla_afectada, registro_id);
CREATE INDEX idx_auditoria_modulo ON comercial.auditoria_log(modulo);
GO

-- Índices en core.notificaciones
CREATE INDEX idx_notif_usuario_leida ON core.notificaciones(usuario_id, leida, created_at DESC);
GO

-- Índices en core.documentos
CREATE INDEX idx_docs_origen ON core.documentos(modulo, tabla_origen, registro_id);
CREATE INDEX idx_docs_usuario ON core.documentos(uploaded_by);
GO

-- =====================================================
-- 8. COMENTARIOS EN TABLAS (Documentación)
-- =====================================================

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Catálogo de cargos/puestos de trabajo de la empresa', 
    @level0type=N'SCHEMA', @level0name=N'rrhh', 
    @level1type=N'TABLE', @level1name=N'cargos';
GO

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Áreas organizacionales de Grupo Corban', 
    @level0type=N'SCHEMA', @level0name=N'rrhh', 
    @level1type=N'TABLE', @level1name=N'areas';
GO

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Registro completo de empleados de la empresa', 
    @level0type=N'SCHEMA', @level0name=N'rrhh', 
    @level1type=N'TABLE', @level1name=N'empleados';
GO

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Usuarios del sistema con credenciales de acceso', 
    @level0type=N'SCHEMA', @level0name=N'seg', 
    @level1type=N'TABLE', @level1name=N'usuarios';
GO

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Base de datos de clientes y prospectos', 
    @level0type=N'SCHEMA', @level0name=N'comercial', 
    @level1type=N'TABLE', @level1name=N'clientes';
GO

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Cotizaciones comerciales del área de ventas', 
    @level0type=N'SCHEMA', @level0name=N'comercial', 
    @level1type=N'TABLE', @level1name=N'cotizaciones';
GO

-- =====================================================
-- 9. SCRIPT FINALIZADO
-- =====================================================
PRINT '';
PRINT '==============================================';
PRINT '✓ SCRIPT EJECUTADO EXITOSAMENTE';
PRINT '==============================================';
PRINT 'Base de datos: SGI_GrupoCorban';
PRINT 'Schemas creados: 4 (rrhh, seg, comercial, core)';
PRINT 'Tablas creadas: 18';
PRINT 'Índices creados: 20+';
PRINT '';
PRINT 'Siguiente paso: Ejecutar script de SEED DATA';
PRINT '==============================================';
GO