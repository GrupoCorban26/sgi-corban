-- Migración para hacer el teléfono de contactos opcional
ALTER TABLE comercial.cliente_contactos ALTER COLUMN telefono VARCHAR(20) NULL;
