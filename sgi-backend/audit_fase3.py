"""
Script de Auditoria - Fase 3 Normalizacion Comercial
Verifica que la estructura de la base de datos coincide con lo esperado.
"""
import asyncio
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, ".")

from app.database.db_connection import AsyncSessionLocal
from sqlalchemy import text

# ===========================================
# DEFINICIÓN DE LO ESPERADO
# ===========================================

CATALOGOS_ESPERADOS = {
    "comercial.estado_cliente": ["PROSPECTO", "EN_NEGOCIACION", "CERRADA", "EN_OPERACION", "CARGA_ENTREGADA", "CAIDO", "INACTIVO"],
    "comercial.origen_cliente": ["BASE_DATOS", "PUBLICIDAD_META", "CARTERA_PROPIA", "WHATSAPP", "REFERIDO", "OTRO"],
    "comercial.medio_gestion": ["Llamada", "WhatsApp", "Correo"],
    "comercial.motivo_gestion": ["DUDAS_CLIENTE", "FIDELIZACION", "QUIERE_COTIZACION", "SEGUIMIENTO_CARGA"],
    "comercial.estado_contacto": ["DISPONIBLE", "ASIGNADO", "EN_GESTION", "GESTIONADO"],
    "comercial.estado_cita": ["PENDIENTE", "APROBADO", "RECHAZADO", "TERMINADO"],
    "comercial.motivo_descarte_inbox": ["No responde", "Solo consulta", "No realizamos su requerimiento", "Spam / Bot", "Duplicado"],
}

# Tablas y las columnas que DEBEN existir
COLUMNAS_ESPERADAS = {
    "comercial.clientes": [
        "id", "ruc", "razon_social", "estado_id", "origen_id", "comercial_encargado_id",
        "distrito_id", "direccion", "is_active", "proxima_fecha_contacto",
        "observacion", "created_at", "updated_at", "created_by", "updated_by"
    ],
    "comercial.cliente_gestiones": [
        "id", "cliente_id", "medio_id", "motivo_id", "detalle", "created_at"
    ],
    "comercial.cliente_contactos": [
        "estado_id"
    ],
    "comercial.historial_llamadas": [
        "id", "contacto_id", "comercial_id", "caso_id", "comentario", "estado_id", "created_at"
    ],
    "comercial.cliente_historial": [
        "id", "cliente_id", "estado_anterior_id", "estado_nuevo_id", "motivo", "created_at", "created_by"
    ],
    "comercial.citas": [
        "id", "estado_id", "is_confirmado", "observacion", "created_by", "updated_by"
    ],
    "comercial.inbox": [
        "id", "tipo_asignacion", "motivo_descarte_id"
    ],
}

# Columnas que NO deben existir (fueron eliminadas)
COLUMNAS_ELIMINADAS = {
    "comercial.clientes": [
        "tipo_estado", "origen", "sub_origen", "nombre_comercial", "area_encargada_id",
        "ultimo_contacto", "comentario_ultima_llamada", "motivo_perdida", "fecha_perdida",
        "fecha_reactivacion", "motivo_caida", "fecha_caida", "fecha_seguimiento_caida",
        "fecha_primer_contacto", "fecha_conversion_cliente", "inbox_origen_id"
    ],
    "comercial.cliente_gestiones": [
        "comercial_id", "tipo", "resultado", "proxima_fecha_contacto"
    ],
    "comercial.historial_llamadas": [
        "ruc", "fecha_llamada"
    ],
    "comercial.cliente_historial": [
        "estado_anterior", "estado_nuevo", "origen_cambio"
    ],
    "comercial.citas": [
        "estado", "tipo_agenda", "objetivo_campo", "motivo_rechazo", "conductor_id"
    ],
    "comercial.inbox": [
        "tiempo_respuesta_segundos", "fecha_primera_respuesta", "motivo_descarte"
    ],
}

# FKs esperadas
FKS_ESPERADAS = [
    "FK_clientes_estado",
    "FK_clientes_origen",
    "FK_clientes_distrito",
    "FK_clientes_comercial",
    "FK_clientes_created_by",
    "FK_clientes_updated_by",
    "FK_gestiones_medio",
    "FK_gestiones_motivo",
    "FK_contactos_estado",
    "FK_hist_llamadas_estado",
    "FK_hist_estado_anterior",
    "FK_hist_estado_nuevo",
    "FK_citas_estado",
    "FK_citas_created_by",
    "FK_citas_updated_by",
    "FK_inbox_motivo_descarte",
]

# Índices esperados
INDICES_ESPERADOS = [
    "IX_clientes_ruc",
    "IX_clientes_comercial",
    "IX_clientes_estado",
    "IX_contactos_ruc",
    "IX_contactos_telefono",
    "IX_contactos_estado",
    "IX_chat_messages_inbox",
    "IX_inbox_telefono",
    "IX_inbox_estado",
    "IX_hist_llamadas_contacto",
    "IX_reg_import_ruc",
    "IX_citas_comercial",
    "IX_citas_estado",
]

# Tablas que deben haber sido eliminadas
TABLAS_ELIMINADAS = [
    "comercial.clientes_old",
    "comercial.cita_comerciales",
]


async def main():
    print("=" * 70)
    print("  AUDITORÍA FASE 3 — NORMALIZACIÓN SCHEMA COMERCIAL")
    print("=" * 70)
    
    errores = []
    advertencias = []
    ok_count = 0

    async with AsyncSessionLocal() as db:
        # ========================================
        # 1. VERIFICAR CATÁLOGOS
        # ========================================
        print("\n📋 1. VERIFICANDO CATÁLOGOS...")
        for tabla, valores_esperados in CATALOGOS_ESPERADOS.items():
            result = await db.execute(text(f"SELECT nombre FROM {tabla} ORDER BY id"))
            valores_db = [row[0] for row in result.all()]
            
            if set(valores_esperados).issubset(set(valores_db)):
                print(f"   ✅ {tabla}: {len(valores_db)} registros OK")
                ok_count += 1
            else:
                faltantes = set(valores_esperados) - set(valores_db)
                msg = f"{tabla}: Faltan valores: {faltantes}"
                errores.append(msg)
                print(f"   ❌ {msg}")

        # ========================================
        # 2. VERIFICAR COLUMNAS EXISTENTES
        # ========================================
        print("\n📋 2. VERIFICANDO COLUMNAS QUE DEBEN EXISTIR...")
        for tabla, columnas in COLUMNAS_ESPERADAS.items():
            schema, table_name = tabla.split(".")
            result = await db.execute(text(f"""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table_name
            """), {"schema": schema, "table_name": table_name})
            columnas_db = {row[0] for row in result.all()}
            
            faltantes = [c for c in columnas if c not in columnas_db]
            if not faltantes:
                print(f"   ✅ {tabla}: Todas las columnas esperadas presentes")
                ok_count += 1
            else:
                msg = f"{tabla}: Faltan columnas: {faltantes}"
                errores.append(msg)
                print(f"   ❌ {msg}")

        # ========================================
        # 3. VERIFICAR COLUMNAS ELIMINADAS
        # ========================================
        print("\n📋 3. VERIFICANDO COLUMNAS QUE DEBEN HABER SIDO ELIMINADAS...")
        for tabla, columnas in COLUMNAS_ELIMINADAS.items():
            schema, table_name = tabla.split(".")
            result = await db.execute(text(f"""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table_name
            """), {"schema": schema, "table_name": table_name})
            columnas_db = {row[0] for row in result.all()}
            
            sobrevivientes = [c for c in columnas if c in columnas_db]
            if not sobrevivientes:
                print(f"   ✅ {tabla}: Columnas legacy eliminadas correctamente")
                ok_count += 1
            else:
                msg = f"{tabla}: Columnas que aún existen y deberían haberse eliminado: {sobrevivientes}"
                errores.append(msg)
                print(f"   ❌ {msg}")

        # ========================================
        # 4. VERIFICAR FOREIGN KEYS
        # ========================================
        print("\n📋 4. VERIFICANDO FOREIGN KEYS...")
        result = await db.execute(text("""
            SELECT name FROM sys.foreign_keys 
            WHERE SCHEMA_NAME(schema_id) = 'comercial'
        """))
        fks_db = {row[0] for row in result.all()}
        
        for fk in FKS_ESPERADAS:
            if fk in fks_db:
                print(f"   ✅ {fk}")
                ok_count += 1
            else:
                msg = f"FK faltante: {fk}"
                errores.append(msg)
                print(f"   ❌ {msg}")

        # ========================================
        # 5. VERIFICAR ÍNDICES
        # ========================================
        print("\n📋 5. VERIFICANDO ÍNDICES DE RENDIMIENTO...")
        result = await db.execute(text("""
            SELECT i.name 
            FROM sys.indexes i
            JOIN sys.objects o ON i.object_id = o.object_id
            WHERE SCHEMA_NAME(o.schema_id) = 'comercial'
            AND i.name IS NOT NULL
        """))
        indices_db = {row[0] for row in result.all()}
        
        for idx in INDICES_ESPERADOS:
            if idx in indices_db:
                print(f"   ✅ {idx}")
                ok_count += 1
            else:
                msg = f"Índice faltante: {idx}"
                advertencias.append(msg)
                print(f"   ⚠️  {msg}")

        # ========================================
        # 6. VERIFICAR TABLAS ELIMINADAS
        # ========================================
        print("\n📋 6. VERIFICANDO TABLAS OBSOLETAS ELIMINADAS...")
        for tabla in TABLAS_ELIMINADAS:
            result = await db.execute(text(f"SELECT OBJECT_ID(:tabla)"), {"tabla": tabla})
            exists = result.scalar()
            if exists is None:
                print(f"   ✅ {tabla}: Eliminada correctamente")
                ok_count += 1
            else:
                msg = f"{tabla}: AÚN EXISTE, debería haber sido eliminada"
                advertencias.append(msg)
                print(f"   ⚠️  {msg}")

        # ========================================
        # 7. VERIFICAR DATOS MIGRADOS
        # ========================================
        print("\n📋 7. VERIFICANDO INTEGRIDAD DE DATOS MIGRADOS...")
        
        # Clientes sin estado_id
        result = await db.execute(text("SELECT COUNT(*) FROM comercial.clientes WHERE estado_id IS NULL"))
        sin_estado = result.scalar()
        if sin_estado == 0:
            print(f"   ✅ Clientes: Todos tienen estado_id asignado")
            ok_count += 1
        else:
            msg = f"Clientes sin estado_id: {sin_estado}"
            errores.append(msg)
            print(f"   ❌ {msg}")

        # Contactos sin estado_id
        result = await db.execute(text("SELECT COUNT(*) FROM comercial.cliente_contactos WHERE estado_id IS NULL"))
        sin_estado_contacto = result.scalar()
        if sin_estado_contacto == 0:
            print(f"   ✅ Contactos: Todos tienen estado_id asignado")
            ok_count += 1
        else:
            msg = f"Contactos sin estado_id: {sin_estado_contacto}"
            errores.append(msg)
            print(f"   ❌ {msg}")

        # Citas sin estado_id
        result = await db.execute(text("SELECT COUNT(*) FROM comercial.citas WHERE estado_id IS NULL"))
        sin_estado_cita = result.scalar()
        if sin_estado_cita == 0:
            print(f"   ✅ Citas: Todas tienen estado_id asignado")
            ok_count += 1
        else:
            msg = f"Citas sin estado_id: {sin_estado_cita}"
            advertencias.append(msg)
            print(f"   ⚠️  {msg}")

    # ========================================
    # RESUMEN FINAL
    # ========================================
    print("\n" + "=" * 70)
    print("  RESUMEN DE AUDITORÍA")
    print("=" * 70)
    print(f"   ✅ Verificaciones OK:     {ok_count}")
    print(f"   ⚠️  Advertencias:         {len(advertencias)}")
    print(f"   ❌ Errores críticos:      {len(errores)}")
    
    if errores:
        print("\n   🔴 ERRORES QUE REQUIEREN ACCIÓN:")
        for e in errores:
            print(f"      → {e}")
    
    if advertencias:
        print("\n   🟡 ADVERTENCIAS (no bloqueantes):")
        for a in advertencias:
            print(f"      → {a}")

    if not errores and not advertencias:
        print("\n   🎉 ¡MIGRACIÓN COMPLETADA SIN PROBLEMAS!")
    elif not errores:
        print("\n   ✅ Sin errores críticos. Las advertencias no bloquean la operación.")
    else:
        print("\n   ⛔ Se encontraron errores críticos. Revisar y corregir antes de continuar.")


if __name__ == "__main__":
    asyncio.run(main())
