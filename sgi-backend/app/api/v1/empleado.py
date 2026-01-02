from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database.db_connection import get_db
from app.schemas.empleado import (
    EmpleadoCreate, EmpleadoUpdate, EmpleadoResponse, EmpleadoPaginationResponse
)
from app.services import empleado as empleado_service
from app.core.security import get_current_user_id # Necesitaremos esta función

router = APIRouter(prefix="/empleado", tags=["Empleados"])

# 1. LISTAR EMPLEADOS (PAGINADO)
@router.get("/", response_model=EmpleadoPaginationResponse)
def listar_empleados(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    busqueda: Optional[str] = None,
    activo: Optional[bool] = None,
    area_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user_id) # Protegido
):
    result = empleado_service.listar_empleados(
        db, page, page_size, busqueda, activo, area_id
    )
    if result is None:
        raise HTTPException(status_code=500, detail="Error al obtener lista de empleados")
    return result

# 2. OBTENER UN EMPLEADO
@router.get("/{id}", response_model=EmpleadoResponse)
def obtener_empleado(
    id: int, 
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user_id)
):
    empleado = empleado_service.obtener_empleado_por_id(db, id)
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return empleado

# 3. CREAR EMPLEADO
@router.post("/", response_model=EmpleadoResponse, status_code=status.HTTP_201_CREATED)
def crear_empleado(
    payload: EmpleadoCreate, 
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    # Convertimos el esquema a dict para el SP
    nuevo_empleado = empleado_service.crear_empleado(
        db, payload.model_dump(), current_user_id
    )
    if not nuevo_empleado:
        raise HTTPException(status_code=400, detail="No se pudo crear el empleado")
    return nuevo_empleado

# 4. ACTUALIZAR EMPLEADO
@router.patch("/{id}", response_model=EmpleadoResponse)
def actualizar_empleado(
    id: int,
    payload: EmpleadoUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    # Solo enviamos los campos que el usuario completó
    datos_update = payload.model_dump(exclude_unset=True)
    
    empleado_editado = empleado_service.actualizar_empleado(
        db, id, datos_update, current_user_id
    )
    
    if not empleado_editado:
        raise HTTPException(status_code=400, detail="Error al actualizar empleado")
    return empleado_editado

# 5. DESACTIVAR EMPLEADO (SOFT DELETE)
@router.delete("/{id}")
def desactivar_empleado(
    id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    resultado = empleado_service.desactivar_empleado(db, id, current_user_id)
    if not resultado:
        raise HTTPException(status_code=400, detail="No se pudo desactivar el empleado")
    return resultado