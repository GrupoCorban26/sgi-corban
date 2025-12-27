SELECT * FROM sys.fn_my_permissions(NULL, 'DATABASE') 
WHERE entity_name = 'DATABASE' 
  AND permission_name = 'EXECUTE';


-- 1. Aseguramos que el login esté vinculado a la base de datos
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'AdminGeneral')
BEGIN
    CREATE USER AdminGeneral FOR LOGIN AdminGeneral;
END

-- 2. Le damos permiso explícito de entrar a la base de datos
ALTER ROLE db_datareader ADD MEMBER AdminGeneral;
ALTER ROLE db_datawriter ADD MEMBER AdminGeneral;
GRANT CONNECT TO AdminGeneral;
GO