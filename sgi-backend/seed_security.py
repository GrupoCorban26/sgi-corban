
import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database.db_connection import get_db
from app.models.seguridad import Rol, Permiso
from app.core.initial_data import PERMISOS_DEFINICION, ROLES_DEFINICION

async def seed_security():
    print("Iniciando Seeding de Seguridad...", flush=True)
    
    # Get session generator
    session_gen = get_db()
    
    try:
        # Get session from generator
        db = await anext(session_gen)
        
        try:
            # 1. PERMISOS
            for tec, display, mod in PERMISOS_DEFINICION:
                stmt = select(Permiso).where(Permiso.nombre_tecnico == tec)
                permiso = (await db.execute(stmt)).scalars().first()
                if not permiso:
                    print(f"[+] Creando Permiso: {tec}", flush=True)
                    permiso = Permiso(nombre_tecnico=tec, nombre_display=display, modulo=mod)
                    db.add(permiso)
                else:
                    # Actualizar si cambió descripción
                    permiso.nombre_display = display
                    permiso.modulo = mod
            
            await db.commit()
            print("Permisos sincronizados.", flush=True)

            # 2. ROLES
            for nombre_rol, lista_permisos in ROLES_DEFINICION.items():
                stmt = select(Rol).where(Rol.nombre == nombre_rol).options(selectinload(Rol.permisos))
                rol = (await db.execute(stmt)).scalars().first()
                
                if not rol:
                    print(f"[+] Creando Rol: {nombre_rol}", flush=True)
                    rol = Rol(nombre=nombre_rol, descripcion=f"Rol {nombre_rol}")
                    db.add(rol)
                    await db.commit()
                    # Refresh manually with eager load
                    stmt = select(Rol).where(Rol.id == rol.id).options(selectinload(Rol.permisos))
                    rol = (await db.execute(stmt)).scalars().first()
                
                # Asignar permisos
                perms_objs = []
                for p_tec in lista_permisos:
                    sub_stmt = select(Permiso).where(Permiso.nombre_tecnico == p_tec)
                    p_obj = (await db.execute(sub_stmt)).scalars().first()
                    if p_obj:
                        perms_objs.append(p_obj)
                    else:
                        print(f"[!] ADVERTENCIA: Permiso '{p_tec}' requerido por Rol '{nombre_rol}' no encontrado.", flush=True)
                
                rol.permisos = perms_objs
                print(f"[*] Rol '{nombre_rol}': {len(perms_objs)} permisos asignados.", flush=True)
            
            await db.commit()
            print("--- SEEDING COMPLETADO CON ÉXITO ---", flush=True)

        finally:
            await db.close()

    except Exception as e:
        print(f"ERROR CRITICO EN SEEDING: {e}", flush=True)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
             asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(seed_security())
    except ImportError:
        print("Error importing libraries. Ensure requirements are installed.", flush=True)
