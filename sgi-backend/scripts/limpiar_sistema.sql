-- =====================================================
-- SCRIPT DE LIMPIEZA DEL SISTEMA SGI
-- Elimina datos operacionales, conserva estructura
-- =====================================================
-- CONSERVA: usuarios, empleados, roles, permisos,
--           catálogos, ubigeo, activos, vehículos,
--           departamentos, áreas, cargos, casos_llamada
-- ELIMINA: clientes, contactos, chats, inbox, citas,
--          gestiones, historial, importaciones,
--          sesiones, notificaciones
-- =====================================================
-- ⚠️ EJECUTAR CON PRECAUCIÓN - ACCIÓN IRREVERSIBLE ⚠️
-- =====================================================

BEGIN TRANSACTION;
BEGIN TRY

    -- ==========================================
    -- 1. COMERCIAL (orden por dependencias FK)
    -- ==========================================
    
    -- Mensajes de chat (depende de inbox)
    PRINT '🗑️ Limpiando comercial.chat_messages...';
    DELETE FROM comercial.chat_messages;

    -- Sesiones de chatbot (depende de inbox)
    PRINT '🗑️ Limpiando comercial.conversation_sessions...';
    DELETE FROM comercial.conversation_sessions;

    -- Comerciales asignados a citas (depende de citas)
    PRINT '🗑️ Limpiando comercial.cita_comerciales...';
    DELETE FROM comercial.cita_comerciales;

    -- Citas (depende de clientes)
    PRINT '🗑️ Limpiando comercial.citas...';
    DELETE FROM comercial.citas;

    -- Gestiones de clientes (depende de clientes)
    PRINT '🗑️ Limpiando comercial.cliente_gestiones...';
    DELETE FROM comercial.cliente_gestiones;

    -- Historial de clientes (depende de clientes)
    PRINT '🗑️ Limpiando comercial.cliente_historial...';
    DELETE FROM comercial.cliente_historial;

    -- Contactos de empresas
    PRINT '🗑️ Limpiando comercial.cliente_contactos...';
    DELETE FROM comercial.cliente_contactos;

    -- Inbox / Leads de WhatsApp
    PRINT '🗑️ Limpiando comercial.inbox...';
    DELETE FROM comercial.inbox;

    -- Importaciones (datos del Excel)
    PRINT '🗑️ Limpiando comercial.registro_importaciones...';
    TRUNCATE TABLE comercial.registro_importaciones;

    -- ==========================================
    -- 2. CORE
    -- ==========================================
    
    -- Notificaciones
    PRINT '🗑️ Limpiando core.notificaciones...';
    DELETE FROM core.notificaciones;

    -- ==========================================
    -- 3. SEGURIDAD
    -- ==========================================
    
    -- Sesiones de login
    PRINT '🗑️ Limpiando seg.sesiones...';
    DELETE FROM seg.sesiones;

    -- ==========================================
    -- 4. RESETEAR IDENTITIES (auto-increment)
    -- ==========================================
    
    DBCC CHECKIDENT ('comercial.chat_messages', RESEED, 0);
    DBCC CHECKIDENT ('comercial.conversation_sessions', RESEED, 0);
    DBCC CHECKIDENT ('comercial.cita_comerciales', RESEED, 0);
    DBCC CHECKIDENT ('comercial.citas', RESEED, 0);
    DBCC CHECKIDENT ('comercial.cliente_gestiones', RESEED, 0);
    DBCC CHECKIDENT ('comercial.cliente_historial', RESEED, 0);
    DBCC CHECKIDENT ('comercial.cliente_contactos', RESEED, 0);
    DBCC CHECKIDENT ('comercial.clientes', RESEED, 0);
    DBCC CHECKIDENT ('comercial.inbox', RESEED, 0);
    DBCC CHECKIDENT ('core.notificaciones', RESEED, 0);

    COMMIT TRANSACTION;
    PRINT '';
    PRINT '✅ Limpieza completada exitosamente';
    PRINT '';
    PRINT '📋 Resumen de lo que SE CONSERVÓ:';
    PRINT '   - seg.usuarios, seg.roles, seg.permisos, seg.rol_permiso, seg.usuarios_roles';
    PRINT '   - adm.empleados, adm.departamentos, adm.areas, adm.cargos';
    PRINT '   - adm.activos, adm.empleado_activo, adm.estado_activo, adm.activo_historial';
    PRINT '   - adm.lineas_corporativas, adm.linea_historial';
    PRINT '   - core.departamentos, core.provincias, core.distritos, core.configuraciones';
    PRINT '   - core.incoterms, core.tipo_contenedores, core.via, core.tipo_mercaderia, core.servicios';
    PRINT '   - logistica.vehiculos, logistica.asignacion_vehiculos';
    PRINT '   - comercial.casos_llamada';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ ERROR - Se hizo ROLLBACK, no se eliminó nada';
    PRINT 'Mensaje: ' + ERROR_MESSAGE();
    PRINT 'Línea: ' + CAST(ERROR_LINE() AS VARCHAR(10));
END CATCH
GO
