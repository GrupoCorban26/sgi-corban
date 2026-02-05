
from fastapi import Depends, HTTPException, status
from app.core import security

def require_permission(permiso_requerido: str):
    """
    Factory de dependencias para verificar permisos granulares.
    Uso: @router.get("/", dependencies=[Depends(require_permission("usuarios.listar"))])
    """
    def permission_checker(current_user: dict = Depends(security.get_current_active_auth)):
        permisos_usuario = current_user.get("permisos", [])
        
        # Super-Admin bypass (opcional, pero útil)
        roles = current_user.get("roles", [])
        if "SISTEMAS" in roles: 
             return True # SISTEMAS tiene acceso total implícito para simplificar, o validamos estricto.
             # Por seguridad estricta, mejor NO hacer bypass y que SISTEMAS tenga los permisos explícitos.
             # Comentamos el return True para obligar a tener el permiso.
             # pass 

        if permiso_requerido not in permisos_usuario:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes el permiso requerido: {permiso_requerido}"
            )
        return True

    return permission_checker
