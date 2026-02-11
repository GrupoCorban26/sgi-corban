from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database.db_connection import get_db
from app.services.comercial.inbox_service import InboxService
from app.schemas.comercial.inbox import InboxDistribute, InboxDistributionResponse, InboxResponse
from app.core.security import get_current_active_auth
from app.models.seguridad import Usuario
from sqlalchemy import select

router = APIRouter()

async def get_current_user_obj(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_active_auth)
) -> Usuario:
    user_id = int(payload.get("sub"))
    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

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

    return await service.get_my_leads(current_user.id)

@router.get("/all-leads", response_model=List[InboxResponse])
async def get_all_leads(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_obj)
):
    """
    Get all pending leads (For Jefa Comercial).
    """
    # Optional: logic to check role
    # if current_user.rol.nombre not in ['JEFA_COMERCIAL', 'ADMINISTRADOR']:
    #     raise HTTPException(status_code=403, detail="Not authorized")
    
    service = InboxService(db)
    return await service.get_all_leads()

@router.post("/{id}/convertir")
async def convert_lead(
    id: int,
    cliente_id: int, # The ID of the newly created client
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
