"""
🔧 SCRIPT TEMPORAL — REPORTE DE USO DEL BUZÓN
Genera un archivo Excel con 4 hojas:
  1. CIERRES: Leads con estado CIERRE en el rango 01/Mar - 20/Abr
  2. COTIZACIONES: Leads con estado COTIZADO en el rango
  3. DESCARTES: Resumen agrupado por motivo con porcentaje
  4. TRAZABILIDAD: Timeline completo de cada lead (recepción → asignación → gestión → cierre/descarte)

Uso:
  cd sgi-backend
  pip install pyodbc pandas openpyxl    (si no los tienes)
  python reporte_buzon_temporal.py

Eliminar este archivo después de usarlo.
"""

import pyodbc
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
import os

# ── Cargar .env ───────────────────────────────────────────────────────────────
load_dotenv()

DB_SERVER = os.getenv("DB_SERVER", "LAPTOP-IEAJKMJP")
DB_NAME = os.getenv("DB_NAME", "SGI_GrupoCorban")
DB_USER = os.getenv("DB_USER", "UsuarioGeneral")
DB_PASS = os.getenv("DB_PASS", "")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")

# ── Rango de fechas ──────────────────────────────────────────────────────────
FECHA_DESDE = "2026-03-01"
FECHA_HASTA = "2026-04-20 23:59:59"

# ── Conexión ─────────────────────────────────────────────────────────────────
conn_str = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_SERVER};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASS};"
    f"TrustServerCertificate=yes;"
)
conn = pyodbc.connect(conn_str)

print(f"✅ Conectado a {DB_NAME} en {DB_SERVER}")
print(f"📅 Rango: {FECHA_DESDE}  →  {FECHA_HASTA}\n")


# ═══════════════════════════════════════════════════════════════════════════════
# 1. CIERRES
# ═══════════════════════════════════════════════════════════════════════════════
sql_cierres = """
SELECT
    i.id                            AS lead_id,
    i.telefono                      AS telefono_lead,
    i.nombre_whatsapp               AS nombre_whatsapp,
    i.tipo_interes                  AS tipo_interes,
    i.fecha_recepcion               AS fecha_recepcion,
    i.fecha_asignacion              AS fecha_asignacion,
    i.fecha_gestion                 AS fecha_cierre,
    
    -- Comercial asignado
    CONCAT(e.nombres, ' ', e.apellido_paterno)  AS cerrado_por,
    
    -- Cliente vinculado (si existe)
    c.razon_social                  AS cliente_razon_social,
    c.ruc                           AS cliente_ruc,
    c.tipo_estado                   AS estado_cliente,
    
    -- Tiempo de respuesta
    i.tiempo_respuesta_segundos     AS tiempo_respuesta_seg,
    CASE 
        WHEN i.tiempo_respuesta_segundos IS NOT NULL 
        THEN CAST(i.tiempo_respuesta_segundos / 60.0 AS DECIMAL(10,1))
        ELSE NULL
    END                             AS tiempo_respuesta_min

FROM comercial.inbox i
LEFT JOIN seg.usuarios u ON u.id = i.asignado_a
LEFT JOIN adm.empleados e ON e.id = u.empleado_id
LEFT JOIN comercial.clientes c ON c.inbox_origen_id = i.id

WHERE i.estado = 'CIERRE'
  AND i.fecha_recepcion BETWEEN ? AND ?

ORDER BY i.fecha_gestion DESC
"""

df_cierres = pd.read_sql(sql_cierres, conn, params=[FECHA_DESDE, FECHA_HASTA])
print(f"🏆 CIERRES encontrados: {len(df_cierres)}")
for _, row in df_cierres.iterrows():
    cliente = row['cliente_razon_social'] or 'Sin vincular'
    print(f"   • Lead #{row['lead_id']} | {row['nombre_whatsapp'] or row['telefono_lead']} → {cliente} | Cerrado por: {row['cerrado_por']}")


# ═══════════════════════════════════════════════════════════════════════════════
# 2. COTIZACIONES
# ═══════════════════════════════════════════════════════════════════════════════
sql_cotizaciones = """
SELECT
    i.id                            AS lead_id,
    i.telefono                      AS telefono_contacto,
    i.nombre_whatsapp               AS nombre_whatsapp,
    i.tipo_interes                  AS tipo_interes,
    i.mensaje_inicial               AS mensaje_inicial,
    i.fecha_recepcion               AS fecha_recepcion,
    i.fecha_asignacion              AS fecha_asignacion,
    i.fecha_primera_respuesta       AS fecha_primera_respuesta,
    
    -- Fecha aproximada de cotización (fecha_gestion o ultima actualización)
    COALESCE(i.fecha_gestion, i.ultimo_mensaje_at)  AS fecha_cotizacion_aprox,
    
    -- Comercial que cotizó
    CONCAT(e.nombres, ' ', e.apellido_paterno)  AS cotizado_por,
    
    -- Escalado?
    i.escalado_a_directo            AS escalado_directo,
    i.fecha_escalacion              AS fecha_escalacion,
    
    -- Tiempo de respuesta
    i.tiempo_respuesta_segundos     AS tiempo_respuesta_seg,
    CASE 
        WHEN i.tiempo_respuesta_segundos IS NOT NULL 
        THEN CAST(i.tiempo_respuesta_segundos / 60.0 AS DECIMAL(10,1))
        ELSE NULL
    END                             AS tiempo_respuesta_min

FROM comercial.inbox i
LEFT JOIN seg.usuarios u ON u.id = i.asignado_a
LEFT JOIN adm.empleados e ON e.id = u.empleado_id

WHERE i.estado = 'COTIZADO'
  AND i.fecha_recepcion BETWEEN ? AND ?

ORDER BY i.fecha_recepcion DESC
"""

df_cotizaciones = pd.read_sql(sql_cotizaciones, conn, params=[FECHA_DESDE, FECHA_HASTA])
print(f"\n📋 COTIZACIONES encontradas: {len(df_cotizaciones)}")
for _, row in df_cotizaciones.iterrows():
    print(f"   • Lead #{row['lead_id']} | {row['nombre_whatsapp'] or row['telefono_contacto']} | Cotizado por: {row['cotizado_por']} | Tel: {row['telefono_contacto']}")


# ═══════════════════════════════════════════════════════════════════════════════
# 3. DESCARTES AGRUPADOS POR MOTIVO
# ═══════════════════════════════════════════════════════════════════════════════
sql_descartes = """
SELECT
    ISNULL(i.motivo_descarte, 'Sin especificar')  AS motivo,
    COUNT(*)                                       AS cantidad

FROM comercial.inbox i

WHERE i.estado = 'DESCARTADO'
  AND i.fecha_recepcion BETWEEN ? AND ?

GROUP BY i.motivo_descarte
ORDER BY COUNT(*) DESC
"""

df_descartes = pd.read_sql(sql_descartes, conn, params=[FECHA_DESDE, FECHA_HASTA])

# Calcular porcentaje
total_descartados = df_descartes['cantidad'].sum()
df_descartes['porcentaje'] = df_descartes['cantidad'].apply(
    lambda x: round(x / total_descartados * 100, 1) if total_descartados > 0 else 0
)

print(f"\n❌ DESCARTES agrupados ({total_descartados} total):")
for _, row in df_descartes.iterrows():
    print(f"   • {row['motivo']}: {row['cantidad']} ({row['porcentaje']}%)")

# --- Detalle de descartes (hoja adicional) ---
sql_descartes_detalle = """
SELECT
    i.id                            AS lead_id,
    i.telefono                      AS telefono,
    i.nombre_whatsapp               AS nombre_whatsapp,
    i.tipo_interes                  AS tipo_interes,
    i.fecha_recepcion               AS fecha_recepcion,
    i.fecha_gestion                 AS fecha_descarte,
    ISNULL(i.motivo_descarte, 'Sin especificar') AS motivo,
    i.comentario_descarte           AS comentario,
    CONCAT(e.nombres, ' ', e.apellido_paterno)  AS descartado_por

FROM comercial.inbox i
LEFT JOIN seg.usuarios u ON u.id = i.asignado_a
LEFT JOIN adm.empleados e ON e.id = u.empleado_id

WHERE i.estado = 'DESCARTADO'
  AND i.fecha_recepcion BETWEEN ? AND ?

ORDER BY i.fecha_gestion DESC
"""

df_descartes_detalle = pd.read_sql(sql_descartes_detalle, conn, params=[FECHA_DESDE, FECHA_HASTA])


# ═══════════════════════════════════════════════════════════════════════════════
# 4. TRAZABILIDAD — Timeline completo de cada lead
# ═══════════════════════════════════════════════════════════════════════════════
sql_trazabilidad = """
SELECT
    i.id                            AS lead_id,
    i.telefono                      AS telefono,
    i.nombre_whatsapp               AS nombre_whatsapp,
    i.tipo_interes                  AS tipo_interes,
    i.estado                        AS estado_actual,
    i.modo                          AS modo_actual,
    
    -- Timeline
    i.fecha_recepcion               AS [1_recepcion],
    i.fecha_asignacion              AS [2_asignacion],
    i.fecha_primera_respuesta       AS [3_primera_respuesta],
    i.fecha_gestion                 AS [4_gestion_cierre],
    i.fecha_escalacion              AS [5_escalacion],
    
    -- Comercial
    CONCAT(e.nombres, ' ', e.apellido_paterno)  AS asignado_a,
    
    -- Métricas
    i.tiempo_respuesta_segundos     AS tiempo_respuesta_seg,
    CASE 
        WHEN i.tiempo_respuesta_segundos IS NOT NULL 
        THEN CAST(i.tiempo_respuesta_segundos / 60.0 AS DECIMAL(10,1))
        ELSE NULL
    END                             AS tiempo_respuesta_min,
    i.escalado_a_directo            AS escalado,
    
    -- Descarte (si aplica)
    i.motivo_descarte               AS motivo_descarte,
    i.comentario_descarte           AS comentario_descarte,
    
    -- Cliente vinculado
    c.razon_social                  AS cliente_vinculado,
    c.ruc                           AS ruc_cliente,
    c.tipo_estado                   AS estado_pipeline,
    
    -- Mensajes
    (SELECT COUNT(*) FROM comercial.chat_messages cm WHERE cm.inbox_id = i.id AND cm.direccion = 'ENTRANTE')  AS msgs_entrantes,
    (SELECT COUNT(*) FROM comercial.chat_messages cm WHERE cm.inbox_id = i.id AND cm.direccion = 'SALIENTE' AND cm.remitente_tipo = 'COMERCIAL') AS msgs_comercial,
    (SELECT COUNT(*) FROM comercial.chat_messages cm WHERE cm.inbox_id = i.id AND cm.direccion = 'SALIENTE' AND cm.remitente_tipo = 'BOT')       AS msgs_bot,
    
    -- Duración total del ciclo (en horas)
    CASE 
        WHEN i.fecha_gestion IS NOT NULL AND i.fecha_recepcion IS NOT NULL
        THEN CAST(DATEDIFF(MINUTE, i.fecha_recepcion, i.fecha_gestion) / 60.0 AS DECIMAL(10,1))
        ELSE NULL
    END                             AS duracion_ciclo_horas

FROM comercial.inbox i
LEFT JOIN seg.usuarios u ON u.id = i.asignado_a
LEFT JOIN adm.empleados e ON e.id = u.empleado_id
LEFT JOIN comercial.clientes c ON c.inbox_origen_id = i.id

WHERE i.fecha_recepcion BETWEEN ? AND ?

ORDER BY i.fecha_recepcion ASC
"""

df_trazabilidad = pd.read_sql(sql_trazabilidad, conn, params=[FECHA_DESDE, FECHA_HASTA])
print(f"\n📊 TRAZABILIDAD: {len(df_trazabilidad)} leads en total en el rango")

# Resumen rápido de estados
if len(df_trazabilidad) > 0:
    resumen = df_trazabilidad['estado_actual'].value_counts()
    print("\n   Distribución de estados:")
    for estado, count in resumen.items():
        pct = round(count / len(df_trazabilidad) * 100, 1)
        print(f"   • {estado}: {count} ({pct}%)")


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTAR A EXCEL
# ═══════════════════════════════════════════════════════════════════════════════
timestamp = datetime.now().strftime("%Y%m%d_%H%M")
filename = f"reporte_buzon_{timestamp}.xlsx"

with pd.ExcelWriter(filename, engine='openpyxl') as writer:
    # Hoja 1: Cierres
    df_cierres.to_excel(writer, sheet_name='Cierres', index=False)
    
    # Hoja 2: Cotizaciones
    df_cotizaciones.to_excel(writer, sheet_name='Cotizaciones', index=False)
    
    # Hoja 3: Descartes - Resumen
    df_descartes.to_excel(writer, sheet_name='Descartes_Resumen', index=False)
    
    # Hoja 4: Descartes - Detalle
    df_descartes_detalle.to_excel(writer, sheet_name='Descartes_Detalle', index=False)
    
    # Hoja 5: Trazabilidad completa
    df_trazabilidad.to_excel(writer, sheet_name='Trazabilidad', index=False)
    
    # Ajustar ancho de columnas
    for sheet_name in writer.sheets:
        worksheet = writer.sheets[sheet_name]
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width

conn.close()

print(f"\n✅ Reporte exportado: {filename}")
print("🗑️  Recuerda eliminar este script (reporte_buzon_temporal.py) cuando ya no lo necesites.")
