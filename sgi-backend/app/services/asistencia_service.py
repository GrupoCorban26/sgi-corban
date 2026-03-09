"""
Servicio de procesamiento de reportes de asistencia.
Lee un archivo Excel de asistencia, identifica tardanzas y genera reportes.
"""

import io
import logging
import re
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

import pandas as pd
from fastapi import HTTPException

from app.schemas.asistencia import (
    AsistenciaReporteResponse,
    TardanzaDia,
    TardanzaEmpleado,
)

logger = logging.getLogger(__name__)


def _separar_tiempos(celda: str) -> List[str]:
    """
    Separa tiempos pegados en una celda.
    Ej: '08:1518:05' → ['08:15', '18:05']
    Ej: '08:15' → ['08:15']
    Ej: '10:20' → ['10:20']
    """
    if not celda or not isinstance(celda, str):
        return []

    celda = celda.strip()
    if not celda:
        return []

    # Buscar todos los patrones HH:MM en la celda
    patron = re.compile(r'(\d{1,2}:\d{2})')
    coincidencias = patron.findall(celda)

    return coincidencias


def _obtener_hora_entrada(tiempos: List[str]) -> Optional[str]:
    """
    De una lista de tiempos (entrada/salida), retorna el menor (la hora de entrada).
    Filtra tiempos entre 00:00 y 23:59 válidos.
    """
    if not tiempos:
        return None

    horas_validas = []
    for t in tiempos:
        try:
            partes = t.split(":")
            hora = int(partes[0])
            minuto = int(partes[1])
            if 0 <= hora <= 23 and 0 <= minuto <= 59:
                horas_validas.append(t)
        except (ValueError, IndexError):
            continue

    if not horas_validas:
        return None

    # Retornar la hora más temprana (la entrada)
    return min(horas_validas, key=lambda x: (int(x.split(":")[0]), int(x.split(":")[1])))


def _obtener_hora_salida(tiempos: List[str]) -> Optional[str]:
    """
    De una lista de tiempos (entrada/salida), retorna el mayor (la hora de salida).
    """
    if not tiempos:
        return None

    horas_validas = []
    for t in tiempos:
        try:
            partes = t.split(":")
            hora = int(partes[0])
            minuto = int(partes[1])
            if 0 <= hora <= 23 and 0 <= minuto <= 59:
                horas_validas.append(t)
        except (ValueError, IndexError):
            continue

    if not horas_validas:
        return None

    # Si hay solo un tiempo válido, asumimos que no hay salida registrada
    if len(horas_validas) == 1:
        return None

    # Retornar la hora más tardía (la salida)
    return max(horas_validas, key=lambda x: (int(x.split(":")[0]), int(x.split(":")[1])))


def _calcular_minutos_trabajados(hora_entrada: str, hora_salida: Optional[str]) -> int:
    """Calcula los minutos de trabajo entre la entrada y la salida."""
    if not hora_salida:
        return 0
    try:
        entrada = datetime.strptime(hora_entrada, "%H:%M")
        salida = datetime.strptime(hora_salida, "%H:%M")
        if salida > entrada:
            return int((salida - entrada).total_seconds() / 60)
        return 0
    except ValueError:
        return 0



def _calcular_minutos_tarde(hora_entrada: str, hora_corte: str) -> int:
    """
    Calcula los minutos de tardanza comparando hora_entrada vs hora_corte.
    Retorna 0 si llegó a tiempo, o los minutos de retraso si llegó tarde.
    """
    try:
        entrada = datetime.strptime(hora_entrada, "%H:%M")
        corte = datetime.strptime(hora_corte, "%H:%M")

        if entrada > corte:
            diferencia = entrada - corte
            return int(diferencia.total_seconds() / 60)
        return 0
    except ValueError:
        return 0


def _extraer_periodo(df: pd.DataFrame) -> str:
    """
    Busca la fila que contiene 'Periodo:' y extrae el rango de fechas.
    """
    for idx_fila in range(min(5, len(df))):
        for idx_col in range(min(5, len(df.columns))):
            valor = str(df.iloc[idx_fila, idx_col]).strip()
            if "periodo" in valor.lower():
                # Buscar el valor del periodo en las columnas siguientes
                for col_siguiente in range(idx_col + 1, len(df.columns)):
                    val = str(df.iloc[idx_fila, col_siguiente]).strip()
                    if val and val != "nan":
                        return val
                # Si no lo encuentra en otra columna, puede estar en el mismo valor
                if "~" in valor or "-" in valor:
                    return valor.replace("Periodo:", "").strip()

    return "No identificado"


def _extraer_dias_columnas(df: pd.DataFrame) -> List[int]:
    """
    Identifica la fila de encabezados con números de día (1, 2, 3, ...) y retorna los dias.
    """
    for idx_fila in range(min(8, len(df))):
        numeros = []
        for idx_col in range(len(df.columns)):
            val = df.iloc[idx_fila, idx_col]
            try:
                num = int(float(val))
                if 1 <= num <= 31:
                    numeros.append((idx_col, num))
            except (ValueError, TypeError):
                continue

        # Si encontramos al menos 5 números consecutivos, es la fila de días
        if len(numeros) >= 5:
            return numeros

    return []


def procesar_excel_asistencia(contenido: bytes, hora_corte: str = "08:10") -> AsistenciaReporteResponse:
    """
    Procesa un archivo Excel de reporte de asistencia y calcula las tardanzas.

    Args:
        contenido: Bytes del archivo Excel.
        hora_corte: Hora de corte para considerar tardanza (formato HH:MM).

    Returns:
        AsistenciaReporteResponse con los resultados.
    """
    # Validar formato de hora_corte
    try:
        datetime.strptime(hora_corte, "%H:%M")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"El formato de hora_corte '{hora_corte}' es inválido. Use formato HH:MM (ej: '08:10')"
        )

    # Intentar leer el archivo Excel
    try:
        archivo = io.BytesIO(contenido)
        # Intentar detectar la hoja correcta, priorizando 'Reporte de Asistencia'
        xl = pd.ExcelFile(archivo)
        hoja_objetivo = None

        # Primera pasada: Buscar el nombre exacto sugerido
        for nombre_hoja in xl.sheet_names:
            if nombre_hoja.strip().lower() == "reporte de asistencia":
                hoja_objetivo = nombre_hoja
                break
        
        # Segunda pasada: Si no existe, buscar alguna que tenga "asistencia"
        if not hoja_objetivo:
            for nombre_hoja in xl.sheet_names:
                if "asistencia" in nombre_hoja.lower():
                    hoja_objetivo = nombre_hoja
                    break

        # Tercera pasada: Validar el último recurso genérico
        if not hoja_objetivo:
            for nombre_hoja in xl.sheet_names:
                if "reporte" in nombre_hoja.lower():
                    hoja_objetivo = nombre_hoja
                    break

        # Si no encuentra por nombre, usar la primera hoja
        if hoja_objetivo is None:
            if len(xl.sheet_names) > 0:
                hoja_objetivo = xl.sheet_names[0]
                logger.warning(f"No se encontró hoja objetivo. Usando primera hoja: '{hoja_objetivo}'")
            else:
                raise HTTPException(status_code=400, detail="El archivo Excel no contiene hojas")

        df = pd.read_excel(archivo, sheet_name=hoja_objetivo, header=None)
        logger.info(f"Excel leído correctamente. Hoja: '{hoja_objetivo}', Filas: {len(df)}, Columnas: {len(df.columns)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al leer archivo Excel: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo leer el archivo. Asegúrese de que sea un archivo Excel válido (.xls o .xlsx). Error: {str(e)}"
        )

    # Extraer periodo
    periodo = _extraer_periodo(df)

    # Extraer año y mes del periodo para construir fechas completas
    anio, mes = _extraer_anio_mes_periodo(periodo)

    # Identificar columnas de días
    dias_columnas = _extraer_dias_columnas(df)
    if not dias_columnas:
        raise HTTPException(
            status_code=400,
            detail="No se pudo identificar la fila de días en el reporte. Verifique que el formato sea el esperado."
        )

    logger.info(f"Periodo: {periodo} | Días encontrados: {len(dias_columnas)}")

    # Buscar empleados por ancla "ID:"
    empleados_con_tardanza: List[TardanzaEmpleado] = []
    total_empleados = 0
    fila = 0

    while fila < len(df):
        # Buscar celdas que contengan "ID:"
        fila_es_id = False
        id_empleado = ""
        nombre_empleado = ""

        for col in range(min(3, len(df.columns))):
            valor = str(df.iloc[fila, col]).strip()
            if valor.upper().startswith("ID:") or valor.upper() == "ID":
                fila_es_id = True
                break

        if not fila_es_id:
            fila += 1
            continue

        # Extraer ID del empleado (buscar número cercano a "ID:")
        for col in range(len(df.columns)):
            valor = str(df.iloc[fila, col]).strip()
            if valor.upper().startswith("ID:"):
                # ID puede estar en el mismo campo "ID: 71125448" o en la celda siguiente
                id_parte = valor.replace("ID:", "").replace("id:", "").strip()
                if id_parte and id_parte != "nan":
                    id_empleado = id_parte
                else:
                    # Buscar en las celdas siguientes saltando las vacías/nan
                    for next_col in range(col + 1, min(col + 5, len(df.columns))):
                        cand_id = str(df.iloc[fila, next_col]).strip()
                        if cand_id and cand_id.lower() != "nan":
                            id_empleado = cand_id
                            break
                break
            elif valor.upper() == "ID":
                # El valor está en las siguientes columnas
                for next_col in range(col + 1, min(col + 5, len(df.columns))):
                    cand_id = str(df.iloc[fila, next_col]).strip()
                    if cand_id and cand_id.lower() != "nan":
                        id_empleado = cand_id
                        break
                break

        # Extraer nombre (buscar "Nombre:" en la misma fila)
        for col in range(len(df.columns)):
            valor = str(df.iloc[fila, col]).strip()
            if "nombre" in valor.lower():
                nombre_parte = valor.lower().replace("nombre:", "").strip()
                if nombre_parte and nombre_parte != "nan":
                    nombre_empleado = nombre_parte.upper()
                else:
                    # Buscar en la celda siguiente saltando nan
                    for next_col in range(col + 1, min(col + 8, len(df.columns))):
                        cand_nombre = str(df.iloc[fila, next_col]).strip()
                        if cand_nombre and cand_nombre.lower() != "nan":
                            nombre_empleado = cand_nombre.upper()
                            break
                break

        if not nombre_empleado:
            nombre_empleado = f"Empleado {id_empleado}"

        # Limpiar el id si tiene .0 por el float de pandas
        id_empleado = id_empleado.replace(".0", "")

        total_empleados += 1
        logger.info(f"Empleado encontrado: {nombre_empleado} (ID: {id_empleado})")

        # Buscar tiempos en la fila siguiente (la fila de tiempos)
        fila_tiempos = fila + 1
        if fila_tiempos >= len(df):
            fila += 1
            continue

        detalle_tardanzas: List[TardanzaDia] = []
        total_minutos = 0
        total_minutos_trabajo_mes = 0

        for idx_col, dia_numero in dias_columnas:
            # Obtener valor de la celda de tiempo
            valor_celda = str(df.iloc[fila_tiempos, idx_col]).strip()

            if not valor_celda or valor_celda == "nan":
                continue

            # Separar tiempos pegados
            tiempos = _separar_tiempos(valor_celda)
            hora_entrada = _obtener_hora_entrada(tiempos)

            if not hora_entrada:
                continue

            hora_salida = _obtener_hora_salida(tiempos)
            minutos_trabajados = _calcular_minutos_trabajados(hora_entrada, hora_salida)
            total_minutos_trabajo_mes += minutos_trabajados

            # Calcular tardanza
            minutos = _calcular_minutos_tarde(hora_entrada, hora_corte)

            if minutos > 0:
                # Construir fecha completa
                fecha_str = f"{anio}-{mes:02d}-{dia_numero:02d}" if anio and mes else f"Día {dia_numero}"

                detalle_tardanzas.append(TardanzaDia(
                    fecha=fecha_str,
                    dia_numero=dia_numero,
                    hora_entrada=hora_entrada,
                    hora_salida=hora_salida,
                    minutos_tarde=minutos,
                    minutos_trabajados=minutos_trabajados
                ))
                total_minutos += minutos

        # Solo agregar empleados que tienen tardanzas
        if detalle_tardanzas:
            empleados_con_tardanza.append(TardanzaEmpleado(
                id_empleado=id_empleado,
                nombre=nombre_empleado,
                total_tardanzas=len(detalle_tardanzas),
                total_minutos_tarde=total_minutos,
                total_minutos_trabajados=total_minutos_trabajo_mes,
                detalle=detalle_tardanzas
            ))

        # Saltar la fila de tiempos
        fila += 2

    # Ordenar por total de tardanzas (mayor a menor)
    empleados_con_tardanza.sort(key=lambda e: e.total_tardanzas, reverse=True)

    return AsistenciaReporteResponse(
        periodo=periodo,
        hora_corte=hora_corte,
        total_empleados=total_empleados,
        total_con_tardanzas=len(empleados_con_tardanza),
        empleados=empleados_con_tardanza
    )


def _extraer_anio_mes_periodo(periodo: str) -> Tuple[Optional[int], Optional[int]]:
    """
    Extrae el año y mes del string de periodo.
    Ej: '2026-02-01 ~ 2026-02-24' → (2026, 2)
    """
    try:
        # Buscar patrón de fecha YYYY-MM-DD
        patron = re.compile(r'(\d{4})-(\d{2})-(\d{2})')
        coincidencia = patron.search(periodo)
        if coincidencia:
            return int(coincidencia.group(1)), int(coincidencia.group(2))
    except Exception:
        pass

    return None, None


def generar_excel_reporte(resultado: AsistenciaReporteResponse) -> bytes:
    """
    Genera un archivo Excel formateado con el reporte de tardanzas.

    Args:
        resultado: Resultado del procesamiento de asistencia.

    Returns:
        Bytes del archivo Excel generado.
    """
    salida = io.BytesIO()

    with pd.ExcelWriter(salida, engine="xlsxwriter") as writer:
        workbook = writer.book

        # ============================
        # FORMATOS
        # ============================
        fmt_titulo = workbook.add_format({
            "bold": True, "font_size": 14, "align": "center",
            "valign": "vcenter", "font_color": "#FFFFFF",
            "bg_color": "#1F3864", "border": 1,
        })
        fmt_subtitulo = workbook.add_format({
            "bold": True, "font_size": 11, "align": "left",
            "font_color": "#1F3864",
        })
        fmt_header = workbook.add_format({
            "bold": True, "font_size": 10, "align": "center",
            "valign": "vcenter", "font_color": "#FFFFFF",
            "bg_color": "#2E75B6", "border": 1,
        })
        fmt_celda = workbook.add_format({
            "font_size": 10, "align": "center", "valign": "vcenter",
            "border": 1,
        })
        fmt_celda_izq = workbook.add_format({
            "font_size": 10, "align": "left", "valign": "vcenter",
            "border": 1,
        })
        fmt_alerta = workbook.add_format({
            "font_size": 10, "align": "center", "valign": "vcenter",
            "border": 1, "bg_color": "#FFC7CE", "font_color": "#9C0006",
        })

        # ============================
        # HOJA: RESUMEN
        # ============================
        hoja_resumen = workbook.add_worksheet("Resumen de Tardanzas")
        writer.sheets["Resumen de Tardanzas"] = hoja_resumen

        # Título
        hoja_resumen.merge_range("A1:E1", "REPORTE DE TARDANZAS", fmt_titulo)
        hoja_resumen.write("A2", f"Periodo: {resultado.periodo}", fmt_subtitulo)
        hoja_resumen.write("A3", f"Hora de Corte: {resultado.hora_corte}", fmt_subtitulo)
        hoja_resumen.write("A4", f"Total empleados procesados: {resultado.total_empleados}", fmt_subtitulo)
        hoja_resumen.write("A5", f"Empleados con tardanzas: {resultado.total_con_tardanzas}", fmt_subtitulo)

        # Headers de tabla
        fila_inicio = 7
        headers = ["#", "ID Empleado", "Nombre", "Días Tarde", "Minutos Tarde", "Total Horas Trabajadas"]
        for col, header in enumerate(headers):
            hoja_resumen.write(fila_inicio - 1, col, header, fmt_header)

        # Datos
        for idx, emp in enumerate(resultado.empleados, 1):
            fila = fila_inicio + idx - 1
            fmt = fmt_alerta if emp.total_tardanzas >= 5 else fmt_celda

            ht = emp.total_minutos_trabajados // 60
            mt = emp.total_minutos_trabajados % 60
            hh_trabajadas_str = f"{ht}h {mt}m"

            hoja_resumen.write(fila, 0, idx, fmt)
            hoja_resumen.write(fila, 1, emp.id_empleado, fmt)
            hoja_resumen.write(fila, 2, emp.nombre, fmt_celda_izq if emp.total_tardanzas < 5 else fmt_alerta)
            hoja_resumen.write(fila, 3, emp.total_tardanzas, fmt)
            hoja_resumen.write(fila, 4, emp.total_minutos_tarde, fmt)
            hoja_resumen.write(fila, 5, hh_trabajadas_str, fmt)

        # Anchos de columna
        hoja_resumen.set_column("A:A", 5)
        hoja_resumen.set_column("B:B", 15)
        hoja_resumen.set_column("C:C", 25)
        hoja_resumen.set_column("D:D", 14)
        hoja_resumen.set_column("E:E", 18)
        hoja_resumen.set_column("F:F", 22)

        # ============================
        # HOJA: DETALLE
        # ============================
        hoja_detalle = workbook.add_worksheet("Detalle por Empleado")
        writer.sheets["Detalle por Empleado"] = hoja_detalle

        hoja_detalle.merge_range("A1:D1", "DETALLE DE TARDANZAS POR EMPLEADO", fmt_titulo)

        fila_actual = 2
        for emp in resultado.empleados:
            # Nombre del empleado como sub-header
            fila_actual += 1
            hoja_detalle.merge_range(
                fila_actual, 0, fila_actual, 3,
                f"{emp.nombre} (ID: {emp.id_empleado}) — {emp.total_tardanzas} tardanzas, {emp.total_minutos_tarde} min total",
                fmt_subtitulo
            )
            fila_actual += 1

            # Headers de detalle
            headers_det = ["Fecha", "Día", "Entrada - Salida", "Minutos Tarde", "Trabajado"]
            for col, header in enumerate(headers_det):
                hoja_detalle.write(fila_actual, col, header, fmt_header)
            fila_actual += 1

            # Datos de detalle
            for tardanza in emp.detalle:
                horario_str = f"{tardanza.hora_entrada} - {tardanza.hora_salida or '??'}"
                ht = tardanza.minutos_trabajados // 60
                mt = tardanza.minutos_trabajados % 60
                trabajado_str = f"{ht}h {mt}m" if ht > 0 else f"{mt}m"

                hoja_detalle.write(fila_actual, 0, tardanza.fecha, fmt_celda)
                hoja_detalle.write(fila_actual, 1, tardanza.dia_numero, fmt_celda)
                hoja_detalle.write(fila_actual, 2, horario_str, fmt_celda)
                hoja_detalle.write(fila_actual, 3, tardanza.minutos_tarde, fmt_celda)
                hoja_detalle.write(fila_actual, 4, trabajado_str, fmt_celda)
                fila_actual += 1

        # Anchos de columna
        hoja_detalle.set_column("A:A", 15)
        hoja_detalle.set_column("B:B", 8)
        hoja_detalle.set_column("C:C", 20)
        hoja_detalle.set_column("D:D", 15)
        hoja_detalle.set_column("E:E", 15)

    salida.seek(0)
    return salida.read()
