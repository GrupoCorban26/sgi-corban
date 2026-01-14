from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database.db_connection import get_db
from app.core.security import get_current_user_id
from app.services.contactos_service import ContactosService
from app.schemas.contactos import ContactoResponse, ContactoCreate, ContactoUpdate
from sqlalchemy import text

router = APIRouter(
    prefix="/contactos",
    tags=["Contactos"]
)

@router.post("/upload")
async def upload_contactos(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="File must be an Excel file")
        
    return await ContactosService.process_excel_contactos(db, file)

@router.get("/ruc/{ruc}", response_model=List[ContactoResponse])
async def get_contactos(
    ruc: str,
    db: AsyncSession = Depends(get_db)
):
    return await ContactosService.get_contactos_by_ruc(db, ruc)

@router.post("/", response_model=bool)
async def create_contacto(
    contacto: ContactoCreate,
    db: AsyncSession = Depends(get_db)
):
    return await ContactosService.create_contacto(db, contacto.dict())

@router.put("/{id}", response_model=bool)
async def update_contacto(
    id: int,
    contacto: ContactoUpdate,
    db: AsyncSession = Depends(get_db)
):
    return await ContactosService.update_contacto(db, id, contacto.dict())

@router.delete("/{id}", response_model=bool)
async def delete_contacto(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    return await ContactosService.delete_contacto(db, id)

@router.get("/list/paginated")
async def get_contactos_paginados(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    estado: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Lista contactos paginados con razon_social, caso, estado y estadísticas de disponibles."""
    return await ContactosService.get_contactos_paginado(db, page, page_size, search, estado)

@router.get("/stats")
async def get_estadisticas(db: AsyncSession = Depends(get_db)):
    """Retorna estadísticas de contactos: total, disponibles, asignados, en_gestion."""
    return await ContactosService.get_estadisticas(db)

@router.post("/assign-batch")
async def assign_leads_batch(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id) 
):
    # Logic to assign 50 unassigned leads to current user
    return await ContactosService.assign_leads_batch(db, user_id)

# ============================================
# ENDPOINTS PARA COMERCIAL/BASE
# ============================================

@router.get("/mis-asignados")
async def get_mis_contactos_asignados(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Obtiene los contactos asignados al comercial actual."""
    return await ContactosService.get_mis_contactos_asignados(db, user_id)

@router.post("/cargar-base")
async def cargar_base(
    pais_origen: str = Query(None, description="Filtro por país de origen"),
    partida_arancelaria: str = Query(None, description="Filtro por partida arancelaria (4 dígitos)"),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Carga 50 contactos de empresas únicas para el comercial."""
    return await ContactosService.cargar_base(db, user_id, pais_origen, partida_arancelaria)

@router.put("/{id}/feedback")
async def actualizar_feedback(
    id: int,
    caso_id: int = Query(..., description="ID del caso de llamada"),
    comentario: str = Query(..., min_length=1, description="Comentario de la llamada"),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Actualiza el feedback de un contacto (caso y comentario)."""
    return await ContactosService.actualizar_feedback(db, id, caso_id, comentario)

@router.post("/enviar-feedback")
async def enviar_feedback_lote(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Envía el feedback de todos los contactos asignados y los marca como gestionados."""
    return await ContactosService.enviar_feedback_lote(db, user_id)

@router.get("/filtros-base")
async def get_filtros_base(db: AsyncSession = Depends(get_db)):
    """Obtiene los países y partidas arancelarias disponibles para filtrar."""
    return await ContactosService.get_filtros_base(db)

