from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.usuarios import router as usuarios_router
from app.api.v1.organizacion.empleados import router as empleado_router
from app.api.v1.organizacion.departamentos import router as departamento_router
from app.api.v1.organizacion.areas import router as areas_router
from app.api.v1.organizacion.cargos import router as cargos_router
from app.api.v1.organizacion.activos import router as activos_router
from app.api.v1.organizacion.estado_activo import router as estado_activo_router
from app.api.v1.core.ubigeo import router as ubigeo_router
from app.api.v1.comercial.importaciones import router as importaciones_router
from app.api.v1.comercial.contactos import router as contactos_router
from app.api.v1.comercial.casos_llamada import router as casos_llamada_router
from app.api.v1.comercial.base import router as base_router
from app.api.v1.comercial.clientes import router as clientes_router

app = FastAPI(
    title="SGI Grupo Corban",
    description="Sistema de Gestión Integral - API Backend",
    version="1.0.0"
)

# CORS - Orígenes desde variable de entorno o defaults
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(usuarios_router, prefix="/api/v1")
app.include_router(empleado_router, prefix="/api/v1")
app.include_router(departamento_router, prefix="/api/v1")
app.include_router(areas_router, prefix="/api/v1")
app.include_router(cargos_router, prefix="/api/v1")
app.include_router(activos_router, prefix="/api/v1")
app.include_router(estado_activo_router, prefix="/api/v1")
app.include_router(ubigeo_router, prefix="/api/v1")
app.include_router(importaciones_router, prefix="/api/v1")
app.include_router(contactos_router, prefix="/api/v1")
app.include_router(casos_llamada_router, prefix="/api/v1")
app.include_router(base_router, prefix="/api/v1")
app.include_router(clientes_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Bienvenido al SGI de Grupo Corban"}

@app.get("/health")
def health_check():
    """Endpoint de verificación de salud del servidor"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }
