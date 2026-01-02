from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# 1. Importas el router que creamos en el otro archivo
from app.api.v1.auth import router as auth_router
from app.api.v1.empleado import router as empleado_router
from app.api.v1.area import router as areas_router

app = FastAPI(title="SGI Grupo Corban")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000", # Puerto de FastAPI
    "http://127.0.0.1:8000", # Puerto de FastAPI
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Permite a Next.js conectarse
    allow_credentials=True,
    allow_methods=["*"],              # Permite todos los métodos (GET, POST, etc.)
    allow_headers=["*"],              # Permite todos los encabezados
)

# 2. "Conectas" el router a la aplicación principal
# El prefix ayuda a que la URL sea /api/auth/login
app.include_router(auth_router, prefix="/api/v1")

app.include_router(empleado_router, prefix="/api/v1")
app.include_router(areas_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Bienvenido al SGI de Grupo Corban"}