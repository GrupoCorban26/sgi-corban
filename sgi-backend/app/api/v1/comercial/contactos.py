from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database.db_connection import get_db
from app.core.security import get_current_user_id, get_current_active_auth
from app.core.dependencies import require_permission
from app.services.contactos_service import ContactosService
from app.schemas.comercial.contactos import ContactoResponse, ContactoCreate, ContactoUpdate, ContactoManualCreate

router = APIRouter(
    prefix="/contactos",
    tags=["Contactos"]
)


@router.post("/upload", dependencies=[Depends(require_permission("importaciones.cargar"))])
async def upload_contactos(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Carga masiva de contactos desde Excel."""
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="File must be an Excel file")
    
    service = ContactosService(db)
    return await service.process_excel_contactos(file)


@router.get("/ruc/{ruc}", response_model=List[ContactoResponse], dependencies=[Depends(require_permission("contactos.listar"))])
async def get_contactos(
    ruc: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene contactos por RUC."""
    service = ContactosService(db)
    return await service.get_contactos_by_ruc(ruc)


@router.post("/", response_model=bool, dependencies=[Depends(require_permission("contactos.crear"))])
async def create_contacto(
    contacto: ContactoCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Crea un nuevo contacto."""
    service = ContactosService(db)
    return await service.create_contacto(contacto.dict())


@router.put("/{id}", response_model=bool, dependencies=[Depends(require_permission("contactos.editar"))])
async def update_contacto(
    id: int,
    contacto: ContactoUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Actualiza un contacto existente."""
    service = ContactosService(db)
    return await service.update_contacto(id, contacto.dict())


@router.delete("/{id}", response_model=bool, dependencies=[Depends(require_permission("contactos.editar"))])
async def delete_contacto(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Desactiva un contacto (soft delete)."""
    service = ContactosService(db)
    return await service.delete_contacto(id)


@router.get("/list/paginated", dependencies=[Depends(require_permission("contactos.listar"))])
async def get_contactos_paginados(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    estado: str = Query(None),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Lista contactos paginados con razon_social, caso, estado y estadísticas de disponibles."""
    service = ContactosService(db)
    return await service.get_contactos_paginado(page, page_size, search, estado)


@router.get("/stats", dependencies=[Depends(require_permission("contactos.listar"))])
async def get_estadisticas(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Retorna estadísticas de contactos: total, disponibles, asignados, en_gestion."""
    service = ContactosService(db)
    return await service.get_estadisticas()


@router.get("/kpis-gestion", dependencies=[Depends(require_permission("reportes.ver_comercial"))])
async def get_kpis_gestion(
    fecha_inicio: str = Query(None, description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: str = Query(None, description="Fecha fin YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Retorna KPIs de gestión para dashboard (Total Repartido, Contactabilidad, Positivos)."""
    service = ContactosService(db)
    return await service.get_kpis_gestion(fecha_inicio, fecha_fin)


@router.post("/assign-batch", dependencies=[Depends(require_permission("contactos.editar"))])
async def assign_leads_batch(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id) 
):
    """Asigna un lote de contactos al comercial actual."""
    service = ContactosService(db)
    return await service.assign_leads_batch(user_id)


# ============================================
# ENDPOINTS PARA COMERCIAL/BASE
# ============================================

@router.get("/mis-asignados", dependencies=[Depends(require_permission("contactos.listar"))])
async def get_mis_contactos_asignados(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Obtiene los contactos asignados al comercial actual."""
    service = ContactosService(db)
    return await service.get_mis_contactos_asignados(user_id)


@router.post("/cargar-base", dependencies=[Depends(require_permission("contactos.crear"))])
async def cargar_base(
    pais_origen: List[str] = Query(None, description="Filtro por país de origen"),
    partida_arancelaria: List[str] = Query(None, description="Filtro por partida arancelaria (4 dígitos)"),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Carga 50 contactos de empresas únicas para el comercial."""
    service = ContactosService(db)
    return await service.cargar_base(user_id, pais_origen, partida_arancelaria)


@router.post("/manual", dependencies=[Depends(require_permission("contactos.crear"))])
async def create_contacto_manual(
    contacto: ContactoManualCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Crea un contacto manual asociado a un RUC y lo asigna al comercial."""
    service = ContactosService(db)
    return await service.create_contacto_manual(contacto, user_id)


@router.put("/{id}/feedback", dependencies=[Depends(require_permission("contactos.editar"))])
async def actualizar_feedback(
    id: int,
    caso_id: int = Query(..., description="ID del caso de llamada"),
    comentario: str = Query(..., min_length=1, description="Comentario de la llamada"),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Actualiza el feedback de un contacto (caso y comentario)."""
    service = ContactosService(db)
    return await service.actualizar_feedback(id, caso_id, comentario, user_id)


@router.post("/enviar-feedback", dependencies=[Depends(require_permission("contactos.editar"))])
async def enviar_feedback_lote(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Envía el feedback de todos los contactos asignados y los marca como gestionados."""
    service = ContactosService(db)
    return await service.enviar_feedback_lote(user_id)


@router.get("/filtros-base", dependencies=[Depends(require_permission("contactos.listar"))])
async def get_filtros_base(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_active_auth)
):
    """Obtiene los países y partidas arancelarias disponibles para filtrar."""
    service = ContactosService(db)
    return await service.get_filtros_base()
