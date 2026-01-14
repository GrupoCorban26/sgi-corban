import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import UploadFile, HTTPException
import io

class ContactosService:
    @staticmethod
    async def process_excel_contactos(db: AsyncSession, file: UploadFile):
        """
        Procesa Excel de contactos con BULK INSERT optimizado.
        - Filtra duplicados por teléfono (en memoria y contra BD)
        - Inserta en lotes de 500 registros
        - Tiempo estimado: ~1-2 min para 77k registros
        """
        try:
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
            df.columns = [c.lower().strip() for c in df.columns]
            df = df.where(pd.notnull(df), None)
            
            # Limpiar y preparar datos
            df['ruc'] = df['ruc'].apply(lambda x: str(int(x)).strip() if pd.notna(x) and x != '' else None)
            df['telefono'] = df['telefono'].apply(lambda x: str(x).strip() if pd.notna(x) else None)
            df['correo'] = df.get('correo', df.get('email', pd.Series([None]*len(df))))
            
            # Filtrar filas inválidas
            df = df.dropna(subset=['ruc', 'telefono'])
            df = df[df['ruc'] != '']
            df = df[df['telefono'] != '']
            
            # Eliminar duplicados por teléfono (mantener primero)
            df = df.drop_duplicates(subset=['telefono'], keep='first')
            
            total_registros = len(df)
            if total_registros == 0:
                return {"message": "No se encontraron registros válidos.", "inserted": 0}
            
            # Obtener teléfonos existentes para evitar duplicados
            existing = await db.execute(text("SELECT telefono FROM comercial.cliente_contactos WHERE is_active = 1"))
            existing_phones = {row[0] for row in existing.fetchall()}
            
            # Filtrar los que ya existen
            df = df[~df['telefono'].isin(existing_phones)]
            new_count = len(df)
            
            if new_count == 0:
                return {"message": f"Todos los {total_registros} registros ya existen.", "inserted": 0, "duplicates": total_registros}
            
            # Bulk Insert en lotes
            batch_size = 500
            inserted = 0
            
            for i in range(0, len(df), batch_size):
                batch = df.iloc[i:i+batch_size]
                values = []
                params = {}
                
                for idx, (_, row) in enumerate(batch.iterrows()):
                    param_idx = i + idx
                    values.append(f"(:ruc{param_idx}, :telefono{param_idx}, :correo{param_idx}, 'EXCEL_UPLOAD', 0, 1, 'DISPONIBLE', GETDATE())")
                    params[f"ruc{param_idx}"] = row['ruc']
                    params[f"telefono{param_idx}"] = row['telefono']
                    params[f"correo{param_idx}"] = row.get('correo') if pd.notna(row.get('correo')) else None
                
                if values:
                    query = f"""
                        INSERT INTO comercial.cliente_contactos 
                        (ruc, telefono, correo, origen, is_client, is_active, estado, created_at)
                        VALUES {', '.join(values)}
                    """
                    await db.execute(text(query), params)
                    inserted += len(batch)
            
            await db.commit()
            
            duplicates = total_registros - new_count
            return {
                "message": f"Importación completada. {inserted} nuevos, {duplicates} duplicados ignorados.",
                "inserted": inserted,
                "duplicates": duplicates,
                "total_processed": total_registros
            }

        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    @staticmethod
    async def get_contactos_by_ruc(db: AsyncSession, ruc: str):
        result = await db.execute(text("EXEC comercial.usp_listar_contactos_por_ruc :ruc"), {"ruc": ruc})
        return result.mappings().all()

    @staticmethod
    async def create_contacto(db: AsyncSession, data: dict):
        await db.execute(text("""
            EXEC comercial.usp_crear_contacto 
            @Ruc=:ruc, @Cargo=:cargo, @Telefono=:telefono, @Email=:email, @Origen=:origen, @IsClient=:is_client
        """), data)
        await db.commit()
        return True

    @staticmethod
    async def update_contacto(db: AsyncSession, id: int, data: dict):
        params = {
            "Id": id,
            "Cargo": data.get("cargo"),
            "Telefono": data.get("telefono"),
            "Email": data.get("email"),
            "IsClient": data.get("is_client")
        }
        await db.execute(text("""
            EXEC comercial.usp_actualizar_contacto 
            @Id=:Id, @Cargo=:Cargo, @Telefono=:Telefono, @Email=:Email, @IsClient=:IsClient
        """), params)
        await db.commit()
        return True

    @staticmethod
    async def delete_contacto(db: AsyncSession, id: int):
        await db.execute(text("EXEC comercial.usp_eliminar_contacto @Id=:id"), {"id": id})
        await db.commit()
        return True

    @staticmethod
    async def assign_leads_batch(db: AsyncSession, user_id: int):
        result = await db.execute(text("EXEC comercial.usp_asignar_lote_leads @UsuarioId=:uid, @CantidadEmpresas=50"), {"uid": user_id})
        rows = result.mappings().all()
        await db.commit()
        return rows

    @staticmethod
    async def get_contactos_paginado(db: AsyncSession, page: int, page_size: int, search: str = None, estado: str = None):
        """Lista contactos paginados con razon_social, caso, estado y estadísticas."""
        
        # Obtener estadísticas primero
        stats_result = await db.execute(text("EXEC comercial.usp_estadisticas_contactos"))
        stats_row = stats_result.fetchone()
        
        # Calcular offset
        offset = (page - 1) * page_size
        
        # Query paginada con JOIN
        query = text("""
            SELECT 
                cc.id,
                cc.ruc,
                COALESCE(cl.razon_social, ri.razon_social) as razon_social,
                cc.telefono,
                cc.correo,
                CASE WHEN caso.contestado = 1 THEN 'Sí' ELSE 'No' END as contestado,
                caso.nombre as caso,
                cc.estado,
                cc.asignado_a,
                cc.fecha_asignacion,
                cc.created_at
            FROM comercial.cliente_contactos cc
            LEFT JOIN comercial.clientes cl ON cc.ruc = cl.ruc
            LEFT JOIN comercial.registro_importaciones ri ON cc.ruc = ri.ruc
            LEFT JOIN comercial.casos_llamada caso ON cc.caso_id = caso.id
            WHERE cc.is_active = 1
              AND (:search IS NULL OR cc.ruc LIKE '%' + :search + '%' OR cc.telefono LIKE '%' + :search + '%')
              AND (:estado IS NULL OR cc.estado = :estado)
            ORDER BY cc.created_at DESC
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
        """)
        
        data_result = await db.execute(query, {"search": search, "estado": estado, "offset": offset, "page_size": page_size})
        data = data_result.mappings().all()
        
        # Contar total con filtros
        count_query = text("""
            SELECT COUNT(*) FROM comercial.cliente_contactos cc
            WHERE cc.is_active = 1
              AND (:search IS NULL OR cc.ruc LIKE '%' + :search + '%' OR cc.telefono LIKE '%' + :search + '%')
              AND (:estado IS NULL OR cc.estado = :estado)
        """)
        count_result = await db.execute(count_query, {"search": search, "estado": estado})
        total_filtrado = count_result.scalar() or 0
        
        return {
            "stats": {
                "total_registros": stats_row[0] if stats_row else 0,
                "disponibles": stats_row[1] if stats_row else 0,
                "asignados": stats_row[2] if stats_row else 0,
                "en_gestion": stats_row[3] if stats_row else 0,
                "total_filtrado": total_filtrado,
            },
            "page": page,
            "page_size": page_size,
            "data": data
        }

    @staticmethod
    async def get_estadisticas(db: AsyncSession):
        """Retorna estadísticas de contactos."""
        result = await db.execute(text("EXEC comercial.usp_estadisticas_contactos"))
        row = result.fetchone()
        if row:
            return {
                "total": row[0],
                "disponibles": row[1],
                "asignados": row[2],
                "en_gestion": row[3],
                "otros": row[4]
            }
        return {"total": 0, "disponibles": 0, "asignados": 0, "en_gestion": 0, "otros": 0}

    # ============================================
    # MÉTODOS PARA COMERCIAL/BASE
    # ============================================
    
    @staticmethod
    async def get_mis_contactos_asignados(db: AsyncSession, user_id: int):
        """Obtiene los contactos asignados al comercial."""
        result = await db.execute(
            text("EXEC comercial.usp_obtener_mis_contactos_asignados @UsuarioId=:user_id"),
            {"user_id": user_id}
        )
        return result.mappings().all()
    
    @staticmethod
    async def cargar_base(db: AsyncSession, user_id: int, pais_origen: str = None, partida_arancelaria: str = None):
        """Carga 50 contactos de empresas únicas para el comercial."""
        try:
            result = await db.execute(
                text("""EXEC comercial.usp_asignar_lote_leads 
                    @UsuarioId=:user_id, 
                    @CantidadEmpresas=50,
                    @PaisOrigen=:pais_origen,
                    @PartidaArancelaria=:partida_arancelaria"""),
                {
                    "user_id": user_id,
                    "pais_origen": pais_origen,
                    "partida_arancelaria": partida_arancelaria
                }
            )
            rows = result.mappings().all()
            await db.commit()
            return {"success": True, "contactos": rows, "cantidad": len(rows)}
        except Exception as e:
            await db.rollback()
            error_msg = str(e)
            if "Ya tienes" in error_msg:
                raise HTTPException(status_code=400, detail=error_msg)
            raise HTTPException(status_code=500, detail=f"Error al cargar base: {error_msg}")
    
    @staticmethod
    async def actualizar_feedback(db: AsyncSession, contacto_id: int, caso_id: int, comentario: str):
        """Actualiza el feedback de un contacto."""
        await db.execute(
            text("EXEC comercial.usp_actualizar_feedback_contacto @ContactoId=:id, @CasoId=:caso_id, @Comentario=:comentario"),
            {"id": contacto_id, "caso_id": caso_id, "comentario": comentario}
        )
        await db.commit()
        return {"success": True}
    
    @staticmethod
    async def enviar_feedback_lote(db: AsyncSession, user_id: int):
        """Envía el feedback completo y marca contactos como gestionados."""
        try:
            result = await db.execute(
                text("EXEC comercial.usp_enviar_feedback_lote @UsuarioId=:user_id"),
                {"user_id": user_id}
            )
            row = result.fetchone()
            await db.commit()
            return {"success": True, "contactos_procesados": row[0] if row else 0}
        except Exception as e:
            await db.rollback()
            error_msg = str(e)
            if "sin feedback" in error_msg:
                raise HTTPException(status_code=400, detail=error_msg)
            raise HTTPException(status_code=500, detail=f"Error: {error_msg}")
    
    @staticmethod
    async def get_filtros_base(db: AsyncSession):
        """Obtiene países y partidas disponibles para filtrar."""
        # Obtener países - query directa
        paises_result = await db.execute(text("""
            SELECT TOP 50 
                TRIM(value) as pais,
                COUNT(*) as cantidad
            FROM comercial.registro_importaciones
            CROSS APPLY STRING_SPLIT(paises_origen, ',')
            WHERE TRIM(value) != ''
            GROUP BY TRIM(value)
            ORDER BY COUNT(*) DESC
        """))
        paises = [{"pais": row[0], "cantidad": row[1]} for row in paises_result.fetchall()]
        
        # Obtener partidas - query directa
        partidas_result = await db.execute(text("""
            SELECT TOP 50 
                LEFT(TRIM(value), 4) as partida,
                COUNT(*) as cantidad
            FROM comercial.registro_importaciones
            CROSS APPLY STRING_SPLIT(partida_arancelaria_cod, ',')
            WHERE TRIM(value) != ''
            GROUP BY LEFT(TRIM(value), 4)
            ORDER BY COUNT(*) DESC
        """))
        partidas = [{"partida": row[0], "cantidad": row[1]} for row in partidas_result.fetchall()]
        
        return {"paises": paises, "partidas": partidas}
