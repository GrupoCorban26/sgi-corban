import logging
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import UploadFile, HTTPException
import io

logger = logging.getLogger(__name__)

class ImportacionesService:
    
    # Mapeo EXACTO de columnas del Excel a columnas de la tabla BD
    COLUMN_MAPPING = {
        'ruc': 'ruc',
        'año': 'anio',
        'razón_social': 'razon_social',
        'aduanas': 'aduanas',
        'vías_de_transporte': 'via_transporte',
        'países_de_origen': 'paises_origen',
        'puertos_de_embarque': 'puertos_embarque',
        'embarcadores': 'embarcadores',
        'agentes_de_aduanas': 'agente_aduanas',
        'partidas_arancelarias_(cód)': 'partida_arancelaria_cod',
        'partidas_arancelarias_(desc)': 'partida_arancelaria_descripcion',
        'fob_mínimo': 'fob_min',
        'fob_máximo': 'fob_max',
        'fob_promedio': 'fob_prom',
        'fob_anual': 'fob_anual',
        'total_operaciones': 'total_operaciones',
        'cant._agentes': 'cantidad_agentes',
        'cant._países': 'cantidad_paises',
        'cant._partidas': 'cantidad_partidas',
        'primera_importación': 'primera_importacion',
        'última_importación': 'ultima_importacion',
    }
    
    # Columnas válidas de la tabla BD
    VALID_DB_COLUMNS = {
        'ruc', 'anio', 'razon_social', 'aduanas', 'via_transporte',
        'paises_origen', 'puertos_embarque', 'embarcadores', 'agente_aduanas',
        'partida_arancelaria_cod', 'partida_arancelaria_descripcion',
        'fob_min', 'fob_max', 'fob_prom', 'fob_anual',
        'total_operaciones', 'cantidad_agentes', 'cantidad_paises', 'cantidad_partidas',
        'primera_importacion', 'ultima_importacion'
    }

    @staticmethod
    def normalize_column_name(col: str) -> str:
        """Normaliza: minúsculas, espacios → _"""
        return str(col).lower().strip().replace(' ', '_')
    
    @staticmethod
    def map_columns(df):
        """Mapea y filtra columnas del DataFrame"""
        new_columns = {}
        for col in df.columns:
            normalized = ImportacionesService.normalize_column_name(col)
            mapped = ImportacionesService.COLUMN_MAPPING.get(normalized, normalized)
            new_columns[col] = mapped
        
        df = df.rename(columns=new_columns)
        
        # Solo columnas válidas
        valid = [c for c in df.columns if c in ImportacionesService.VALID_DB_COLUMNS]
        return df[valid], valid

    @staticmethod
    async def process_excel_import(db: AsyncSession, file: UploadFile):
        """
        Procesa un Excel de importaciones.
        1. Limpia la tabla (TRUNCATE)
        2. Inserta registros
        """
        try:
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
            
            # Reemplazar NaN con None
            df = df.where(pd.notnull(df), None)
            
            # Mapear columnas
            df, valid_columns = ImportacionesService.map_columns(df)
            
            if not valid_columns:
                raise HTTPException(status_code=400, detail="No se encontraron columnas válidas en el Excel")
            
            # Convertir fechas a string (manejar NaT)
            for col in ['primera_importacion', 'ultima_importacion']:
                if col in df.columns:
                    df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) else None)
            
            # Convertir RUC a string
            if 'ruc' in df.columns:
                df['ruc'] = df['ruc'].apply(lambda x: str(int(x)) if pd.notna(x) and x != '' else None)
            
            # Convertir año a string
            if 'anio' in df.columns:
                df['anio'] = df['anio'].apply(lambda x: str(int(x)) if pd.notna(x) else None)
            
            # 1. Truncate
            await db.execute(text("TRUNCATE TABLE comercial.registro_importaciones"))
            
            # 2. Bulk Insert
            records = df.to_dict(orient='records')
            
            if records:
                columns = valid_columns
                query = f"INSERT INTO comercial.registro_importaciones ({', '.join(columns)}) VALUES ({', '.join([':' + c for c in columns])})"
                
                # Lotes de 500
                batch_size = 500
                for i in range(0, len(records), batch_size):
                    batch = records[i:i+batch_size]
                    await db.execute(text(query), batch)
                
            await db.commit()
            
            return {
                "success": True,
                "message": f"Se importaron {len(records)} registros correctamente.",
                "records_count": len(records),
                "columns_used": valid_columns
            }

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    @staticmethod
    async def get_importaciones(db: AsyncSession, page: int, page_size: int, search: str = None, sin_telefono: bool = False, sort_by_ruc: str = None):
        """Lista importaciones con paginación. Opcionalmente filtra empresas sin teléfono registrado."""
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
                order_by = "ORDER BY ri.anio DESC, ri.fob_anual DESC"
            
            # Count query
            count_query = f"""
                SELECT COUNT(*) FROM comercial.registro_importaciones ri
                {base_where}
            """
            count_result = await db.execute(text(count_query), {"search": search})
            total = count_result.scalar() or 0
            
            # Data query
            data_query = f"""
                SELECT * FROM comercial.registro_importaciones ri
                {base_where}
                {order_by}
                OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
            """
            result = await db.execute(text(data_query), {"search": search, "offset": offset, "page_size": page_size})
            rows = result.mappings().all()
            
            return {"total": total, "page": page, "page_size": page_size, "data": rows}
            
        except Exception as e:
            logger.error(f"Error get_importaciones: {e}")
            return {"total": 0, "page": page, "page_size": page_size, "data": []}
