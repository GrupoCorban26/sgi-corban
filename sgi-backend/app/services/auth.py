import json
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

async def obtener_usuario_por_correo(db: AsyncSession, correo: str):
    try:
        # 1. Definimos la consulta al SP
        query = text("EXEC seg.sp_obtener_usuario_login @correo_corp = :correo")
        
        # 2. Ejecutamos de forma asíncrona
        result = await db.execute(query, {"correo": correo})
        
        # 3. Obtenemos la primera fila (row)
        row = result.fetchone()
        
        # 4. Validamos si hay resultados
        if row is None or row[0] is None:
            return None
        
        # CORRECCIÓN: Usamos 'row[0]', que es donde está el JSON de SQL Server
        user_dict = json.loads(row[0])

        return user_dict
    
    except Exception as e:
        # Esto imprimirá el error real en tu terminal de VS Code
        logging.error(f"Error crítico en obtener_usuario_por_correo: {e}")
        # Es mejor no hacer un raise aquí si quieres que el router maneje el error 401
        return None