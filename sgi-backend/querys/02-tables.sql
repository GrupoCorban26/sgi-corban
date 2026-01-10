-- =====================================================
-- 02 - TABLAS (seg, adm, core, comercial)
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- SQL Server 2025
-- =====================================================
-- Ejecutar después de 01-database-schemas.sql
-- =====================================================

USE SGI_GrupoCorban;
GO

-- #####################################################
-- #  SCHEMA SEGURIDAD (seg)                          #
-- #####################################################

-- -----------------------------------------------------
-- 1.1 ROLES
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'roles' AND schema_id = SCHEMA_ID('seg'))
BEGIN
    CREATE TABLE seg.roles(
        id INT IDENTITY(1,1),
        nombre VARCHAR(100) NOT NULL,
        descripcion NVARCHAR(300),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla seg.roles creada';
END
GO

-- -----------------------------------------------------
-- 1.2 PERMISOS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'permisos' AND schema_id = SCHEMA_ID('seg'))
BEGIN
    CREATE TABLE seg.permisos(
        id INT IDENTITY(1,1),
        nombre_tecnico VARCHAR(100) NOT NULL,
        nombre_display VARCHAR(150) NOT NULL,
        modulo VARCHAR(100),
        descripcion VARCHAR(300),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla seg.permisos creada';
END
GO

-- -----------------------------------------------------
-- 1.3 ROL_PERMISO (Tabla intermedia)
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'rol_permiso' AND schema_id = SCHEMA_ID('seg'))
BEGIN
    CREATE TABLE seg.rol_permiso(
        rol_id INT NOT NULL,
        permiso_id INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by INT
    );
    PRINT '✓ Tabla seg.rol_permiso creada';
END
GO

-- -----------------------------------------------------
-- 1.4 USUARIOS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios' AND schema_id = SCHEMA_ID('seg'))
BEGIN
    CREATE TABLE seg.usuarios(
        id INT IDENTITY(1,1),
        empleado_id INT,
        correo_corp NVARCHAR(100) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        is_bloqueado BIT NOT NULL DEFAULT 0,
        intentos_fallidos INT NOT NULL DEFAULT 0,
        reset_token NVARCHAR(255),
        reset_token_expira DATETIME2,
        ultimo_acceso DATETIME2,
        debe_cambiar_pass BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2,
        created_by INT,
        updated_by INT
    );
    PRINT '✓ Tabla seg.usuarios creada';
END
GO

-- -----------------------------------------------------
-- 1.5 SESIONES
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sesiones' AND schema_id = SCHEMA_ID('seg'))
BEGIN
    CREATE TABLE seg.sesiones(
        id INT IDENTITY(1,1),
        usuario_id INT NOT NULL,
        refresh_token NVARCHAR(500) NOT NULL,
        user_agent NVARCHAR(255),
        ip_address VARCHAR(45),
        expira_en DATETIME2 NOT NULL,
        es_revocado BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla seg.sesiones creada';
END
GO

-- -----------------------------------------------------
-- 1.6 LOGS DE ACCESO
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'logs_acceso' AND schema_id = SCHEMA_ID('seg'))
BEGIN
    CREATE TABLE seg.logs_acceso(
        id INT IDENTITY(1,1),
        usuario_id INT,
        fecha_ingreso DATETIME2 NOT NULL DEFAULT GETDATE(),
        exitoso BIT NOT NULL,
        ip_address VARCHAR(45)
    );
    PRINT '✓ Tabla seg.logs_acceso creada';
END
GO

-- -----------------------------------------------------
-- 1.7 USUARIOS_ROLES (Tabla intermedia)
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios_roles' AND schema_id = SCHEMA_ID('seg'))
BEGIN
    CREATE TABLE seg.usuarios_roles(
        usuario_id INT NOT NULL,
        rol_id INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by INT
    );
    PRINT '✓ Tabla seg.usuarios_roles creada';
END
GO

-- #####################################################
-- #  SCHEMA ADMINISTRACIÓN (adm)                     #
-- #####################################################

-- -----------------------------------------------------
-- 2.1 DEPARTAMENTOS (Organizacionales)
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'departamentos' AND schema_id = SCHEMA_ID('adm'))
BEGIN
    CREATE TABLE adm.departamentos(
        id INT IDENTITY(1,1),
        nombre VARCHAR(100) NOT NULL,
        descripcion VARCHAR(300),
        responsable_id INT,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla adm.departamentos creada';
END
GO

-- -----------------------------------------------------
-- 2.2 ÁREAS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'areas' AND schema_id = SCHEMA_ID('adm'))
BEGIN
    CREATE TABLE adm.areas(
        id INT IDENTITY(1,1),
        nombre NVARCHAR(100) NOT NULL,
        descripcion NVARCHAR(300),
        departamento_id INT,
        area_padre_id INT,
        responsable_id INT,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla adm.areas creada';
END
GO

-- -----------------------------------------------------
-- 2.3 CARGOS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cargos' AND schema_id = SCHEMA_ID('adm'))
BEGIN
    CREATE TABLE adm.cargos(
        id INT IDENTITY(1,1),
        nombre NVARCHAR(100) NOT NULL,
        descripcion NVARCHAR(300),
        area_id INT,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla adm.cargos creada';
END
GO

-- -----------------------------------------------------
-- 2.4 ACTIVOS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'activos' AND schema_id = SCHEMA_ID('adm'))
BEGIN
    CREATE TABLE adm.activos(
        id INT IDENTITY(1,1),
        producto NVARCHAR(50) NOT NULL,
        marca NVARCHAR(50),
        modelo NVARCHAR(50),
        serie NVARCHAR(100),
        codigo_inventario NVARCHAR(50),
        estado_fisico NVARCHAR(50) DEFAULT 'BUENO',
        is_disponible BIT NOT NULL DEFAULT 1,
        observaciones NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla adm.activos creada';
END
GO

-- -----------------------------------------------------
-- 2.5 EMPLEADO_ACTIVO (Asignación de activos)
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'empleado_activo' AND schema_id = SCHEMA_ID('adm'))
BEGIN
    CREATE TABLE adm.empleado_activo(
        id INT IDENTITY(1,1),
        empleado_id INT NOT NULL,
        activo_id INT NOT NULL,
        fecha_entrega DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_devolucion DATETIME2,
        estado_al_entregar NVARCHAR(50),
        estado_al_devolver NVARCHAR(50),
        observaciones NVARCHAR(MAX),
        asignado_por INT
    );
    PRINT '✓ Tabla adm.empleado_activo creada';
END
GO

-- -----------------------------------------------------
-- 2.6 EMPLEADOS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'empleados' AND schema_id = SCHEMA_ID('adm'))
BEGIN
    CREATE TABLE adm.empleados(
        id INT IDENTITY(1,1),
        nombres NVARCHAR(100) NOT NULL,
        apellido_paterno NVARCHAR(100) NOT NULL,
        apellido_materno NVARCHAR(100),
        fecha_nacimiento DATE,
        tipo_documento VARCHAR(20) NOT NULL DEFAULT 'DNI',
        nro_documento VARCHAR(20) NOT NULL,
        celular VARCHAR(20),
        email_personal NVARCHAR(100),
        direccion NVARCHAR(200),
        distrito_id INT,
        fecha_ingreso DATE NOT NULL,
        fecha_cese DATE,
        is_active BIT NOT NULL DEFAULT 1,
        cargo_id INT,
        area_id INT,
        departamento_id INT,
        jefe_id INT,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2,
        created_by INT NULL,
        updated_by INT NULL
    );
    PRINT '✓ Tabla adm.empleados creada';
END
GO

-- #####################################################
-- #  SCHEMA CORE (Configuraciones)                   #
-- #####################################################

-- -----------------------------------------------------
-- 3.1 DEPARTAMENTOS (Geográficos - Perú)
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'departamentos' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.departamentos(
        id INT IDENTITY(1,1),
        nombre NVARCHAR(100) NOT NULL,
        ubigeo CHAR(2) NOT NULL
    );
    PRINT '✓ Tabla core.departamentos creada';
END
GO

-- -----------------------------------------------------
-- 3.2 PROVINCIAS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'provincias' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.provincias(
        id INT IDENTITY(1,1),
        nombre NVARCHAR(100) NOT NULL,
        departamento_id INT NOT NULL,
        ubigeo CHAR(4) NOT NULL
    );
    PRINT '✓ Tabla core.provincias creada';
END
GO

-- -----------------------------------------------------
-- 3.3 DISTRITOS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'distritos' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.distritos(
        id INT IDENTITY(1,1),
        nombre NVARCHAR(100) NOT NULL,
        provincia_id INT NOT NULL,
        ubigeo CHAR(6) NOT NULL
    );
    PRINT '✓ Tabla core.distritos creada';
END
GO

-- -----------------------------------------------------
-- 3.4 CONFIGURACIONES DEL SISTEMA
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'configuraciones' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.configuraciones(
        id INT IDENTITY(1,1),
        clave VARCHAR(100) NOT NULL,
        valor NVARCHAR(500),
        tipo_dato VARCHAR(20) NOT NULL DEFAULT 'STRING',
        categoria VARCHAR(100),
        descripcion NVARCHAR(300),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla core.configuraciones creada';
END
GO

-- -----------------------------------------------------
-- 3.5 NOTIFICACIONES
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notificaciones' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.notificaciones(
        id BIGINT IDENTITY(1,1),
        usuario_id INT NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        titulo NVARCHAR(150) NOT NULL,
        mensaje NVARCHAR(500),
        url_destino NVARCHAR(300),
        leida BIT NOT NULL DEFAULT 0,
        fecha_lectura DATETIME2,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT '✓ Tabla core.notificaciones creada';
END
GO

-- -----------------------------------------------------
-- 3.6 INCOTERMS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'incoterms' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.incoterms(
        id INT IDENTITY(1,1),
        nombre CHAR(3) NOT NULL,
        nombre_largo VARCHAR(100) NOT NULL,
        tipo VARCHAR(100),
        is_active BIT NOT NULL DEFAULT 1
    );
    PRINT '✓ Tabla core.incoterms creada';
END
GO

-- -----------------------------------------------------
-- 3.7 TIPO DE CONTENEDOR
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipo_contenedor' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.tipo_contenedor(
        id INT IDENTITY(1,1),
        nombre VARCHAR(50) NOT NULL,
        descripcion VARCHAR(100),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla core.tipo_contenedor creada';
END
GO

-- -----------------------------------------------------
-- 3.8 VÍAS DE TRANSPORTE
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'via' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.via(
        id INT IDENTITY(1,1),
        nombre VARCHAR(50) NOT NULL,
        descripcion VARCHAR(100),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla core.via creada';
END
GO

-- -----------------------------------------------------
-- 3.9 TIPO DE MERCADERÍA
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipo_mercaderia' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.tipo_mercaderia(
        id INT IDENTITY(1,1),
        nombre VARCHAR(50) NOT NULL,
        descripcion VARCHAR(100),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla core.tipo_mercaderia creada';
END
GO

-- -----------------------------------------------------
-- 3.10 SERVICIOS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'servicios' AND schema_id = SCHEMA_ID('core'))
BEGIN
    CREATE TABLE core.servicios(
        id INT IDENTITY(1,1),
        nombre VARCHAR(50) NOT NULL,
        descripcion VARCHAR(100),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla core.servicios creada';
END
GO

-- #####################################################
-- #  SCHEMA COMERCIAL                                #
-- #####################################################

-- -----------------------------------------------------
-- 4.1 NAVIERAS / PROVEEDORES
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'navieras' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.navieras(
        id INT IDENTITY(1,1),
        nombre NVARCHAR(100) NOT NULL,
        codigo VARCHAR(20),
        contacto_nombre NVARCHAR(100),
        contacto_email NVARCHAR(100),
        contacto_telefono VARCHAR(20),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2
    );
    PRINT '✓ Tabla comercial.navieras creada';
END
GO

-- -----------------------------------------------------
-- 4.2 CLIENTES
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'clientes' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.clientes(
        id INT IDENTITY(1,1),
        ruc CHAR(11),
        razon_social NVARCHAR(255) NOT NULL,
        nombre_comercial NVARCHAR(255),
        direccion_fiscal NVARCHAR(255),
        distrito_id INT,
        telefono VARCHAR(20),
        email NVARCHAR(100),
        sitio_web NVARCHAR(200),
        area_encargada_id INT,
        comercial_encargado_id INT,
        ultimo_contacto DATETIME2,
        comentario_ultima_llamada NVARCHAR(500),
        proxima_fecha_contacto DATE,
        tipo_estado VARCHAR(20) NOT NULL DEFAULT 'PROSPECTO',
        origen VARCHAR(50),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2,
        created_by INT,
        updated_by INT
    );
    PRINT '✓ Tabla comercial.clientes creada';
END
GO

-- -----------------------------------------------------
-- 4.3 CONTACTOS DE CLIENTES
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cliente_contactos' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.cliente_contactos(
        id INT IDENTITY(1,1),
        cliente_id INT NOT NULL,
        nombre NVARCHAR(100) NOT NULL,
        cargo NVARCHAR(100),
        telefono VARCHAR(20),
        email NVARCHAR(100),
        es_principal BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT '✓ Tabla comercial.cliente_contactos creada';
END
GO

-- -----------------------------------------------------
-- 4.4 COTIZACIONES
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cotizaciones' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.cotizaciones(
        id INT IDENTITY(1,1),
        codigo VARCHAR(20) NOT NULL,
        cliente_id INT,
        comercial_id INT,
        pricing_id INT,
        naviera_id INT,
        origen NVARCHAR(100),
        destino NVARCHAR(100),
        incoterm_id INT,
        via_id INT,
        tipo_contenedor_id INT,
        tipo_mercaderia_id INT,
        subtotal DECIMAL(18,2) DEFAULT 0,
        descuento DECIMAL(18,2) DEFAULT 0,
        igv DECIMAL(18,2) DEFAULT 0,
        total DECIMAL(18,2) DEFAULT 0,
        moneda CHAR(3) NOT NULL DEFAULT 'USD',
        estado VARCHAR(30) NOT NULL DEFAULT 'SOLICITADA',
        motivo_rechazo NVARCHAR(500),
        tipo_rechazo VARCHAR(20),
        fecha_solicitud DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_cotizacion DATETIME2,
        fecha_envio_cliente DATETIME2,
        fecha_vencimiento DATE,
        fecha_respuesta_cliente DATETIME2,
        notas_comercial NVARCHAR(MAX),
        condiciones_pago NVARCHAR(500),
        tiempo_transito VARCHAR(50),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2,
        created_by INT,
        updated_by INT
    );
    PRINT '✓ Tabla comercial.cotizaciones creada';
END
GO

-- -----------------------------------------------------
-- 4.5 DETALLE DE COTIZACIONES
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cotizacion_detalle' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.cotizacion_detalle(
        id INT IDENTITY(1,1),
        cotizacion_id INT NOT NULL,
        servicio_id INT,
        descripcion NVARCHAR(300),
        cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
        precio_unitario DECIMAL(18,2) NOT NULL DEFAULT 0,
        subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
        orden INT DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT '✓ Tabla comercial.cotizacion_detalle creada';
END
GO

-- -----------------------------------------------------
-- 4.6 HISTORIAL DE COTIZACIONES
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cotizacion_historial' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.cotizacion_historial(
        id INT IDENTITY(1,1),
        cotizacion_id INT NOT NULL,
        estado_anterior VARCHAR(30),
        estado_nuevo VARCHAR(30) NOT NULL,
        accion VARCHAR(50) NOT NULL,
        comentario NVARCHAR(500),
        usuario_id INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT '✓ Tabla comercial.cotizacion_historial creada';
END
GO

-- -----------------------------------------------------
-- 4.7 ARCHIVOS DE LEADS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'archivos_leads' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.archivos_leads(
        id INT IDENTITY(1,1),
        nombre_archivo NVARCHAR(255) NOT NULL,
        ruta_archivo NVARCHAR(500),
        total_registros INT NOT NULL DEFAULT 0,
        registros_disponibles INT NOT NULL DEFAULT 0,
        registros_asignados INT NOT NULL DEFAULT 0,
        subido_por INT NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT '✓ Tabla comercial.archivos_leads creada';
END
GO

-- -----------------------------------------------------
-- 4.8 LEADS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'leads' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.leads(
        id INT IDENTITY(1,1),
        archivo_id INT NOT NULL,
        ruc CHAR(11),
        razon_social NVARCHAR(255),
        telefono VARCHAR(20),
        email NVARCHAR(100),
        estado_excel VARCHAR(50),
        comentario_excel NVARCHAR(500),
        asignado_a INT,
        fecha_asignacion DATETIME2,
        lote_asignacion INT,
        estado VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT '✓ Tabla comercial.leads creada';
END
GO

-- -----------------------------------------------------
-- 4.9 FEEDBACK DE LEADS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lead_feedback' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.lead_feedback(
        id INT IDENTITY(1,1),
        lead_id INT NOT NULL,
        comercial_id INT NOT NULL,
        estado_llamada VARCHAR(30) NOT NULL,
        fecha_contacto DATETIME2 NOT NULL,
        proxima_fecha_contacto DATE,
        comentario NVARCHAR(500),
        cliente_id INT,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT '✓ Tabla comercial.lead_feedback creada';
END
GO

-- -----------------------------------------------------
-- 4.10 LOTES DE LEADS
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lotes_leads' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.lotes_leads(
        id INT IDENTITY(1,1),
        comercial_id INT NOT NULL,
        archivo_id INT NOT NULL,
        numero_lote INT NOT NULL,
        cantidad_leads INT NOT NULL DEFAULT 50,
        leads_con_feedback INT NOT NULL DEFAULT 0,
        puede_extraer_mas BIT NOT NULL DEFAULT 0,
        fecha_extraccion DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT '✓ Tabla comercial.lotes_leads creada';
END
GO

-- -----------------------------------------------------
-- 4.11 ÓRDENES DE SERVICIO
-- -----------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ordenes' AND schema_id = SCHEMA_ID('comercial'))
BEGIN
    CREATE TABLE comercial.ordenes(
        id INT IDENTITY(1,1),
        codigo VARCHAR(20) NOT NULL,
        cotizacion_id INT,
        cliente_id INT NOT NULL,
        comercial_id INT NOT NULL,
        fecha_orden DATETIME2 NOT NULL DEFAULT GETDATE(),
        estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
        monto_total DECIMAL(18,2) NOT NULL DEFAULT 0,
        moneda CHAR(3) NOT NULL DEFAULT 'USD',
        notas NVARCHAR(MAX),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2,
        created_by INT,
        updated_by INT
    );
    PRINT '✓ Tabla comercial.ordenes creada';
END
GO

PRINT '';
PRINT '=====================================================';
PRINT '✓ TODAS LAS TABLAS CREADAS';
PRINT '=====================================================';
PRINT 'Resumen:';
PRINT '  - 7 tablas en schema seg';
PRINT '  - 6 tablas en schema adm';
PRINT '  - 10 tablas en schema core';
PRINT '  - 11 tablas en schema comercial';
PRINT '  - TOTAL: 34 tablas';
PRINT '=====================================================';
GO
