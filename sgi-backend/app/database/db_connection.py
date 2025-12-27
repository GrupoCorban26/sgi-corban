import os
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Cargar variables del archivo .env
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_SERVER = os.getenv("DB_SERVER")
DB_NAME = os.getenv("DB_NAME")
DB_DRIVER = os.getenv("DB_DRIVER")

# 2. Codificar la contraseña para evitar errores con caracteres especiales
password_encoded = urllib.parse.quote_plus(DB_PASS)

# 3. Construir la cadena de conexión ODBC (Driver 18)
# Usamos TrustServerCertificate=yes para el entorno local
connection_string = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_SERVER};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASS};"
    f"Encrypt=yes;"
    f"TrustServerCertificate=yes;"
)

# 4. Crear la URL de conexión para SQLAlchemy
params = urllib.parse.quote_plus(connection_string)
SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

# 5. Configurar el motor de la base de datos (Engine)
# 'pool_pre_ping=True' verifica que la conexión esté viva antes de usarla
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True
)

# 6. Crear la fábrica de sesiones y la base para los modelos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 7. Dependencia para obtener la base de datos en las rutas de FastAPI
# Esta función asegura que la conexión se cierre al terminar la petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- PRUEBA DE CONEXIÓN RÁPIDA ---
if __name__ == "__main__":
    try:
        with engine.connect() as connection:
            print("✅ ¡Conexión exitosa!")
            print(f"Conectado como: {DB_USER}")
            print(f"Servidor: {DB_SERVER}")
    except Exception as e:
        print("❌ Error al conectar a la base de datos:")
        print(e)