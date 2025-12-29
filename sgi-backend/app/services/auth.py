import json
from sqlalchemy import text
from sqlalchemy.orm import Session

def obtener_usuario_por_correo(db: Session, correo: str):
    try:
    # Llamamos a tu SP
        query = text("EXEC seg.sp_obtener_usuario_login @correo_corp = :correo")
        result = db.execute(query, {"correo": correo}).fetchone()
        
        if result is None or result[0] is None:
            return None
        
        user_dict = json.loads(result[0])

        return user_dict
    
    except Exception as e:
        # Esto imprimirá el error real en tu terminal de VS Code
        print(f"Error crítico en obtener_usuario_por_correo: {e}")
        return None