-- =============================================
-- DIAGNÓSTICO: Inbox duplicado para teléfono
-- =============================================

-- 1. Todos los inboxes para este teléfono
SELECT 
    i.id,
    i.telefono,
    i.nombre_whatsapp,
    i.estado,
    i.modo,
    i.asignado_a,
    u.correo_corp AS asesor,
    i.bot_config_id,
    i.tipo_interes,
    i.fecha_recepcion,
    i.fecha_asignacion,
    i.ultimo_mensaje_at,
    i.mensaje_inicial
FROM comercial.inbox i
LEFT JOIN seg.usuarios u ON u.id = i.asignado_a
WHERE i.telefono LIKE '%50232755058%'
ORDER BY i.id DESC;

-- 2. Mensajes de cada inbox de ese teléfono
SELECT 
    m.id,
    m.inbox_id,
    m.telefono,
    m.direccion,
    m.remitente_tipo,
    m.contenido,
    m.tipo_contenido,
    m.estado_envio,
    m.created_at
FROM comercial.chat_messages m
WHERE m.inbox_id IN (
    SELECT id FROM comercial.inbox WHERE telefono LIKE '%50232755058%'
)
ORDER BY m.inbox_id, m.created_at;

-- 3. Conteo general: ¿cuántos teléfonos tienen más de 1 inbox activo?
SELECT 
    telefono,
    COUNT(*) AS total_inboxes,
    STRING_AGG(CAST(id AS VARCHAR) + ':' + estado, ', ') AS detalle
FROM comercial.inbox
WHERE estado NOT IN ('CONVERTIDO')
GROUP BY telefono
HAVING COUNT(*) > 1
ORDER BY total_inboxes DESC;

-- 4. Configuración de bots (para ver qué jefe tiene cada bot)
SELECT 
    bc.id,
    bc.slug,
    bc.phone_number_id,
    bc.jefe_comercial_id,
    e.nombres + ' ' + e.apellido_paterno AS jefe_nombre
FROM comercial.whatsapp_bot_config bc
LEFT JOIN adm.empleados e ON e.id = bc.jefe_comercial_id
WHERE bc.is_active = 1;
