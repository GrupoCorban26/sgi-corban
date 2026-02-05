import asyncio
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database.db_connection import engine

async def audit_lineas():
    async with engine.connect() as conn:
        print("[INFO] Iniciando auditoria de lineas corporativas...")
        
        # Query 1: Lines assigned to an active, where the active is assigned to a DIFFERENT employee than the line
        query_conflict = text("""
            SELECT 
                l.id as linea_id, 
                l.numero, 
                e_linea.nombres + ' ' + e_linea.apellido_paterno as responsable_linea,
                e_activo.nombres + ' ' + e_activo.apellido_paterno as responsable_activo,
                a.producto + ' ' + a.modelo as activo_modelo
            FROM adm.lineas_corporativas l
            JOIN adm.empleado_activo ea ON l.activo_id = ea.activo_id AND ea.fecha_devolucion IS NULL
            JOIN adm.empleados e_linea ON l.empleado_id = e_linea.id
            JOIN adm.empleados e_activo ON ea.empleado_id = e_activo.id
            JOIN adm.activos a ON l.activo_id = a.id
            WHERE l.empleado_id <> ea.empleado_id
        """)
        
        result_conflict = await conn.execute(query_conflict)
        conflicts = result_conflict.fetchall()
        
        if conflicts:
            print(f"\n[CONFLICTO] SE ENCONTRARON {len(conflicts)} CONFLICTOS (Linea dice Juan, Celular lo tiene Pedro):")
            print(f"{'ID':<5} {'NUMERO':<15} {'RESP. LINEA (Actual)':<30} {'TIENE EL CELULAR (Real)':<30} {'CELULAR'}")
            print("-" * 110)
            for row in conflicts:
                print(f"{row.linea_id:<5} {row.numero:<15} {row.responsable_linea:<30} {row.responsable_activo:<30} {row.activo_modelo}")
        else:
            print("\n[OK] No hay conflictos directos entre responsable de linea y tenedor del activo.")

        # Query 2: Lines assigned to an active, but the active is NOT currently assigned to anyone
        query_orphan_active = text("""
            SELECT 
                l.id as linea_id, 
                l.numero, 
                e_linea.nombres + ' ' + e_linea.apellido_paterno as responsable_linea,
                a.producto + ' ' + a.modelo as activo_modelo
            FROM adm.lineas_corporativas l
            LEFT JOIN adm.empleado_activo ea ON l.activo_id = ea.activo_id AND ea.fecha_devolucion IS NULL
            JOIN adm.empleados e_linea ON l.empleado_id = e_linea.id
            JOIN adm.activos a ON l.activo_id = a.id
            WHERE l.activo_id IS NOT NULL AND ea.id IS NULL
        """)
        
        result_orphan = await conn.execute(query_orphan_active)
        orphans = result_orphan.fetchall()
        
        if orphans:
            print(f"\n[WARNING] SE ENCONTRARON {len(orphans)} LINEAS EN ACTIVOS SIN ASIGNAR (Linea tiene dueno, pero el celular esta en stock):")
            print(f"{'ID':<5} {'NUMERO':<15} {'RESP. LINEA':<30} {'CELULAR'}")
            print("-" * 80)
            for row in orphans:
                print(f"{row.linea_id:<5} {row.numero:<15} {row.responsable_linea:<30} {row.activo_modelo}")
        else:
            print("\n[OK] No hay lineas en activos sin asignar.")

        # Query 3: Lines WITHOUT active (SIM cards loose)
        query_loose = text("""
            SELECT 
                l.id as linea_id, 
                l.numero, 
                e_linea.nombres + ' ' + e_linea.apellido_paterno as responsable_linea
            FROM adm.lineas_corporativas l
            JOIN adm.empleados e_linea ON l.empleado_id = e_linea.id
            WHERE l.activo_id IS NULL
        """)
        
        result_loose = await conn.execute(query_loose)
        loose = result_loose.fetchall()
        
        if loose:
            print(f"\n[INFO] SE ENCONTRARON {len(loose)} LINEAS SUELTAS (Sin celular asociado):")
            for row in loose:
                print(f" - {row.numero} (Responsable: {row.responsable_linea})")
        else:
             print("\n[OK] No hay lineas sueltas.")
        
        print("\n[FIN] Auditoria finalizada.")

if __name__ == "__main__":
    asyncio.run(audit_lineas())
