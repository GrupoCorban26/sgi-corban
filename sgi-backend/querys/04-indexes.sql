-- =====================================================
-- 05 - ÍNDICES
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- SQL Server 2025
-- =====================================================
-- Ejecutar después de 04-constraints.sql
-- =====================================================

USE SGI_GrupoCorban;
GO

-- =====================================================
-- 1. ÍNDICES - SCHEMA SEG
-- =====================================================
PRINT '>> Creando índices - Schema seg...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_usuarios_correo')
    CREATE NONCLUSTERED INDEX IX_usuarios_correo ON seg.usuarios(correo_corp);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_usuarios_empleado')
    CREATE NONCLUSTERED INDEX IX_usuarios_empleado ON seg.usuarios(empleado_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_sesiones_usuario')
    CREATE NONCLUSTERED INDEX IX_sesiones_usuario ON seg.sesiones(usuario_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_sesiones_token')
    CREATE NONCLUSTERED INDEX IX_sesiones_token ON seg.sesiones(refresh_token);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_logs_acceso_usuario')
    CREATE NONCLUSTERED INDEX IX_logs_acceso_usuario ON seg.logs_acceso(usuario_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_logs_acceso_fecha')
    CREATE NONCLUSTERED INDEX IX_logs_acceso_fecha ON seg.logs_acceso(fecha_ingreso DESC);

PRINT '✓ Índices seg creados';
GO

-- =====================================================
-- 2. ÍNDICES - SCHEMA ADM
-- =====================================================
PRINT '>> Creando índices - Schema adm...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_empleados_documento')
    CREATE NONCLUSTERED INDEX IX_empleados_documento ON adm.empleados(nro_documento);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_empleados_departamento')
    CREATE NONCLUSTERED INDEX IX_empleados_departamento ON adm.empleados(departamento_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_empleados_area')
    CREATE NONCLUSTERED INDEX IX_empleados_area ON adm.empleados(area_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_empleados_cargo')
    CREATE NONCLUSTERED INDEX IX_empleados_cargo ON adm.empleados(cargo_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_empleados_jefe')
    CREATE NONCLUSTERED INDEX IX_empleados_jefe ON adm.empleados(jefe_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_empleados_activo')
    CREATE NONCLUSTERED INDEX IX_empleados_activo ON adm.empleados(is_active);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_areas_departamento')
    CREATE NONCLUSTERED INDEX IX_areas_departamento ON adm.areas(departamento_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cargos_area')
    CREATE NONCLUSTERED INDEX IX_cargos_area ON adm.cargos(area_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_activos_disponible')
    CREATE NONCLUSTERED INDEX IX_activos_disponible ON adm.activos(is_disponible);

PRINT '✓ Índices adm creados';
GO

-- =====================================================
-- 3. ÍNDICES - SCHEMA CORE
-- =====================================================
PRINT '>> Creando índices - Schema core...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_provincias_departamento')
    CREATE NONCLUSTERED INDEX IX_provincias_departamento ON core.provincias(departamento_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_distritos_provincia')
    CREATE NONCLUSTERED INDEX IX_distritos_provincia ON core.distritos(provincia_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_notificaciones_usuario')
    CREATE NONCLUSTERED INDEX IX_notificaciones_usuario ON core.notificaciones(usuario_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_notificaciones_leida')
    CREATE NONCLUSTERED INDEX IX_notificaciones_leida ON core.notificaciones(leida);

PRINT '✓ Índices core creados';
GO

-- =====================================================
-- 4. ÍNDICES - SCHEMA COMERCIAL
-- =====================================================
PRINT '>> Creando índices - Schema comercial...';

-- Clientes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_clientes_ruc')
    CREATE NONCLUSTERED INDEX IX_clientes_ruc ON comercial.clientes(ruc);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_clientes_estado')
    CREATE NONCLUSTERED INDEX IX_clientes_estado ON comercial.clientes(tipo_estado);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_clientes_comercial')
    CREATE NONCLUSTERED INDEX IX_clientes_comercial ON comercial.clientes(comercial_encargado_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_clientes_activo')
    CREATE NONCLUSTERED INDEX IX_clientes_activo ON comercial.clientes(is_active);

-- Cliente Contactos
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cliente_contactos_ruc')
    CREATE NONCLUSTERED INDEX IX_cliente_contactos_ruc ON comercial.cliente_contactos(ruc);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cliente_contactos_estado')
    CREATE NONCLUSTERED INDEX IX_cliente_contactos_estado ON comercial.cliente_contactos(estado);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cliente_contactos_asignado')
    CREATE NONCLUSTERED INDEX IX_cliente_contactos_asignado ON comercial.cliente_contactos(asignado_a);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cliente_contactos_caso')
    CREATE NONCLUSTERED INDEX IX_cliente_contactos_caso ON comercial.cliente_contactos(caso_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cotizaciones_codigo')
    CREATE NONCLUSTERED INDEX IX_cotizaciones_codigo ON comercial.cotizaciones(codigo);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cotizaciones_cliente')
    CREATE NONCLUSTERED INDEX IX_cotizaciones_cliente ON comercial.cotizaciones(cliente_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cotizaciones_estado')
    CREATE NONCLUSTERED INDEX IX_cotizaciones_estado ON comercial.cotizaciones(estado);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cotizaciones_comercial')
    CREATE NONCLUSTERED INDEX IX_cotizaciones_comercial ON comercial.cotizaciones(comercial_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cotizaciones_pricing')
    CREATE NONCLUSTERED INDEX IX_cotizaciones_pricing ON comercial.cotizaciones(pricing_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cotizaciones_fecha')
    CREATE NONCLUSTERED INDEX IX_cotizaciones_fecha ON comercial.cotizaciones(fecha_solicitud DESC);

-- Cotizacion Detalle
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cotizacion_detalle_cotizacion')
    CREATE NONCLUSTERED INDEX IX_cotizacion_detalle_cotizacion ON comercial.cotizacion_detalle(cotizacion_id);

-- Cotizacion Historial
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cotizacion_historial_cotizacion')
    CREATE NONCLUSTERED INDEX IX_cotizacion_historial_cotizacion ON comercial.cotizacion_historial(cotizacion_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cotizacion_historial_fecha')
    CREATE NONCLUSTERED INDEX IX_cotizacion_historial_fecha ON comercial.cotizacion_historial(created_at DESC);

-- Leads
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_leads_estado')
    CREATE NONCLUSTERED INDEX IX_leads_estado ON comercial.leads(estado);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_leads_asignado')
    CREATE NONCLUSTERED INDEX IX_leads_asignado ON comercial.leads(asignado_a);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_leads_archivo')
    CREATE NONCLUSTERED INDEX IX_leads_archivo ON comercial.leads(archivo_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_leads_ruc')
    CREATE NONCLUSTERED INDEX IX_leads_ruc ON comercial.leads(ruc);

-- Lead Feedback
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_lead_feedback_lead')
    CREATE NONCLUSTERED INDEX IX_lead_feedback_lead ON comercial.lead_feedback(lead_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_lead_feedback_comercial')
    CREATE NONCLUSTERED INDEX IX_lead_feedback_comercial ON comercial.lead_feedback(comercial_id);

-- Lotes Leads
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_lotes_leads_comercial')
    CREATE NONCLUSTERED INDEX IX_lotes_leads_comercial ON comercial.lotes_leads(comercial_id);

-- Ordenes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ordenes_codigo')
    CREATE NONCLUSTERED INDEX IX_ordenes_codigo ON comercial.ordenes(codigo);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ordenes_cliente')
    CREATE NONCLUSTERED INDEX IX_ordenes_cliente ON comercial.ordenes(cliente_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ordenes_estado')
    CREATE NONCLUSTERED INDEX IX_ordenes_estado ON comercial.ordenes(estado);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ordenes_cotizacion')
    CREATE NONCLUSTERED INDEX IX_ordenes_cotizacion ON comercial.ordenes(cotizacion_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_activo_historial_activo')
    CREATE INDEX IX_activo_historial_activo ON adm.activo_historial(activo_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_activo_historial_fecha')
    CREATE INDEX IX_activo_historial_fecha ON adm.activo_historial(fecha_cambio DESC);
PRINT '✓ Índices comercial creados';
GO

PRINT '';
PRINT '=====================================================';
PRINT '✓ ÍNDICES COMPLETADOS';
PRINT '=====================================================';
GO
