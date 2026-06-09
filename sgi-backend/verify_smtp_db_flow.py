import asyncio
import sys
from sqlalchemy import select
from app.database.db_connection import AsyncSessionLocal
from app.models.core import Empresa
from app.models.comercial import Cliente, ClienteContacto
from app.models.seguimiento import Seguimiento
from app.services.comercial.email_service import EmailService

async def test_smtp_db_flow():
    print("=== INICIANDO VERIFICACIÓN DE CONFIGURACIÓN SMTP EN LA BASE DE DATOS ===")
    
    async with AsyncSessionLocal() as db:
        # 1. Verificar Empresas
        try:
            print("\n1. Consultando empresas en core.empresas...")
            stmt = select(Empresa)
            result = await db.execute(stmt)
            empresas = result.scalars().all()
            
            if not empresas:
                print("⚠️ No se encontraron empresas registradas en la tabla core.empresas.")
            else:
                for emp in empresas:
                    print(f"   - ID: {emp.id} | Razón Social: {emp.razon_social} | RUC: {emp.ruc}")
                    print(f"     SMTP Host: {emp.smtp_host}")
                    print(f"     SMTP Port: {emp.smtp_port}")
                    print(f"     SMTP User: {emp.smtp_user}")
                    print(f"     SMTP Pass: {'*****' if emp.smtp_password else 'None'}")
                    print(f"     SMTP Sender: {emp.smtp_sender}")
        except Exception as e:
            print(f"❌ Error al consultar la tabla core.empresas: {e}")
            sys.exit(1)

        # 2. Verificar Resolución SMTP en EmailService
        try:
            print("\n2. Probando resolución SMTP en EmailService...")
            email_svc = EmailService(db)
            
            # Probar para cada empresa registrada
            for emp in empresas:
                smtp_config, empresa_nombre = await email_svc._resolve_empresa_smtp(emp.id)
                print(f"   [Empresa ID {emp.id}] -> Nombre resuelto: '{empresa_nombre}'")
                print(f"     Host: {smtp_config.get('host')}")
                print(f"     Port: {smtp_config.get('port')}")
                print(f"     User: {smtp_config.get('user')}")
                print(f"     Sender: {smtp_config.get('sender')}")
                print(f"     Password configurada: {bool(smtp_config.get('password'))}")
                
            # Probar Fallback
            print("\n3. Probando fallback de EmailService (empresa_id = None o inexistente)...")
            smtp_config, empresa_nombre = await email_svc._resolve_empresa_smtp(None)
            print(f"   [Fallback/None] -> Nombre resuelto: '{empresa_nombre}'")
            print(f"     Host: {smtp_config.get('host')}")
            print(f"     Port: {smtp_config.get('port')}")
            print(f"     User: {smtp_config.get('user')}")
            print(f"     Sender: {smtp_config.get('sender')}")
        except Exception as e:
            print(f"❌ Error al resolver configuración SMTP: {e}")
            sys.exit(1)

        # 3. Verificar Seguimientos en EN_OPERACION
        try:
            print("\n4. Consultando seguimientos en estado EN_OPERACION...")
            stmt_seg = select(Seguimiento).where(Seguimiento.estado == "EN_OPERACION")
            result_seg = await db.execute(stmt_seg)
            seguimientos = result_seg.scalars().all()
            
            if not seguimientos:
                print("ℹ️ No hay seguimientos activos en estado EN_OPERACION.")
            else:
                print(f"   Se encontraron {len(seguimientos)} seguimientos en EN_OPERACION:")
                for seg in seguimientos[:5]: # Mostrar max 5
                    # Obtener cliente y comercial
                    empresa_id = None
                    if seg.cliente:
                        empresa_id = seg.cliente.empresa_id
                    if not empresa_id and seg.comercial and seg.comercial.empleado:
                        empresa_id = seg.comercial.empleado.empresa_id
                        
                    print(f"   - Seguimiento ID: {seg.id} | Título: '{seg.titulo}'")
                    print(f"     Cliente: '{seg.cliente_razon_social}' (Empresa ID: {seg.cliente.empresa_id if seg.cliente else 'Sin Cliente'})")
                    print(f"     Comercial: '{seg.comercial_nombre}' (Empresa ID: {seg.comercial.empleado.empresa_id if seg.comercial and seg.comercial.empleado else 'Sin Empleado'})")
                    print(f"     Empresa ID resuelto para SMTP: {empresa_id}")
        except Exception as e:
            print(f"❌ Error al consultar seguimientos: {e}")
            
    print("\n=== VERIFICACIÓN COMPLETADA ===")

if __name__ == "__main__":
    asyncio.run(test_smtp_db_flow())
