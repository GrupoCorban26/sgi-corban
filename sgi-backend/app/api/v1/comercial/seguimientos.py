from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.database.db_connection import get_db
from app.schemas.comercial.seguimiento import (
    SeguimientoCreate,
    SeguimientoResponse,
    SeguimientoUpdate,
    CotizacionItemCreate,
    CotizacionItemResponse,
    CotizacionCerrar,
    SeguimientoCaer,
    SeguimientoMover,
    SeguimientoComentarioCreate,
    SeguimientoComentarioResponse,
    SeguimientoHistorialResponse,
    TipoCargaResponse,
    TipoServicioComercialResponse,
    SegmentacionCierreResponse,
    DocumentoOperacionalResponse,
    DocumentoOperacionalCreate,
    DocumentoOperacionalUpdate,
    SeguimientoDocumentoResponse,
    DocumentoToggle,
    SeguimientoOperar,
    SeguimientoEntregar
)
from app.services.comercial.seguimientos_service import SeguimientosService
from app.core.security import get_current_user_id, get_current_token_payload
from app.core.dependencies import require_permission, resolver_comercial_ids, require_any_role

router = APIRouter(prefix="/seguimientos", tags=["Seguimientos"])


# ══════════════════════════════════════════
# CATÁLOGOS
# ══════════════════════════════════════════

@router.get("/catalogos", dependencies=[Depends(require_permission("seguimientos.listar"))])
async def get_catalogos(db: AsyncSession = Depends(get_db)):
    """Obtiene todos los catálogos necesarios para gestionar seguimientos y cotizaciones."""
    service = SeguimientosService(db)
    return await service.get_catalogos()


# ══════════════════════════════════════════
# DOCUMENTOS OPERACIONALES (CRUD de catálogo)
# ══════════════════════════════════════════

@router.get("/documentos-operacionales", response_model=List[DocumentoOperacionalResponse], dependencies=[Depends(require_permission("seguimientos.listar"))])
async def listar_documentos_operacionales(db: AsyncSession = Depends(get_db)):
    """Lista todos los documentos operacionales activos del catálogo."""
    service = SeguimientosService(db)
    return await service.get_documentos_operacionales()


@router.post("/documentos-operacionales", response_model=DocumentoOperacionalResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_any_role("ADMIN", "SISTEMAS"))])
async def crear_documento_operacional(
    data: DocumentoOperacionalCreate,
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo tipo de documento operacional. Requiere rol ADMIN o SISTEMAS."""
    service = SeguimientosService(db)
    return await service.crear_documento_operacional(data)


@router.patch("/documentos-operacionales/{id}", response_model=DocumentoOperacionalResponse, dependencies=[Depends(require_any_role("ADMIN", "SISTEMAS"))])
async def actualizar_documento_operacional(
    id: int,
    data: DocumentoOperacionalUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Actualiza un documento operacional existente. Requiere rol ADMIN o SISTEMAS."""
    service = SeguimientosService(db)
    return await service.actualizar_documento_operacional(id, data)


# ══════════════════════════════════════════
# LISTADO Y DETALLE
# ══════════════════════════════════════════

@router.get("", response_model=List[SeguimientoResponse], dependencies=[Depends(require_permission("seguimientos.listar"))])
async def listar_seguimientos(
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Lista todas las tarjetas de seguimiento con filtros automáticos de RBAC por equipo."""
    service = SeguimientosService(db)
    return await service.get_seguimientos(comercial_ids=comercial_ids)


@router.get("/{id}", response_model=SeguimientoResponse, dependencies=[Depends(require_permission("seguimientos.listar"))])
async def obtener_seguimiento(
    id: int,
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Obtiene el detalle de una tarjeta de seguimiento específica. Valida permisos del comercial encargado."""
    service = SeguimientosService(db)
    seg = await service.get_seguimiento_by_id(id)

    # Control de acceso: Verificar que el comercial encargado esté en el rango permitido
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes acceso a este seguimiento")

    return seg


@router.patch("/{id}", response_model=SeguimientoResponse, dependencies=[Depends(require_permission("seguimientos.editar"))])
async def actualizar_seguimiento(
    id: int,
    data: SeguimientoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Actualiza una tarjeta de seguimiento. Valida permisos del comercial encargado."""
    service = SeguimientosService(db)
    
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este seguimiento")
        
    return await service.update_seguimiento(id=id, data=data, usuario_id=current_user_id)


# ══════════════════════════════════════════
# CREACIÓN
# ══════════════════════════════════════════

@router.post("", response_model=SeguimientoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("seguimientos.crear"))])
async def crear_seguimiento(
    data: SeguimientoCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Crea una nueva tarjeta de seguimiento en el Kanban con sus cotizaciones iniciales."""
    service = SeguimientosService(db)
    return await service.create_seguimiento(
        data=data,
        comercial_id=current_user_id,
        created_by=current_user_id
    )


# ══════════════════════════════════════════
# COTIZACIONES
# ══════════════════════════════════════════

@router.post("/{id}/cotizaciones", response_model=CotizacionItemResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("seguimientos.editar"))])
async def agregar_cotizacion(
    id: int,
    data: CotizacionItemCreate,
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Agrega una cotización adicional (modalidad FCL, LCL, etc.) a un seguimiento existente."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este seguimiento")

    return await service.agregar_cotizacion(seguimiento_id=id, data=data)


# ══════════════════════════════════════════
# TRANSICIONES DE ESTADO
# ══════════════════════════════════════════

@router.post("/{id}/mover", response_model=SeguimientoResponse, dependencies=[Depends(require_permission("seguimientos.editar"))])
async def mover_tarjeta(
    id: int,
    data: SeguimientoMover,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Mueve una tarjeta de seguimiento en el Kanban (para reactivación a COTIZADO)."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este seguimiento")

    return await service.mover_tarjeta(id=id, data=data, usuario_id=current_user_id)


@router.post("/{id}/cerrar", response_model=SeguimientoResponse, dependencies=[Depends(require_permission("seguimientos.editar"))])
async def cerrar_seguimiento(
    id: int,
    data: CotizacionCerrar,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Cierra la venta aceptando una cotización específica con su COR de SISPAC y segmentación de atribución."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para cerrar este seguimiento")

    return await service.cerrar_seguimiento(id=id, data=data, usuario_id=current_user_id)


@router.post("/{id}/caer", response_model=SeguimientoResponse, dependencies=[Depends(require_permission("seguimientos.editar"))])
async def caer_seguimiento(
    id: int,
    data: SeguimientoCaer,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Marca la tarjeta de seguimiento como CAIDO indicando un motivo de caída global obligatorio."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este seguimiento")

    return await service.caer_seguimiento(id=id, data=data, usuario_id=current_user_id)


@router.post("/{id}/operar", response_model=SeguimientoResponse, dependencies=[Depends(require_permission("seguimientos.editar"))])
async def operar_seguimiento(
    id: int,
    data: SeguimientoOperar,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Transiciona un seguimiento CERRADO → EN_OPERACION con datos de ETA, incoterm y documentos requeridos."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para operar este seguimiento")

    return await service.operar_seguimiento(id=id, data=data, usuario_id=current_user_id)


@router.post("/{id}/entregar", response_model=SeguimientoResponse, dependencies=[Depends(require_permission("seguimientos.editar"))])
async def entregar_carga(
    id: int,
    data: SeguimientoEntregar,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Transiciona un seguimiento EN_OPERACION → CARGA_ENTREGADA."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para entregar este seguimiento")

    return await service.entregar_carga(id=id, data=data, usuario_id=current_user_id)


# ══════════════════════════════════════════
# DOCUMENTOS DE SEGUIMIENTO (toggle)
# ══════════════════════════════════════════

@router.patch("/{id}/documentos/{doc_rel_id}/toggle", response_model=SeguimientoDocumentoResponse, dependencies=[Depends(require_permission("seguimientos.editar"))])
async def toggle_documento(
    id: int,
    doc_rel_id: int,
    data: DocumentoToggle,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Marca o desmarca un documento operacional como completado para un seguimiento en operación."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este seguimiento")

    return await service.toggle_documento(
        seguimiento_id=id,
        doc_rel_id=doc_rel_id,
        completado=data.completado,
        usuario_id=current_user_id
    )


# ══════════════════════════════════════════
# COMENTARIOS E HISTORIAL
# ══════════════════════════════════════════

@router.post("/{id}/comentarios", response_model=SeguimientoComentarioResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("seguimientos.editar"))])
async def registrar_comentario(
    id: int,
    data: SeguimientoComentarioCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Registra una gestión o comentario manual en la tarjeta de seguimiento."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este seguimiento")

    return await service.registrar_comentario(
        id=id,
        comentario=data.comentario,
        medio_gestion_id=data.medio_gestion_id,
        usuario_id=current_user_id
    )


@router.get("/{id}/historial", response_model=List[SeguimientoHistorialResponse], dependencies=[Depends(require_permission("seguimientos.listar"))])
async def obtener_historial(
    id: int,
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Obtiene la trazabilidad e historial de transiciones de una tarjeta de seguimiento."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes acceso a este seguimiento")

    return await service.get_historial(id)


@router.get("/{id}/comentarios", response_model=List[SeguimientoComentarioResponse], dependencies=[Depends(require_permission("seguimientos.listar"))])
async def obtener_comentarios(
    id: int,
    db: AsyncSession = Depends(get_db),
    comercial_ids: list = Depends(resolver_comercial_ids)
):
    """Obtiene todos los comentarios registrados en una tarjeta de seguimiento."""
    service = SeguimientosService(db)
    # Validar acceso
    seg = await service.get_seguimiento_by_id(id)
    if comercial_ids is not None and seg.comercial_id not in comercial_ids:
        raise HTTPException(status_code=403, detail="No tienes acceso a este seguimiento")

    return await service.get_comentarios(id)
