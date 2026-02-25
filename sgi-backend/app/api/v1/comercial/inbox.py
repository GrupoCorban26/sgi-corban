from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database.db_connection import get_db
from app.services.comercial.inbox_service import InboxService
from app.schemas.comercial.inbox import InboxDistribute, InboxDistributionResponse, InboxResponse
from app.core.dependencies import get_current_user_obj
from app.models.seguridad import Usuario

router = APIRouter()

@router.post("/distribute", response_model=InboxDistributionResponse)
async def distribute_lead(data: InboxDistribute, db: AsyncSession = Depends(get_db)):
    """
    Endpoint for n8n. Receives a message, assigns a commercial, and returns assignment info.
    """
    service = InboxService(db)
    try:
        result = await service.distribute_lead(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/count", response_model=int)
async def get_pending_count(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """
    Get the number of pending leads for the current user.
    """
    service = InboxService(db)
    return await service.get_pending_count(current_user.id)

@router.get("/count-all", response_model=int)
async def get_all_pending_count(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """
    Get total pending leads (For Jefa Comercial).
    """
    service = InboxService(db)
    return await service.get_all_pending_count()

@router.get("/my-leads", response_model=List[InboxResponse])
async def get_my_leads(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """
    Get pending leads assigned to the current user.
    """
    service = InboxService(db)
    return await service.get_my_leads(current_user.id)

@router.get("/all-leads", response_model=List[InboxResponse])
async def get_all_leads(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """
    Get all pending leads (For Jefa Comercial).
    """
    service = InboxService(db)
    return await service.get_all_leads()

@router.post("/{id}/convertir")
async def convert_lead(
    id: int,
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    service = InboxService(db)
    success = await service.convert_lead(id, cliente_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead converted successfully"}

@router.post("/{id}/descartar")
async def discard_lead(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    service = InboxService(db)
    success = await service.discard_lead(id)
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead discarded"}

@router.post("/{id}/escalar")
async def escalar_a_directo(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """Marca que el comercial compartió su número corporativo con el cliente."""
    service = InboxService(db)
    success = await service.escalar_a_directo(id)
    if not success:
        raise HTTPException(status_code=400, detail="Lead no encontrado o ya fue escalado")
    return {"message": "Lead escalado a contacto directo"}
