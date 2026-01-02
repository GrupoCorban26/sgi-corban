import json
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

async def obtener_usuario_por_correo(db: AsyncSession, correo: str):
    try:
        query = text("EXEC seg.sp_obtener_usuario_login @correo_corp = :correo")
        result = await db.execute(query, {"correo": correo})
        row = result.fetchone()
        
        if not row or row is None or row[0] is None:
            return None
        
        user_dict = json.loads(row[0])

        # TRANSFORMACIÓN Y LIMPIEZA DE DATOS
        # .get('llave', []) devuelve una lista vacía si la llave no existe
        
        # 1. Limpiar Roles: de [{"nombre": "Admin"}] a ["Admin"]
        roles_raw = user_dict.get('roles', [])
        user_dict['roles'] = [r['nombre'] for r in roles_raw] if roles_raw else []

        # 2. Limpiar Permisos: de [{"nombre_tecnico": "ver"}] a ["ver"]
        permisos_raw = user_dict.get('permisos', [])
        user_dict['permisos'] = [p['nombre_tecnico'] for p in permisos_raw] if permisos_raw else []

        return user_dict
    
    except Exception as e:
        logging.error(f"Error en obtener_usuario_por_correo: {e}")
        return None