"""Test the asistencia processing on each file to find which causes the 400."""
import pandas as pd
import io
import sys
sys.path.insert(0, '.')

from app.services.asistencia_service import procesar_excel_asistencia

for fname in [
    r"C:\Users\egobu\Desktop\reporte_507.xls",
    r"C:\Users\egobu\Desktop\1_StandardReport.xls",
    r"C:\Users\egobu\Desktop\reporte_508.xls",
]:
    print(f"\n{'='*60}")
    print(f"Testing: {fname}")
    try:
        with open(fname, 'rb') as f:
            contenido = f.read()
        print(f"  File size: {len(contenido)} bytes")
        resultado = procesar_excel_asistencia(contenido, "08:10")
        print(f"  SUCCESS: {resultado.total_empleados} empleados, {resultado.total_con_tardanzas} con tardanzas")
        for emp in resultado.empleados:
            print(f"    - {emp.nombre}: {emp.total_tardanzas} tardanzas")
    except Exception as e:
        print(f"  ERROR: {type(e).__name__}: {e}")
