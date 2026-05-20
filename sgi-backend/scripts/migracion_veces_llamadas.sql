-- Agregar columna veces_llamadas
ALTER TABLE comercial.bases 
ADD veces_llamadas INT NOT NULL DEFAULT 0;

-- Agregar columna fecha_asignacion
ALTER TABLE comercial.bases 
ADD fecha_asignacion DATETIME NULL;
