-- Migración: Agregar columnas de rastreo de origen del lead (Campaña Meta vs Orgánico)
-- Fecha: 2026-05-13
-- Tabla: comercial.inbox

ALTER TABLE comercial.inbox ADD origen_lead VARCHAR(20) NOT NULL DEFAULT 'ORGANICO';
ALTER TABLE comercial.inbox ADD referral_source_id VARCHAR(100) NULL;
ALTER TABLE comercial.inbox ADD referral_headline NVARCHAR(300) NULL;

-- Índice para filtrar rápidamente por origen
CREATE INDEX IX_inbox_origen_lead ON comercial.inbox (origen_lead);

-- Verificar
SELECT TOP 5 id, telefono, origen_lead, referral_source_id FROM comercial.inbox;
