from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_connection import get_db 
from app.core import security
from app.schemas.auth import UserLoginSchema, Token
from fastapi import HTTPException
from app.services.auth import obtener_usuario_por_correo

router = APIRouter()

@router.post("/login")
async def login(payload: UserLoginSchema, db: Session = Depends(get_db)):
    # 1. Buscar usuario en DB usando tu SP
    user_data = await obtener_usuario_por_correo(db, payload.correo)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    # 2. Verificar contraseña (compara texto plano vs hash del SP)
    if not security.verificar_password(payload.password, user_data['password_hash']):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    
    # 3. Validar si está bloqueado
    if user_data['is_bloqueado']:
        raise HTTPException(status_code=403, detail="Cuenta bloqueada")

    # 4. Generar Token incluyendo permisos y roles
    access_token = security.crear_access_token(
        data={
            "sub": str(user_data['usuario_id']),
            "nombre": user_data['nombre_corto'],
            "permisos": user_data['permisos']
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "nombre": user_data['nombre_corto'],
            "debe_cambiar_password": user_data['debe_cambiar_password']
        }
    }