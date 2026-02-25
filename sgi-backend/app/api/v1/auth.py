from fastapi import APIRouter, Depends, HTTPException, status, Request
import logging
# 1. Quitamos OAuth2PasswordRequestForm e importamos tu esquema
from app.schemas.auth import UserLoginSchema 
from sqlalchemy.ext.asyncio import AsyncSession # Asegúrate de usar AsyncSession si tu service es async
from app.database.db_connection import get_db 
from app.core import security
from app.services.auth import AuthService

router = APIRouter(prefix="/login", tags=["Seguridad"])

@router.post("/")
async def login(
    # 2. Cambiamos el Depends del formulario por tu Schema de Pydantic
    payload: UserLoginSchema, 
    request: Request,
    db: AsyncSession = Depends(get_db) # Cambiado a AsyncSession para consistencia con tu service
):
    # 3. Accedemos a los datos mediante 'payload.correo' (ya no es .username)
    auth_svc = AuthService(db)
    user_data = await auth_svc.obtener_usuario_por_correo(payload.correo)
    
    # DEBUG: Ver qué roles devuelve el SP
    logging.info(f"[LOGIN DEBUG] Roles del usuario: {user_data.get('roles', []) if user_data else 'No user data'}")
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Usuario o contraseña incorrectos" # Mejor mensaje por seguridad
        )

    # 4. Verificamos contraseña usando 'payload.password'
    if not security.verificar_password(payload.password, user_data['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Usuario o contraseña incorrectos"
        )
    
    # 3. Validar si está bloqueado
    if user_data['is_bloqueado']:
        raise HTTPException(status_code=403, detail="Cuenta bloqueada")

    # 4. Generar Token (incluir roles para el menú del frontend)
    access_token = security.crear_access_token(
        data={
            "sub": str(user_data['usuario_id']),
            "nombre": user_data['nombre_corto'],
            "permisos": user_data['permisos'],
            "roles": user_data.get('roles', []),
            "area": user_data['area_nombre']
        }
    )

    # 5. REGISTRAR SESIÓN EN BD
    # Obtenemos IP y User-Agent del request
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    await auth_svc.registrar_sesion(
        usuario_id=user_data['usuario_id'],
        token=access_token,
        ip=client_ip,
        user_agent=user_agent
    )

    # Devolvemos la respuesta
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_data['usuario_id'],
            "nombre": user_data['nombre_corto'],
            "area": user_data['area_nombre'],
            "cargo": user_data['cargo_nombre'],
            "roles": user_data.get('roles', []),
            "debe_cambiar_password": user_data['debe_cambiar_pass']
        }
    }

@router.post("/logout")
async def logout(
    token: str = Depends(security.oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    """
    Cierra la sesión actual revocando el token en la base de datos.
    """
    auth_svc = AuthService(db)
    revocado = await auth_svc.revocar_sesion(token)
    if not revocado:
        # Podríamos retornar 404 o 400, pero por seguridad a veces es mejor 200
        # o simplemente informar que no se encontró sesión activa
        pass
        
    return {"message": "Sesión cerrada exitosamente"}
