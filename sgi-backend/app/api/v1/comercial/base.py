from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database.db_connection import get_db

router = APIRouter(
    prefix="/base",
    tags=["Base Comercial"]
)

@router.get("/")
async def get_base_comercial(
    page: int = Query(1, gt=0),
    page_size: int = Query(20, gt=0, le=100),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el merge entre registro_importaciones y cliente_contactos.
    Filtros:
    - RUC >= 20400000000 (empresas a partir de 2040...)
    - fob_max <= 300,000
    - Solo empresas con teléfono registrado
    """
    offset = (page - 1) * page_size
    
    # Query consolidada: data + stats en una sola llamada
    search_param = search if search else None
    
    # Query principal con CTEs para optimizar
    query = text("""
        WITH base_filter AS (
            SELECT 
                cc.id,
                cc.ruc,
                ri.razon_social,
                cc.telefono,
                cc.correo,
                cc.estado,
                ri.fob_max,
                ri.fob_anual,
                ri.total_operaciones,
                ri.ultima_importacion
            FROM comercial.cliente_contactos cc
            INNER JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
            WHERE ri.ruc >= '20400000000'
              AND (ri.fob_max IS NULL OR ri.fob_max <= 300000)
              AND cc.is_active = 1
              AND cc.estado = 'DISPONIBLE'
              AND cc.ruc NOT IN (SELECT ruc FROM comercial.clientes WHERE ruc IS NOT NULL)
              AND (:search IS NULL OR ri.ruc LIKE '%' + :search + '%' OR ri.razon_social LIKE '%' + :search + '%')
        ),
        stats AS (
            SELECT 
                (SELECT COUNT(DISTINCT ruc) FROM comercial.registro_importaciones 
                 WHERE ruc >= '20400000000' AND (fob_max IS NULL OR fob_max <= 300000)
                   AND ruc NOT IN (SELECT ruc FROM comercial.clientes WHERE ruc IS NOT NULL)) as empresas_transacciones,
                (SELECT COUNT(DISTINCT cc2.ruc) FROM comercial.cliente_contactos cc2
                 INNER JOIN comercial.registro_importaciones ri2 ON cc2.ruc = ri2.ruc
                 WHERE ri2.ruc >= '20400000000' AND (ri2.fob_max IS NULL OR ri2.fob_max <= 300000)
                   AND cc2.is_active = 1
                   AND cc2.ruc NOT IN (SELECT ruc FROM comercial.clientes WHERE ruc IS NOT NULL)) as empresas_con_telefono,
                (SELECT COUNT(*) FROM base_filter) as total_contactos
        )
        SELECT 
            (SELECT COUNT(*) FROM base_filter) as total_count,
            (SELECT empresas_transacciones FROM stats) as empresas_transacciones,
            (SELECT empresas_con_telefono FROM stats) as empresas_con_telefono,
            (SELECT total_contactos FROM stats) as total_contactos;
    """)
    
    stats_result = await db.execute(query, {"search": search_param})
    stats_row = stats_result.fetchone()
    
    total = stats_row[0] if stats_row else 0
    
    # Data query con paginación
    data_query = text("""
        SELECT 
            cc.id,
            cc.ruc,
            ri.razon_social,
            cc.telefono,
            cc.correo,
            cc.estado,
            ri.fob_max,
            ri.fob_anual,
            ri.total_operaciones,
            ri.ultima_importacion
        FROM comercial.cliente_contactos cc
        INNER JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
        WHERE ri.ruc >= '20400000000'
          AND (ri.fob_max IS NULL OR ri.fob_max <= 300000)
          AND cc.is_active = 1
          AND cc.estado = 'DISPONIBLE'
          AND cc.ruc NOT IN (SELECT ruc FROM comercial.clientes WHERE ruc IS NOT NULL)
          AND (:search IS NULL OR ri.ruc LIKE '%' + :search + '%' OR ri.razon_social LIKE '%' + :search + '%')
        ORDER BY ri.fob_anual DESC, ri.total_operaciones DESC
        OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
    """)
    
    result = await db.execute(data_query, {"search": search_param, "offset": offset, "page_size": page_size})
    data = result.mappings().all()
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "stats": {
            "empresas_transacciones": stats_row[1] if stats_row else 0,
            "empresas_con_telefono": stats_row[2] if stats_row else 0,
            "total_contactos": stats_row[3] if stats_row else 0,
        },
        "data": data
    }

@router.get("/stats")
async def get_base_stats(db: AsyncSession = Depends(get_db)):
    """Estadísticas de la base comercial."""
    query = text("""
        SELECT 
            (SELECT COUNT(DISTINCT ruc) FROM comercial.registro_importaciones 
             WHERE ruc >= '20400000000' AND (fob_max IS NULL OR fob_max <= 300000)) as empresas_filtradas,
            (SELECT COUNT(DISTINCT cc.ruc) FROM comercial.cliente_contactos cc
             INNER JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
             WHERE ri.ruc >= '20400000000' AND (ri.fob_max IS NULL OR ri.fob_max <= 300000)
               AND cc.is_active = 1) as empresas_con_telefono,
            (SELECT COUNT(*) FROM comercial.cliente_contactos cc
             INNER JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
             WHERE ri.ruc >= '20400000000' AND (ri.fob_max IS NULL OR ri.fob_max <= 300000)
               AND cc.is_active = 1 AND cc.estado = 'DISPONIBLE') as contactos_disponibles
    """)
    result = await db.execute(query)
    row = result.fetchone()
    
    return {
        "empresas_filtradas": row[0] if row else 0,
        "empresas_con_telefono": row[1] if row else 0,
        "contactos_disponibles": row[2] if row else 0,
    }
