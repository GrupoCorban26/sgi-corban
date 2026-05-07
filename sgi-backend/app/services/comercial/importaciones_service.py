"""
ImportacionesService - Procesamiento de Excel de prospectos y consultas.
Formato: Prospectos v2 (generar_prospectos.py)
Migrado al Patrón A (clase con self.db) para consistencia con el resto del proyecto.
"""
import logging
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import UploadFile, HTTPException
import io
import asyncio

logger = logging.getLogger(__name__)

_lock_importacion = asyncio.Lock()


class ImportacionesService:
    """Servicio de importaciones: procesamiento de Excel de prospectos y consultas."""

    # Mapeo EXACTO de columnas del Excel a columnas de la tabla BD
    COLUMN_MAPPING = {
        'ruc': 'ruc',
        'razon_social': 'razon_social',
        'sector': 'sector',
        'score': 'score',
        'agentes_distintos': 'agentes_distintos',
        'total_embarques': 'total_embarques',
        'meses_activos': 'meses_activos',
        'fob_promedio': 'fob_promedio',
        'via_predominante': 'via_predominante',
        'paises_principales': 'paises_principales',
        'ultima_importacion': 'ultima_importacion',
        'dias_desde_ultima': 'dias_desde_ultima',
    }

    # Columnas válidas de la tabla BD
    VALID_DB_COLUMNS = {
        'ruc', 'razon_social', 'sector', 'score',
        'agentes_distintos', 'total_embarques', 'meses_activos',
        'fob_promedio', 'via_predominante', 'paises_principales',
        'ultima_importacion', 'dias_desde_ultima'
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _normalize_column_name(col: str) -> str:
        """Normaliza: minúsculas, espacios → _"""
        return str(col).lower().strip().replace(' ', '_')

    @staticmethod
    def _map_columns(df):
        """Mapea y filtra columnas del DataFrame."""
        new_columns = {}
        for col in df.columns:
            normalized = ImportacionesService._normalize_column_name(col)
            mapped = ImportacionesService.COLUMN_MAPPING.get(normalized, normalized)
            new_columns[col] = mapped

        df = df.rename(columns=new_columns)

        # Solo columnas válidas
        valid = [c for c in df.columns if c in ImportacionesService.VALID_DB_COLUMNS]
        return df[valid], valid

    async def process_excel_import(self, file: UploadFile):
        """
        Procesa un Excel de prospectos.
        1. Limpia la tabla (TRUNCATE)
        2. Inserta registros
        """
        if _lock_importacion.locked():
            raise HTTPException(409, "Ya hay una importación en curso. Intente en unos segundos.")

        async with _lock_importacion:
            try:
                contents = await file.read()
                df = pd.read_excel(io.BytesIO(contents))

                # Reemplazar NaN con None
                df = df.where(pd.notnull(df), None)

                # Mapear columnas
                df, valid_columns = self._map_columns(df)

                if not valid_columns:
                    raise HTTPException(status_code=400, detail="No se encontraron columnas válidas en el Excel")

                # Convertir RUC a string
                if 'ruc' in df.columns:
                    df['ruc'] = df['ruc'].apply(lambda x: str(int(x)) if pd.notna(x) and x != '' else None)

                # Limpiar columnas numéricas (decimales)
                numeric_float_columns = ['score', 'fob_promedio']
                for col in numeric_float_columns:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        df[col] = df[col].where(pd.notnull(df[col]), None)

                # Convertir columnas enteras
                integer_columns = ['agentes_distintos', 'total_embarques', 'meses_activos', 'dias_desde_ultima']
                for col_int in integer_columns:
                    if col_int in df.columns:
                        df[col_int] = df[col_int].apply(
                            lambda x: int(x) if pd.notna(x) and x is not None else None
                        )

                # Asegurar columnas de texto
                text_columns = ['sector', 'via_predominante', 'paises_principales', 'ultima_importacion']
                for col_txt in text_columns:
                    if col_txt in df.columns:
                        df[col_txt] = df[col_txt].apply(
                            lambda x: str(x).strip() if pd.notna(x) and x is not None else None
                        )

                # 1. Truncate
                await self.db.execute(text("TRUNCATE TABLE comercial.registro_importaciones"))

                # 2. Bulk Insert
                records = df.to_dict(orient='records')

                # Sanitizar: convertir cualquier string vacía restante a None
                for record in records:
                    for key, value in record.items():
                        if value == '' or (isinstance(value, float) and pd.isna(value)):
                            record[key] = None

                if records:
                    columns = valid_columns
                    query = f"INSERT INTO comercial.registro_importaciones ({', '.join(columns)}) VALUES ({', '.join([':' + c for c in columns])})"

                    # Lotes de 500
                    batch_size = 500
                    for i in range(0, len(records), batch_size):
                        batch = records[i:i+batch_size]
                        await self.db.execute(text(query), batch)

                await self.db.commit()

                return {
                    "success": True,
                    "message": f"Se importaron {len(records)} prospectos correctamente.",
                    "records_count": len(records),
                    "columns_used": valid_columns
                }

            except HTTPException:
                raise
            except Exception as e:
                await self.db.rollback()
                raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    async def get_importaciones(self, page: int, page_size: int, search: str = None, sin_telefono: bool = False, sort_by_ruc: str = None, pais_origen: str = None, cant_agentes: int = None):
        """Lista prospectos con paginación. Opcionalmente filtra empresas sin teléfono registrado."""
        try:
            offset = (page - 1) * page_size

            # Base query
            base_where = """
                WHERE (:search IS NULL OR ri.ruc LIKE '%' + :search + '%' OR ri.razon_social LIKE '%' + :search + '%')
            """

            # Si sin_telefono=True, excluir RUCs que tienen teléfonos
            if sin_telefono:
                base_where += """
                    AND ri.ruc NOT IN (SELECT DISTINCT ruc FROM comercial.cliente_contactos WHERE is_active = 1)
                """

            # Determinar el ORDER BY
            if sort_by_ruc == 'desc':
                order_by = "ORDER BY ri.ruc DESC"
            elif sort_by_ruc == 'asc':
                order_by = "ORDER BY ri.ruc ASC"
            else:
                order_by = "ORDER BY ri.score DESC, ri.dias_desde_ultima ASC"

            # Parámetros adicionales
            params_dict = {"search": search, "pais_origen": pais_origen, "cant_agentes": cant_agentes}

            if pais_origen is not None and pais_origen.strip() != '':
                base_where += " AND ri.paises_principales LIKE '%' + :pais_origen + '%' "

            if cant_agentes is not None:
                base_where += " AND ri.agentes_distintos = :cant_agentes "

            # Count query
            count_query = f"""
                SELECT COUNT(*) FROM comercial.registro_importaciones ri
                {base_where}
            """
            count_result = await self.db.execute(text(count_query), params_dict)
            total = count_result.scalar() or 0

            # Data query
            params_dict.update({"offset": offset, "page_size": page_size})
            data_query = f"""
                SELECT * FROM comercial.registro_importaciones ri
                {base_where}
                {order_by}
                OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
            """
            result = await self.db.execute(text(data_query), params_dict)
            rows = result.mappings().all()

            return {"total": total, "page": page, "page_size": page_size, "data": rows}

        except Exception as e:
            logger.error(f"Error get_importaciones: {e}")
            return {"total": 0, "page": page, "page_size": page_size, "data": []}

    async def get_paises_dropdown(self):
        """Devuelve listado de países únicos (valores exactos, separando múltiples países por | )."""
        try:
            query = """
                SELECT DISTINCT paises_principales 
                FROM comercial.registro_importaciones 
                WHERE paises_principales IS NOT NULL AND RTRIM(LTRIM(paises_principales)) <> ''
            """
            result = await self.db.execute(text(query))
            rows = result.scalars().all()

            paises_unicos = set()
            for row in rows:
                if row:
                    # Separar por pipes (formato del nuevo Excel: "CHINA | ESTADOS UNIDOS | COREA DEL SUR")
                    partes = row.replace('/', '|').split('|')
                    for parte in partes:
                        pais_limpio = parte.strip()
                        if pais_limpio:
                            paises_unicos.add(pais_limpio)

            return sorted(list(paises_unicos))
        except Exception as e:
            logger.error(f"Error get_paises_dropdown: {e}")
            return []
