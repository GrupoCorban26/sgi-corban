import asyncio
import pandas as pd
import sys
import os
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import date

# Agregar el directorio raíz del backend al path para que Python encuentre 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ajustamos estos imports a la estructura de tu proyecto
from app.database.db_connection import SessionLocal
from app.models.comercial import Cliente, ClienteContacto
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado

async def migrate_sispac(file_path: str):
    print("Iniciando migración de Sispac a SGI...")
    
    # 1. Leer el excel
    df = pd.read_excel(file_path)
    df = df.where(pd.notnull(df), None)
    total_filas = len(df)
    print(f"Archivo cargado. Total de filas: {total_filas}")

    async with SessionLocal() as db:
        # 1. Extraer a los usuarios/ejecutivos del SGI para cruzarlos con la columna EJECUTIVO
        stmt_usuarios = select(
            Usuario.id.label("usuario_id"), 
            Empleado.nombres, 
            Empleado.apellido_paterno
        ).join(Empleado, Usuario.empleado_id == Empleado.id)
        
        usuarios_activos = (await db.execute(stmt_usuarios)).all()
        
        # Crear un diccionario para encontrar el ID del comercial por parte de su nombre
        ejecutivos_map = {}
        for row in usuarios_activos:
            # Ejemplo: "EGON BUSTAMANTE"
            nombre_comb = f"{row.nombres} {row.apellido_paterno}".upper()
            ejecutivos_map[nombre_comb] = row.usuario_id
            
            # También guardo el primer nombre + primer apellido por si aca
            n1 = row.nombres.split()[0].upper() if row.nombres else ""
            a1 = row.apellido_paterno.split()[0].upper() if row.apellido_paterno else ""
            ejecutivos_map[f"{n1} {a1}"] = row.usuario_id
        
        # Traer todos los RUCs existentes en clientes
        rucs_existentes_clientes = (await db.execute(select(Cliente.ruc))).scalars().all()
        set_rucs_clientes = set(r for r in rucs_existentes_clientes if r)
        
        # Traer todos los RUCs en cliente_contactos
        rucs_existentes_contactos = (await db.execute(select(ClienteContacto.ruc))).scalars().all()
        set_rucs_contactos = set(r for r in rucs_existentes_contactos if r)
        
        clientes_nuevos_batch = []
        contactos_nuevos_batch = []
        
        # Diccionarios para evitar duplicados en memoria durante el loop
        processed_clientes_rucs = set()
        
        for idx, row in df.iterrows():
            ruc_raw = row.get("N_DOC")
            if not ruc_raw:
                continue
                
            # Limpiar RUC (a veces Pandas los lee como float: 205498849.0)
            try: ruc = str(int(ruc_raw)).strip()
            except: ruc = str(ruc_raw).strip()
            
            if len(ruc) < 8: # saltar DNIs u otros datos inválidos si corresponde
                continue
                
            nombre_empresa = str(row.get("NOMBRE", "")).strip()
            telefono = str(row.get("TELEF1", "")).strip()
            if not telefono or telefono == 'None':
                telefono = "S/N"
                
            contacto_nombre = str(row.get("CONTACTO", "")).strip()
            if not contacto_nombre or contacto_nombre == 'None':
                contacto_nombre = None
                
            correo = str(row.get("EMAIL", "")).strip()
            if not correo or correo == 'None':
                correo = None
            
            ejecutivo_raw = str(row.get("EJECUTIVO", "")).strip().upper()
            comercial_id = None
            if ejecutivo_raw:
                # Intento buscar el id
                for key, u_id in ejecutivos_map.items():
                    if key in ejecutivo_raw or ejecutivo_raw in key:
                        comercial_id = u_id
                        break
            
            # --- 1. PROCESAR CLIENTE OFICIAL ---
            if ruc not in set_rucs_clientes and ruc not in processed_clientes_rucs:
                clientes_nuevos_batch.append(
                    Cliente(
                        ruc=ruc,
                        razon_social=nombre_empresa,
                        tipo_estado="CLIENTE",
                        origen="CARTERA_PROPIA",
                        comercial_encargado_id=comercial_id,
                        ultimo_contacto=func.now(),
                        proxima_fecha_contacto=date(2026, 3, 31),
                        comentario_ultima_llamada="Actualizar",
                        is_active=True
                    )
                )
                processed_clientes_rucs.add(ruc)
                
            # --- 2. PROCESAR CONTACTO ASOCIADO ---
            # Un cliente puede tener varias sedes o sucursales con mismo ruc pero diferente teléfono en el excel
            # Así que lo agregamos siempre a la agenda de contactos de los vendedores
            if ruc not in set_rucs_contactos:
                contactos_nuevos_batch.append(
                    ClienteContacto(
                        ruc=ruc,
                        telefono=telefono,
                        nombre=contacto_nombre or nombre_empresa,
                        correo=correo,
                        origen="CARTERA_PROPIA",
                        is_client=True,
                        estado="ASIGNADO" if comercial_id else "DISPONIBLE",
                        asignado_a=comercial_id,
                        is_active=True
                    )
                )

        print(f"Listos para insertar {len(clientes_nuevos_batch)} Clientes Oficiales únicos.")
        print(f"Listos para insertar {len(contactos_nuevos_batch)} Contactos/Teléfonos de Agenda.")
        
        # Inserción en batch
        if clientes_nuevos_batch:
            db.add_all(clientes_nuevos_batch)
        if contactos_nuevos_batch:
            db.add_all(contactos_nuevos_batch)
            
        try:
            await db.commit()
            print("¡MIGRACIÓN EXITOSA!")
        except Exception as e:
            await db.rollback()
            print(f"Error durante el guardado: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Migrate Sispac Excel to SGI")
    parser.add_argument("file_path", help="Path to the Excel file")
    args = parser.parse_args()
    
    asyncio.run(migrate_sispac(args.file_path))
