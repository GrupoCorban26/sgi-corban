"""
BaseComercialService - Lógica de consulta para la vista de Base Comercial (Sistemas).
Responsabilidad: el merge entre registro_importaciones y cliente_contactos.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)


class BaseComercialService:
    """Servicio para la vista de Base Comercial (Sistemas)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_base_con_stats(self, page: int, page_size: int, search: str = None):
        """
        Retorna el merge entre registro_importaciones y cliente_contactos
        con estadísticas incluidas.
        """
        offset = (page - 1) * page_size
        search_param = search if search else None

        # Stats query con CTEs
        stats_query = text("""
            WITH base_filter AS (
                SELECT 
                    cc.id,
                    cc.ruc,
                    ri.razon_social,
                    cc.telefono,
                    cc.correo,
                    cc.estado,
                    ri.fob_anual_usd,
                    ri.embarques_anuales,
                    ri.categoria_frecuencia,
                    ri.agentes_distintos
                FROM comercial.cliente_contactos cc
                INNER JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
                WHERE cc.is_active = 1
                  AND cc.estado = 'DISPONIBLE'
                  AND cc.ruc NOT IN (SELECT ruc FROM comercial.clientes WHERE ruc IS NOT NULL)
                  AND (:search IS NULL OR ri.ruc LIKE '%' + :search + '%' OR ri.razon_social LIKE '%' + :search + '%')
            ),
            stats AS (
                SELECT 
                    (SELECT COUNT(*) FROM base_filter) as total_contactos_general,
                    
                    (SELECT COUNT(DISTINCT ruc) FROM base_filter 
                     WHERE agentes_distintos > 1 OR agentes_distintos = 0 OR agentes_distintos IS NULL) as empresas_multi_0_agentes,
                     
                    (SELECT COUNT(*) FROM base_filter) as contactos_disponibles,
                    
                    (SELECT COUNT(DISTINCT ruc) FROM base_filter) as empresas_diferentes
            )
            SELECT 
                (SELECT COUNT(*) FROM base_filter) as total_count,
                (SELECT total_contactos_general FROM stats) as total_contactos_general,
                (SELECT empresas_multi_0_agentes FROM stats) as empresas_multi_0_agentes,
                (SELECT contactos_disponibles FROM stats) as contactos_disponibles,
                (SELECT empresas_diferentes FROM stats) as empresas_diferentes;
        """)

        stats_result = await self.db.execute(stats_query, {"search": search_param})
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
                ri.fob_anual_usd,
                ri.embarques_anuales,
                ri.categoria_frecuencia
            FROM comercial.cliente_contactos cc
            INNER JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
            WHERE cc.is_active = 1
              AND cc.estado = 'DISPONIBLE'
              AND cc.ruc NOT IN (SELECT ruc FROM comercial.clientes WHERE ruc IS NOT NULL)
              AND (:search IS NULL OR ri.ruc LIKE '%' + :search + '%' OR ri.razon_social LIKE '%' + :search + '%')
            ORDER BY ri.fob_anual_usd DESC, ri.embarques_anuales DESC
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
        """)

        result = await self.db.execute(data_query, {"search": search_param, "offset": offset, "page_size": page_size})
        data = result.mappings().all()

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "stats": {
                "total_contactos": stats_row[1] if stats_row else 0,
                "empresas_multi_0_agentes": stats_row[2] if stats_row else 0,
                "contactos_disponibles": stats_row[3] if stats_row else 0,
                "empresas_diferentes": stats_row[4] if stats_row else 0,
            },
            "data": data
        }

    async def get_stats(self):
        """Estadísticas de la base comercial."""
        query = text("""
            WITH base_filter AS (
                SELECT 
                    cc.ruc,
                    ri.agentes_distintos
                FROM comercial.cliente_contactos cc
                INNER JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
                WHERE cc.is_active = 1
                  AND cc.estado = 'DISPONIBLE'
                  AND cc.ruc NOT IN (SELECT ruc FROM comercial.clientes WHERE ruc IS NOT NULL)
            )
            SELECT 
                (SELECT COUNT(*) FROM base_filter) as total_contactos_general,
                   
                (SELECT COUNT(DISTINCT ruc) FROM base_filter
                 WHERE agentes_distintos > 1 OR agentes_distintos = 0 OR agentes_distintos IS NULL) as empresas_multi_0_agentes,
                 
                (SELECT COUNT(*) FROM base_filter) as contactos_disponibles,
                   
                (SELECT COUNT(DISTINCT ruc) FROM base_filter) as empresas_diferentes
        """)
        result = await self.db.execute(query)
        row = result.fetchone()

        return {
            "total_contactos": row[0] if row else 0,
            "empresas_multi_0_agentes": row[1] if row else 0,
            "contactos_disponibles": row[2] if row else 0,
            "empresas_diferentes": row[3] if row else 0,
        }
