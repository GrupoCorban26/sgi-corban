-- Agregar columna cant_agentes_aduana a la tabla registro_importaciones
-- Ejecutar en la PC servidor

ALTER TABLE comercial.registro_importaciones 
ADD cant_agentes_aduana INT NULL DEFAULT 0;
