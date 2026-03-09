"""
Router para el módulo de procesamiento de reportes de asistencia.
Endpoints para procesar y exportar reporte de tardanzas desde un Excel de asistencia.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse

from app.core.security import get_current_active_auth
from app.schemas.asistencia import AsistenciaReporteResponse
from app.services.asistencia_service import (
    generar_excel_reporte,
    procesar_excel_asistencia,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/asistencia", tags=["Administración - Asistencia"])


EXTENSIONES_PERMITIDAS = {".xls", ".xlsx"}


def _validar_extension(nombre_archivo: str) -> None:
    """Valida que el archivo tenga una extensión Excel válida."""
    if not nombre_archivo:
        raise HTTPException(status_code=400, detail="El archivo no tiene nombre")

    extension = "." + nombre_archivo.rsplit(".", 1)[-1].lower() if "." in nombre_archivo else ""
    if extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido. Solo se aceptan: {', '.join(EXTENSIONES_PERMITIDAS)}"
        )


@router.post("/procesar-reporte", response_model=AsistenciaReporteResponse)
async def procesar_reporte(
    file: UploadFile = File(..., description="Archivo Excel de reporte de asistencia (.xls o .xlsx)"),
    hora_corte: str = Query("08:10", description="Hora de corte para considerar tardanza (formato HH:MM)"),
    _: dict = Depends(get_current_active_auth),
):
    """
    Procesa un archivo Excel de reporte de asistencia y retorna las tardanzas calculadas.
    
    - **file**: Archivo Excel (.xls o .xlsx) con el reporte de asistencia.
    - **hora_corte**: Hora límite de entrada (default: 08:10). Entradas después de esta hora se consideran tardanza.
    """
    _validar_extension(file.filename)

    contenido = await file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    logger.info(f"Procesando reporte de asistencia: {file.filename} | Hora corte: {hora_corte}")

    resultado = procesar_excel_asistencia(contenido, hora_corte)

    logger.info(
        f"Reporte procesado: {resultado.total_empleados} empleados, "
        f"{resultado.total_con_tardanzas} con tardanzas"
    )

    return resultado


@router.post("/exportar-reporte")
async def exportar_reporte(
    file: UploadFile = File(..., description="Archivo Excel de reporte de asistencia (.xls o .xlsx)"),
    hora_corte: str = Query("08:10", description="Hora de corte para considerar tardanza (formato HH:MM)"),
    _: dict = Depends(get_current_active_auth),
):
    """
    Procesa un archivo Excel de asistencia y retorna un archivo Excel formateado con las tardanzas.
    
    - **file**: Archivo Excel (.xls o .xlsx) con el reporte de asistencia.
    - **hora_corte**: Hora límite de entrada (default: 08:10).
    """
    _validar_extension(file.filename)

    contenido = await file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    logger.info(f"Exportando reporte de asistencia: {file.filename} | Hora corte: {hora_corte}")

    resultado = procesar_excel_asistencia(contenido, hora_corte)
    excel_bytes = generar_excel_reporte(resultado)

    nombre_archivo = f"reporte_tardanzas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        content=iter([excel_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )
