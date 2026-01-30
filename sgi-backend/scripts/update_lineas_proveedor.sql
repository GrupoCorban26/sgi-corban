USE SGI;
GO

IF NOT EXISTS (
  SELECT * 
  FROM   sys.columns 
  WHERE  object_id = OBJECT_ID(N'adm.lineas_corporativas') 
         AND name = 'proveedor'
)
BEGIN
    ALTER TABLE adm.lineas_corporativas ADD proveedor VARCHAR(50);
    PRINT 'Columna proveedor agregada correctamente a adm.lineas_corporativas';
END
ELSE
BEGIN
    PRINT 'La columna proveedor ya existe en adm.lineas_corporativas';
END
