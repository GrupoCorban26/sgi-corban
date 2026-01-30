USE SGI;
GO

IF NOT EXISTS (
  SELECT * 
  FROM   sys.columns 
  WHERE  object_id = OBJECT_ID(N'adm.estado_activo') 
         AND name = 'color'
)
BEGIN
    ALTER TABLE adm.estado_activo ADD color VARCHAR(20) DEFAULT '#6B7280';
    PRINT 'Columna color agregada correctamente a adm.estado_activo';
END
ELSE
BEGIN
    PRINT 'La columna color ya existe en adm.estado_activo';
END
