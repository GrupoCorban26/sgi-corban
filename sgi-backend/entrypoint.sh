#!/bin/bash
set -e

echo "================================================"
echo "  SGI Backend — Inicialización automática"
echo "================================================"

# 1. Crear el esquema whatsapp_evo si no existe
echo "🔧 Verificando esquema whatsapp_evo en SQL Server..."
python -c "
import pyodbc, os, urllib.parse

conn_str = (
    f'DRIVER={{ODBC Driver 18 for SQL Server}};'
    f'SERVER={os.getenv(\"DB_SERVER\")};'
    f'DATABASE={os.getenv(\"DB_NAME\")};'
    f'UID={os.getenv(\"DB_USER\")};'
    f'PWD={os.getenv(\"DB_PASS\")};'
    f'TrustServerCertificate=yes;'
)
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()
cursor.execute(\"\"\"
    IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'whatsapp_evo')
    BEGIN
        EXEC('CREATE SCHEMA whatsapp_evo');
    END
\"\"\")
conn.commit()
cursor.close()
conn.close()
print('✅ Esquema whatsapp_evo verificado/creado.')
"

# 2. Ejecutar migraciones de Alembic
echo "🔧 Ejecutando migraciones de Alembic..."
alembic upgrade head
echo "✅ Migraciones aplicadas."

# 3. Arrancar uvicorn
echo "🚀 Iniciando servidor FastAPI..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
