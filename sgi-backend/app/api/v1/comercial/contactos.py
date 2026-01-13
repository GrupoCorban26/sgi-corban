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

@router.post("/assign-batch", response_model=List[ContactoResponse])
async def assign_leads_batch(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id) 
):
    # Logic to assign 50 unassigned leads to current user
    return await ContactosService.assign_leads_batch(db, user_id)
