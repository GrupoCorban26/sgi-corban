import asyncio
import os
import sys
from datetime import date, datetime
from sqlalchemy import select
from dotenv import load_dotenv

# Buscar y cargar el archivo de configuración (.env.production o .env) en la carpeta del script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_prod = os.path.join(script_dir, ".env.production")
env_dev = os.path.join(script_dir, ".env")

if os.path.exists(env_prod):
    load_dotenv(env_prod)
    print(f"ℹ️ Cargado archivo de configuración de producción: {env_prod}")
elif os.path.exists(env_dev):
    load_dotenv(env_dev)
    print(f"ℹ️ Cargado archivo de configuración de desarrollo: {env_dev}")
else:
    print("⚠️ No se encontró ningún archivo .env o .env.production en el directorio del script.")

from app.database.db_connection import AsyncSessionLocal
from app.models.core import Empresa
from app.services.comercial.email_service import EmailService

async def run_test_email(destinatario: str, empresa_id_arg: int | None = None):
    print(f"=== INICIANDO PRUEBA DE ENVÍO DE CORREO ===")
    print(f"Destinatario: {destinatario}")
    
    async with AsyncSessionLocal() as db:
        email_svc = EmailService(db)
        
        # 1. Obtener empresas disponibles para saber qué IDs existen
        try:
            stmt = select(Empresa)
            result = await db.execute(stmt)
            empresas = result.scalars().all()
        except Exception as e:
            print(f"❌ Error consultando empresas en base de datos: {e}")
            empresas = []

        # Determinar qué empresas probar
        test_jobs = []
        if empresa_id_arg is not None:
            # Probar un ID de empresa específico ingresado por parámetro
            emp_obj = next((e for e in empresas if e.id == empresa_id_arg), None)
            emp_nombre = emp_obj.razon_social if emp_obj else f"Empresa #{empresa_id_arg}"
            test_jobs.append((empresa_id_arg, emp_nombre))
        else:
            # Probar todas las empresas registradas + el Fallback
            for emp in empresas:
                test_jobs.append((emp.id, emp.razon_social))
            # Agregar el fallback general
            test_jobs.append((None, "Fallback (.env / Global)"))

        # 2. Enviar correos de prueba
        print(f"\nSe realizarán {len(test_jobs)} pruebas de envío:")
        
        for emp_id, nombre in test_jobs:
            print(f"\n👉 Probando perfil: '{nombre}' (ID: {emp_id})")
            
            # Resolver configuración para depuración
            smtp_config, empresa_nombre = await email_svc._resolve_empresa_smtp(emp_id)
            print(f"   SMTP Host: {smtp_config.get('host')}")
            print(f"   SMTP Port: {smtp_config.get('port')}")
            print(f"   SMTP User: {smtp_config.get('user')}")
            print(f"   SMTP Sender: {smtp_config.get('sender')}")
            
            if not smtp_config.get('host') or not smtp_config.get('user') or not smtp_config.get('password'):
                print(f"   ⚠️ Perfil no enviado: Faltan credenciales SMTP (Host/User/Pass) en BD o .env.")
                continue

            try:
                print(f"   Enviando correo de alerta de documentos pendientes a {destinatario}...")
                
                # Datos dummy para la plantilla
                dias_restantes = 5
                fecha_eta = date.today()
                documentos_pendientes = [
                    "Bill of Lading (B/L) original / Telex Release",
                    "Factura Comercial (Commercial Invoice)",
                    "Packing List detallado",
                    "Certificado de Origen (si aplica)"
                ]
                
                exito = await email_svc.enviar_alerta_documentos_pendientes(
                    destinatario_email=destinatario,
                    razon_social="Cliente Prueba S.A.C.",
                    titulo_embarque="EMBARQUE PRUEBA SGI - 2026",
                    dias_restantes=dias_restantes,
                    fecha_eta=fecha_eta,
                    documentos_pendientes=documentos_pendientes,
                    empresa_id=emp_id,
                    cor="COR-2026-98765"
                )
                
                if exito:
                    print(f"   ✅ ¡Correo enviado con éxito desde el perfil '{nombre}'!")
                else:
                    print(f"   ❌ Falló el envío del correo (revisar logs de arriba para detalles del error SMTP).")
            except Exception as e:
                print(f"   ❌ Excepción al intentar enviar correo: {e}")
                
    print(f"\n=== PRUEBAS DE ENVÍO FINALIZADAS ===")

if __name__ == "__main__":
    # Validar argumentos
    if len(sys.argv) < 2:
        print("Uso:")
        print("  venv\\Scripts\\python.exe test_send_email.py <correo_destinatario> [empresa_id]")
        print("\nEjemplos:")
        print("  # Probar con todas las empresas configuradas y fallback:")
        print("  venv\\Scripts\\python.exe test_send_email.py correo@ejemplo.com")
        print("\n  # Probar únicamente con la empresa ID 3 (EBL):")
        print("  venv\\Scripts\\python.exe test_send_email.py correo@ejemplo.com 3")
        sys.exit(1)
        
    correo_destino = sys.argv[1]
    empresa_id_filtro = None
    
    if len(sys.argv) >= 3:
        try:
            empresa_id_filtro = int(sys.argv[2])
        except ValueError:
            print("Error: El segundo parámetro (empresa_id) debe ser un número entero.")
            sys.exit(1)
            
    asyncio.run(run_test_email(correo_destino, empresa_id_filtro))
