import sys
import os

# Agregar el directorio actual al path para importar módulos
sys.path.append(os.getcwd())

from app.core.database import engine, Base
# Importar todos los modelos para que SQLAlchemy los reconozca al crear las tablas
from app.models.usuario import Usuario
from app.models.organizacion import Empleado, Departamento, Area, Cargo, Activo, EstadoActivo, Linea, Ubigeo
from app.models.comercial import Contacto, CasoLlamada, BaseComercial, Cliente, Cita, Inbox, ConversationSession
from app.models.importacion import Importacion, DetalleImportacion

def init_db():
    print("Creando tablas en la base de datos...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas creadas exitosamente.")
    except Exception as e:
        print(f"❌ Error al crear tablas: {e}")

if __name__ == "__main__":
    init_db()
