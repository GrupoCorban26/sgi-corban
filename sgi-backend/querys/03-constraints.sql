-- =====================================================
-- 04 - CONSTRAINTS (PKs, FKs, UQs, CHECKs)
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- SQL Server 2025
-- =====================================================
-- Ejecutar después de 03-tables-comercial.sql
-- ORDEN IMPORTANTE: Primero tablas base, luego comercial
-- =====================================================

USE SGI_GrupoCorban;
GO

-- =====================================================
-- 1. PRIMARY KEYS - SCHEMA CORE (PRIMERO)
-- =====================================================
PRINT '>> Agregando Primary Keys - Schema core...';

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_core_departamentos')
    ALTER TABLE core.departamentos ADD CONSTRAINT PK_core_departamentos PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_provincias')
    ALTER TABLE core.provincias ADD CONSTRAINT PK_provincias PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_distritos')
    ALTER TABLE core.distritos ADD CONSTRAINT PK_distritos PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_configuraciones')
    ALTER TABLE core.configuraciones ADD CONSTRAINT PK_configuraciones PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_notificaciones')
    ALTER TABLE core.notificaciones ADD CONSTRAINT PK_notificaciones PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_incoterms')
    ALTER TABLE core.incoterms ADD CONSTRAINT PK_incoterms PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_tipo_contenedor')
    ALTER TABLE core.tipo_contenedor ADD CONSTRAINT PK_tipo_contenedor PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_via')
    ALTER TABLE core.via ADD CONSTRAINT PK_via PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_tipo_mercaderia')
    ALTER TABLE core.tipo_mercaderia ADD CONSTRAINT PK_tipo_mercaderia PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_servicios')
    ALTER TABLE core.servicios ADD CONSTRAINT PK_servicios PRIMARY KEY (id);

PRINT '✓ Primary Keys core agregadas';
GO

-- =====================================================
-- 2. PRIMARY KEYS - SCHEMA ADM
-- =====================================================
PRINT '>> Agregando Primary Keys - Schema adm...';

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_departamentos')
    ALTER TABLE adm.departamentos ADD CONSTRAINT PK_departamentos PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_areas')
    ALTER TABLE adm.areas ADD CONSTRAINT PK_areas PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_cargos')
    ALTER TABLE adm.cargos ADD CONSTRAINT PK_cargos PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_activos')
    ALTER TABLE adm.activos ADD CONSTRAINT PK_activos PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_empleado_activo')
    ALTER TABLE adm.empleado_activo ADD CONSTRAINT PK_empleado_activo PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_empleados')
    ALTER TABLE adm.empleados ADD CONSTRAINT PK_empleados PRIMARY KEY (id);

PRINT '✓ Primary Keys adm agregadas';
GO

-- =====================================================
-- 3. PRIMARY KEYS - SCHEMA SEG
-- =====================================================
PRINT '>> Agregando Primary Keys - Schema seg...';

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_roles')
    ALTER TABLE seg.roles ADD CONSTRAINT PK_roles PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_permisos')
    ALTER TABLE seg.permisos ADD CONSTRAINT PK_permisos PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_usuarios')
    ALTER TABLE seg.usuarios ADD CONSTRAINT PK_usuarios PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_sesiones')
    ALTER TABLE seg.sesiones ADD CONSTRAINT PK_sesiones PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_logs_acceso')
    ALTER TABLE seg.logs_acceso ADD CONSTRAINT PK_logs_acceso PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_rol_permiso')
    ALTER TABLE seg.rol_permiso ADD CONSTRAINT PK_rol_permiso PRIMARY KEY (rol_id, permiso_id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_usuarios_roles')
    ALTER TABLE seg.usuarios_roles ADD CONSTRAINT PK_usuarios_roles PRIMARY KEY (usuario_id, rol_id);

PRINT '✓ Primary Keys seg agregadas';
GO

-- =====================================================
-- 4. PRIMARY KEYS - SCHEMA COMERCIAL
-- =====================================================
PRINT '>> Agregando Primary Keys - Schema comercial...';

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_navieras')
    ALTER TABLE comercial.navieras ADD CONSTRAINT PK_navieras PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_clientes')
    ALTER TABLE comercial.clientes ADD CONSTRAINT PK_clientes PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_cliente_contactos')
    ALTER TABLE comercial.cliente_contactos ADD CONSTRAINT PK_cliente_contactos PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_cotizaciones')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT PK_cotizaciones PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_cotizacion_detalle')
    ALTER TABLE comercial.cotizacion_detalle ADD CONSTRAINT PK_cotizacion_detalle PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_cotizacion_historial')
    ALTER TABLE comercial.cotizacion_historial ADD CONSTRAINT PK_cotizacion_historial PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_archivos_leads')
    ALTER TABLE comercial.archivos_leads ADD CONSTRAINT PK_archivos_leads PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_leads')
    ALTER TABLE comercial.leads ADD CONSTRAINT PK_leads PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_lead_feedback')
    ALTER TABLE comercial.lead_feedback ADD CONSTRAINT PK_lead_feedback PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_lotes_leads')
    ALTER TABLE comercial.lotes_leads ADD CONSTRAINT PK_lotes_leads PRIMARY KEY (id);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_ordenes')
    ALTER TABLE comercial.ordenes ADD CONSTRAINT PK_ordenes PRIMARY KEY (id);

PRINT '✓ Primary Keys comercial agregadas';
GO

-- =====================================================
-- 5. FOREIGN KEYS - SCHEMA CORE
-- =====================================================
PRINT '>> Agregando Foreign Keys - Schema core...';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_provincias_departamento')
    ALTER TABLE core.provincias ADD CONSTRAINT FK_provincias_departamento 
    FOREIGN KEY (departamento_id) REFERENCES core.departamentos(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_distritos_provincia')
    ALTER TABLE core.distritos ADD CONSTRAINT FK_distritos_provincia 
    FOREIGN KEY (provincia_id) REFERENCES core.provincias(id);

PRINT '✓ Foreign Keys core agregadas';
GO

-- =====================================================
-- 6. FOREIGN KEYS - SCHEMA ADM
-- =====================================================
PRINT '>> Agregando Foreign Keys - Schema adm...';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_areas_departamento')
    ALTER TABLE adm.areas ADD CONSTRAINT FK_areas_departamento 
    FOREIGN KEY (departamento_id) REFERENCES adm.departamentos(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_areas_padre')
    ALTER TABLE adm.areas ADD CONSTRAINT FK_areas_padre 
    FOREIGN KEY (area_padre_id) REFERENCES adm.areas(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cargos_area')
    ALTER TABLE adm.cargos ADD CONSTRAINT FK_cargos_area 
    FOREIGN KEY (area_id) REFERENCES adm.areas(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleados_distrito')
    ALTER TABLE adm.empleados ADD CONSTRAINT FK_empleados_distrito 
    FOREIGN KEY (distrito_id) REFERENCES core.distritos(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleados_cargo')
    ALTER TABLE adm.empleados ADD CONSTRAINT FK_empleados_cargo 
    FOREIGN KEY (cargo_id) REFERENCES adm.cargos(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleados_area')
    ALTER TABLE adm.empleados ADD CONSTRAINT FK_empleados_area 
    FOREIGN KEY (area_id) REFERENCES adm.areas(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleados_departamento')
    ALTER TABLE adm.empleados ADD CONSTRAINT FK_empleados_departamento 
    FOREIGN KEY (departamento_id) REFERENCES adm.departamentos(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleados_jefe')
    ALTER TABLE adm.empleados ADD CONSTRAINT FK_empleados_jefe 
    FOREIGN KEY (jefe_id) REFERENCES adm.empleados(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_departamentos_responsable')
    ALTER TABLE adm.departamentos ADD CONSTRAINT FK_departamentos_responsable 
    FOREIGN KEY (responsable_id) REFERENCES adm.empleados(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_areas_responsable')
    ALTER TABLE adm.areas ADD CONSTRAINT FK_areas_responsable 
    FOREIGN KEY (responsable_id) REFERENCES adm.empleados(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleado_activo_empleado')
    ALTER TABLE adm.empleado_activo ADD CONSTRAINT FK_empleado_activo_empleado 
    FOREIGN KEY (empleado_id) REFERENCES adm.empleados(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleado_activo_activo')
    ALTER TABLE adm.empleado_activo ADD CONSTRAINT FK_empleado_activo_activo 
    FOREIGN KEY (activo_id) REFERENCES adm.activos(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_empleado_activo_asignado_por')
    ALTER TABLE adm.empleado_activo ADD CONSTRAINT FK_empleado_activo_asignado_por 
    FOREIGN KEY (asignado_por) REFERENCES adm.empleados(id);

PRINT '✓ Foreign Keys adm agregadas';
GO

-- =====================================================
-- 7. FOREIGN KEYS - SCHEMA SEG
-- =====================================================
PRINT '>> Agregando Foreign Keys - Schema seg...';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_usuarios_empleado')
    ALTER TABLE seg.usuarios ADD CONSTRAINT FK_usuarios_empleado 
    FOREIGN KEY (empleado_id) REFERENCES adm.empleados(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sesiones_usuario')
    ALTER TABLE seg.sesiones ADD CONSTRAINT FK_sesiones_usuario 
    FOREIGN KEY (usuario_id) REFERENCES seg.usuarios(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_logs_acceso_usuario')
    ALTER TABLE seg.logs_acceso ADD CONSTRAINT FK_logs_acceso_usuario 
    FOREIGN KEY (usuario_id) REFERENCES seg.usuarios(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rol_permiso_rol')
    ALTER TABLE seg.rol_permiso ADD CONSTRAINT FK_rol_permiso_rol 
    FOREIGN KEY (rol_id) REFERENCES seg.roles(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rol_permiso_permiso')
    ALTER TABLE seg.rol_permiso ADD CONSTRAINT FK_rol_permiso_permiso 
    FOREIGN KEY (permiso_id) REFERENCES seg.permisos(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_usuarios_roles_usuario')
    ALTER TABLE seg.usuarios_roles ADD CONSTRAINT FK_usuarios_roles_usuario 
    FOREIGN KEY (usuario_id) REFERENCES seg.usuarios(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_usuarios_roles_rol')
    ALTER TABLE seg.usuarios_roles ADD CONSTRAINT FK_usuarios_roles_rol 
    FOREIGN KEY (rol_id) REFERENCES seg.roles(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_notificaciones_usuario')
    ALTER TABLE core.notificaciones ADD CONSTRAINT FK_notificaciones_usuario 
    FOREIGN KEY (usuario_id) REFERENCES seg.usuarios(id);

PRINT '✓ Foreign Keys seg agregadas';
GO

-- =====================================================
-- 8. FOREIGN KEYS - SCHEMA COMERCIAL
-- =====================================================
PRINT '>> Agregando Foreign Keys - Schema comercial...';

-- Clientes
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_clientes_distrito')
    ALTER TABLE comercial.clientes ADD CONSTRAINT FK_clientes_distrito 
    FOREIGN KEY (distrito_id) REFERENCES core.distritos(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_clientes_area')
    ALTER TABLE comercial.clientes ADD CONSTRAINT FK_clientes_area 
    FOREIGN KEY (area_encargada_id) REFERENCES adm.areas(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_clientes_comercial')
    ALTER TABLE comercial.clientes ADD CONSTRAINT FK_clientes_comercial 
    FOREIGN KEY (comercial_encargado_id) REFERENCES adm.empleados(id);

-- Casos Llamada
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_casos_llamada')
    ALTER TABLE comercial.casos_llamada ADD CONSTRAINT PK_casos_llamada PRIMARY KEY (id);

-- Cliente Contactos
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cliente_contactos_asignado')
    ALTER TABLE comercial.cliente_contactos ADD CONSTRAINT FK_cliente_contactos_asignado 
    FOREIGN KEY (asignado_a) REFERENCES seg.usuarios(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cliente_contactos_caso')
    ALTER TABLE comercial.cliente_contactos ADD CONSTRAINT FK_cliente_contactos_caso 
    FOREIGN KEY (caso_id) REFERENCES comercial.casos_llamada(id);

-- Cotizaciones
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizaciones_cliente')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT FK_cotizaciones_cliente 
    FOREIGN KEY (cliente_id) REFERENCES comercial.clientes(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizaciones_comercial')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT FK_cotizaciones_comercial 
    FOREIGN KEY (comercial_id) REFERENCES adm.empleados(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizaciones_pricing')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT FK_cotizaciones_pricing 
    FOREIGN KEY (pricing_id) REFERENCES adm.empleados(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizaciones_naviera')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT FK_cotizaciones_naviera 
    FOREIGN KEY (naviera_id) REFERENCES comercial.navieras(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizaciones_incoterm')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT FK_cotizaciones_incoterm 
    FOREIGN KEY (incoterm_id) REFERENCES core.incoterms(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizaciones_via')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT FK_cotizaciones_via 
    FOREIGN KEY (via_id) REFERENCES core.via(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizaciones_tipo_contenedor')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT FK_cotizaciones_tipo_contenedor 
    FOREIGN KEY (tipo_contenedor_id) REFERENCES core.tipo_contenedor(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizaciones_tipo_mercaderia')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT FK_cotizaciones_tipo_mercaderia 
    FOREIGN KEY (tipo_mercaderia_id) REFERENCES core.tipo_mercaderia(id);

-- Cotizacion Detalle
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizacion_detalle_cotizacion')
    ALTER TABLE comercial.cotizacion_detalle ADD CONSTRAINT FK_cotizacion_detalle_cotizacion 
    FOREIGN KEY (cotizacion_id) REFERENCES comercial.cotizaciones(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizacion_detalle_servicio')
    ALTER TABLE comercial.cotizacion_detalle ADD CONSTRAINT FK_cotizacion_detalle_servicio 
    FOREIGN KEY (servicio_id) REFERENCES core.servicios(id);

-- Cotizacion Historial
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizacion_historial_cotizacion')
    ALTER TABLE comercial.cotizacion_historial ADD CONSTRAINT FK_cotizacion_historial_cotizacion 
    FOREIGN KEY (cotizacion_id) REFERENCES comercial.cotizaciones(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_cotizacion_historial_usuario')
    ALTER TABLE comercial.cotizacion_historial ADD CONSTRAINT FK_cotizacion_historial_usuario 
    FOREIGN KEY (usuario_id) REFERENCES seg.usuarios(id);

-- Archivos Leads
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_archivos_leads_subido_por')
    ALTER TABLE comercial.archivos_leads ADD CONSTRAINT FK_archivos_leads_subido_por 
    FOREIGN KEY (subido_por) REFERENCES seg.usuarios(id);

-- Leads
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_leads_archivo')
    ALTER TABLE comercial.leads ADD CONSTRAINT FK_leads_archivo 
    FOREIGN KEY (archivo_id) REFERENCES comercial.archivos_leads(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_leads_asignado')
    ALTER TABLE comercial.leads ADD CONSTRAINT FK_leads_asignado 
    FOREIGN KEY (asignado_a) REFERENCES adm.empleados(id);

-- Lead Feedback
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_lead_feedback_lead')
    ALTER TABLE comercial.lead_feedback ADD CONSTRAINT FK_lead_feedback_lead 
    FOREIGN KEY (lead_id) REFERENCES comercial.leads(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_lead_feedback_comercial')
    ALTER TABLE comercial.lead_feedback ADD CONSTRAINT FK_lead_feedback_comercial 
    FOREIGN KEY (comercial_id) REFERENCES adm.empleados(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_lead_feedback_cliente')
    ALTER TABLE comercial.lead_feedback ADD CONSTRAINT FK_lead_feedback_cliente 
    FOREIGN KEY (cliente_id) REFERENCES comercial.clientes(id);

-- Lotes Leads
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_lotes_leads_comercial')
    ALTER TABLE comercial.lotes_leads ADD CONSTRAINT FK_lotes_leads_comercial 
    FOREIGN KEY (comercial_id) REFERENCES adm.empleados(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_lotes_leads_archivo')
    ALTER TABLE comercial.lotes_leads ADD CONSTRAINT FK_lotes_leads_archivo 
    FOREIGN KEY (archivo_id) REFERENCES comercial.archivos_leads(id);

-- Ordenes
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ordenes_cotizacion')
    ALTER TABLE comercial.ordenes ADD CONSTRAINT FK_ordenes_cotizacion 
    FOREIGN KEY (cotizacion_id) REFERENCES comercial.cotizaciones(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ordenes_cliente')
    ALTER TABLE comercial.ordenes ADD CONSTRAINT FK_ordenes_cliente 
    FOREIGN KEY (cliente_id) REFERENCES comercial.clientes(id);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ordenes_comercial')
    ALTER TABLE comercial.ordenes ADD CONSTRAINT FK_ordenes_comercial 
    FOREIGN KEY (comercial_id) REFERENCES adm.empleados(id);

PRINT '✓ Foreign Keys comercial agregadas';
GO

-- =====================================================
-- 9. UNIQUE CONSTRAINTS
-- =====================================================
PRINT '>> Agregando Unique Constraints...';

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_usuarios_correo')
    ALTER TABLE seg.usuarios ADD CONSTRAINT UQ_usuarios_correo UNIQUE (correo_corp);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_roles_nombre')
    ALTER TABLE seg.roles ADD CONSTRAINT UQ_roles_nombre UNIQUE (nombre);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_permisos_nombre_tecnico')
    ALTER TABLE seg.permisos ADD CONSTRAINT UQ_permisos_nombre_tecnico UNIQUE (nombre_tecnico);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_empleados_documento')
    ALTER TABLE adm.empleados ADD CONSTRAINT UQ_empleados_documento UNIQUE (nro_documento);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_incoterms_nombre')
    ALTER TABLE core.incoterms ADD CONSTRAINT UQ_incoterms_nombre UNIQUE (nombre);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_clientes_ruc')
    ALTER TABLE comercial.clientes ADD CONSTRAINT UQ_clientes_ruc UNIQUE (ruc);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_cotizaciones_codigo')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT UQ_cotizaciones_codigo UNIQUE (codigo);

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_ordenes_codigo')
    ALTER TABLE comercial.ordenes ADD CONSTRAINT UQ_ordenes_codigo UNIQUE (codigo);

PRINT '✓ Unique Constraints agregadas';
GO

-- =====================================================
-- 10. CHECK CONSTRAINTS
-- =====================================================
PRINT '>> Agregando Check Constraints...';

-- Cotizaciones
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_cotizaciones_estado')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT CK_cotizaciones_estado 
    CHECK (estado IN ('SOLICITADA', 'COTIZADA', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'ENVIADA', 'ACEPTADA', 'RECHAZADA_CLIENTE', 'VENCIDA'));

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_cotizaciones_tipo_rechazo')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT CK_cotizaciones_tipo_rechazo 
    CHECK (tipo_rechazo IS NULL OR tipo_rechazo IN ('PRECIO', 'PROPUESTA'));

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_cotizaciones_moneda')
    ALTER TABLE comercial.cotizaciones ADD CONSTRAINT CK_cotizaciones_moneda 
    CHECK (moneda IN ('USD', 'PEN'));

-- Clientes
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_clientes_estado')
    ALTER TABLE comercial.clientes ADD CONSTRAINT CK_clientes_estado 
    CHECK (tipo_estado IN ('PROSPECTO', 'CONTACTADO', 'INTERESADO', 'CLIENTE', 'INACTIVO'));

-- Leads
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_leads_estado')
    ALTER TABLE comercial.leads ADD CONSTRAINT CK_leads_estado 
    CHECK (estado IN ('DISPONIBLE', 'ASIGNADO', 'CONTACTADO', 'CONVERTIDO', 'DESCARTADO'));

-- Lead Feedback
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_lead_feedback_estado')
    ALTER TABLE comercial.lead_feedback ADD CONSTRAINT CK_lead_feedback_estado 
    CHECK (estado_llamada IN ('CONTESTO', 'NO_CONTESTO', 'NUMERO_EQUIVOCADO', 'INTERESADO', 'NO_INTERESADO', 'VOLVER_A_LLAMAR'));

-- Ordenes
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_ordenes_estado')
    ALTER TABLE comercial.ordenes ADD CONSTRAINT CK_ordenes_estado 
    CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'));

PRINT '✓ Check Constraints agregadas';
GO

PRINT '';
PRINT '=====================================================';
PRINT '✓ CONSTRAINTS COMPLETADOS';
PRINT '=====================================================';
GO
