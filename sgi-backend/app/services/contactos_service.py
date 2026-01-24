import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func, or_, and_, update, delete, case
from sqlalchemy.orm import selectinload
from fastapi import UploadFile, HTTPException
import io
from app.models.comercial import ClienteContacto, Cliente, CasoLlamada, RegistroImportacion
from app.models.core import Distrito, Provincia, DepartamentoGeo
from datetime import datetime


class ContactosService:
    """
    Servicio de Contactos - Patrón de Instancia (consistente con otros services).
    Maneja la lógica de negocio para gestión de contactos comerciales.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # PROCESAMIENTO DE EXCEL
    # =========================================================================

    async def process_excel_contactos(self, file: UploadFile):
        """
        Procesa Excel de contactos con BULK INSERT y UPDATE.
        - Nuevos registros: INSERT
        - Registros existentes: UPDATE (solo asignación y estado si aplica)
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
            
            # Eliminar duplicados dentro del mismo Excel (por teléfono)
            df = df.drop_duplicates(subset=['telefono'], keep='first')
            
            total_registros = len(df)
            if total_registros == 0:
                return {"message": "No se encontraron registros válidos.", "inserted": 0, "updated": 0}
            
            # Obtener teléfonos existentes
            stmt_existing = select(ClienteContacto.telefono).where(ClienteContacto.is_active == True)
            existing = await self.db.execute(stmt_existing)
            existing_phones = {row for row in existing.scalars().all()}
            
            # Separar nuevos y existentes
            df_new = df[~df['telefono'].isin(existing_phones)]
            df_existing = df[df['telefono'].isin(existing_phones)]
            
            inserted = 0
            updated = 0
            batch_size = 500
            
            # --- PROCESAR NUEVOS (INSERT) ---
            if not df_new.empty:
                to_insert = []
                for _, row in df_new.iterrows():
                    nombre = row.get('nombre') or row.get('contacto') or row.get('razon_social') or row.get('empresa')
                    if pd.isna(nombre): nombre = None
                    
                    # Logica Asignación
                    asignado_a = row.get('asignado_a')
                    if pd.isna(asignado_a): asignado_a = None
                    else: 
                        try: asignado_a = int(float(asignado_a))
                        except: asignado_a = None

                    fecha_asignacion = row.get('fecha_asignacion')
                    if pd.isna(fecha_asignacion): fecha_asignacion = None

                    estado = 'ASIGNADO' if asignado_a else 'DISPONIBLE'
                    
                    to_insert.append({
                        "ruc": row['ruc'],
                        "telefono": row['telefono'],
                        "nombre": nombre,
                        "correo": row.get('correo') if pd.notna(row.get('correo')) else None,
                        "origen": 'EXCEL_UPLOAD',
                        "is_client": False,
                        "is_active": True,
                        "estado": estado,
                        "asignado_a": asignado_a,
                        "fecha_asignacion": fecha_asignacion
                    })
                    
                    if len(to_insert) >= batch_size:
                        await self.db.execute(
                            text("INSERT INTO comercial.cliente_contactos (ruc, telefono, nombre, correo, origen, is_client, is_active, estado, asignado_a, fecha_asignacion, created_at) VALUES (:ruc, :telefono, :nombre, :correo, :origen, :is_client, :is_active, :estado, :asignado_a, :fecha_asignacion, GETDATE())"), 
                            to_insert
                        )
                        inserted += len(to_insert)
                        to_insert = []
                
                if to_insert:
                    await self.db.execute(
                        text("INSERT INTO comercial.cliente_contactos (ruc, telefono, nombre, correo, origen, is_client, is_active, estado, asignado_a, fecha_asignacion, created_at) VALUES (:ruc, :telefono, :nombre, :correo, :origen, :is_client, :is_active, :estado, :asignado_a, :fecha_asignacion, GETDATE())"), 
                        to_insert
                    )
                    inserted += len(to_insert)

            # --- PROCESAR EXISTENTES (UPDATE) ---
            if not df_existing.empty:
                to_update = []
                for _, row in df_existing.iterrows():
                    # Solo actualizamos si hay datos de asignación en el Excel
                    asignado_a = row.get('asignado_a')
                    if pd.isna(asignado_a): continue
                    
                    try: asignado_a = int(float(asignado_a))
                    except: continue

                    fecha_asignacion = row.get('fecha_asignacion')
                    if pd.isna(fecha_asignacion): fecha_asignacion = None
                    
                    to_update.append({
                        "telefono": row['telefono'],
                        "asignado_a": asignado_a,
                        "fecha_asignacion": fecha_asignacion,
                        "estado": 'ASIGNADO'
                    })
                    
                    if len(to_update) >= batch_size:
                        await self.db.execute(
                            text("""
                                UPDATE comercial.cliente_contactos 
                                SET asignado_a = :asignado_a, 
                                    fecha_asignacion = :fecha_asignacion, 
                                    estado = :estado 
                                WHERE telefono = :telefono
                            """),
                            to_update
                        )
                        updated += len(to_update)
                        to_update = []

                if to_update:
                    await self.db.execute(
                        text("""
                            UPDATE comercial.cliente_contactos 
                            SET asignado_a = :asignado_a, 
                                fecha_asignacion = :fecha_asignacion, 
                                estado = :estado 
                            WHERE telefono = :telefono
                        """),
                        to_update
                    )
                    updated += len(to_update)

            await self.db.commit()
            
            return {
                "message": f"Importación completada. {inserted} nuevos, {updated} actualizados.",
                "inserted": inserted,
                "updated": updated,
                "total_processed": total_registros
            }

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    # =========================================================================
    # CRUD BÁSICO
    # =========================================================================

    async def get_contactos_by_ruc(self, ruc: str):
        """Obtiene contactos por RUC."""
        stmt = select(ClienteContacto).where(
            ClienteContacto.ruc == ruc, 
            ClienteContacto.is_active == True
        ).order_by(ClienteContacto.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_contacto(self, data: dict):
        """Crea un nuevo contacto."""
        # Validar duplicado
        stmt_dup = select(ClienteContacto).where(
            ClienteContacto.ruc == data['ruc'], 
            ClienteContacto.telefono == data['telefono'], 
            ClienteContacto.is_active == True
        )
        if (await self.db.execute(stmt_dup)).scalars().first():
             return True  # Already exists

        nuevo_contacto = ClienteContacto(
            ruc=data['ruc'],
            cargo=data.get('cargo'),
            telefono=data['telefono'],
            correo=data.get('email'),
            origen=data.get('origen', 'MANUAL'),
            is_client=data.get('is_client', False),
            is_active=True,
            estado='DISPONIBLE'
        )
        self.db.add(nuevo_contacto)
        await self.db.commit()
        return True

    async def update_contacto(self, id: int, data: dict):
        """Actualiza un contacto existente."""
        stmt = select(ClienteContacto).where(ClienteContacto.id == id)
        res = await self.db.execute(stmt)
        contacto = res.scalars().first()
        if not contacto: 
            return False
        
        if "cargo" in data: contacto.cargo = data["cargo"]
        if "telefono" in data: contacto.telefono = data["telefono"]
        if "email" in data: contacto.correo = data["email"]
        if "is_client" in data: contacto.is_client = data["is_client"]
        
        await self.db.commit()
        return True

    async def delete_contacto(self, id: int):
        """Desactiva un contacto (soft delete)."""
        stmt = select(ClienteContacto).where(ClienteContacto.id == id)
        res = await self.db.execute(stmt)
        contacto = res.scalars().first()
        if contacto:
            contacto.is_active = False
            await self.db.commit()
        return True

    # =========================================================================
    # LISTADO Y ESTADÍSTICAS
    # =========================================================================

    async def get_contactos_paginado(self, page: int, page_size: int, search: str = None, estado: str = None):
        """Lista contactos paginados usando ORM."""
        
        # 1. Estadísticas Globales
        stmt_stats = select(
            func.count().label('total'),
            func.sum(case((ClienteContacto.estado == 'DISPONIBLE', 1), else_=0)).label('disponibles'),
            func.sum(case((ClienteContacto.estado == 'ASIGNADO', 1), else_=0)).label('asignados'),
            func.sum(case((ClienteContacto.estado == 'EN_GESTION', 1), else_=0)).label('en_gestion')
        ).where(ClienteContacto.is_active == True)
        
        stats_res = (await self.db.execute(stmt_stats)).first()
        
        # 2. Query Principal
        offset = (page - 1) * page_size
        stmt = select(
            ClienteContacto, 
            Cliente.razon_social.label("cliente_rs"), 
            RegistroImportacion.razon_social.label("import_rs"),
            CasoLlamada.nombre.label("caso_nombre"),
            CasoLlamada.contestado.label("caso_contestado")
        ).outerjoin(Cliente, ClienteContacto.ruc == Cliente.ruc) \
         .outerjoin(RegistroImportacion, ClienteContacto.ruc == RegistroImportacion.ruc) \
         .outerjoin(CasoLlamada, ClienteContacto.caso_id == CasoLlamada.id) \
         .where(ClienteContacto.is_active == True)

        if search:
            stmt = stmt.where(or_(
                ClienteContacto.ruc.like(f"%{search}%"),
                ClienteContacto.telefono.like(f"%{search}%"),
                Cliente.razon_social.like(f"%{search}%")
            ))
        
        if estado:
            stmt = stmt.where(ClienteContacto.estado == estado)
            
        # Count filtered
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_filtrado = (await self.db.execute(count_stmt)).scalar() or 0
        
        # Paginación
        stmt = stmt.order_by(ClienteContacto.created_at.desc()).offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        rows = result.all()
        
        data_list = []
        for row in rows:
            cc = row[0]
            razon_social = row[1] or row[2] or "Sin razón social"
            contestado = 'Sí' if row[4] else 'No'
            data_list.append({
                "id": cc.id,
                "ruc": cc.ruc,
                "nombre": cc.nombre,
                "razon_social": razon_social,
                "telefono": cc.telefono,
                "correo": cc.correo,
                "contestado": contestado,
                "caso": row[3],
                "estado": cc.estado,
                "asignado_a": cc.asignado_a,
                "fecha_asignacion": cc.fecha_asignacion,
                "created_at": cc.created_at
            })
            
        return {
            "stats": {
                "total_registros": stats_res.total or 0,
                "disponibles": stats_res.disponibles or 0,
                "asignados": stats_res.asignados or 0,
                "en_gestion": stats_res.en_gestion or 0,
                "total_filtrado": total_filtrado,
            },
            "page": page,
            "page_size": page_size,
            "data": data_list
        }

    async def get_estadisticas(self):
        """Retorna estadísticas de contactos."""
        stmt = select(
            func.count().label('total'),
            func.sum(case((ClienteContacto.estado == 'DISPONIBLE', 1), else_=0)).label('disponibles'),
            func.sum(case((ClienteContacto.estado == 'ASIGNADO', 1), else_=0)).label('asignados'),
            func.sum(case((ClienteContacto.estado == 'EN_GESTION', 1), else_=0)).label('en_gestion')
        ).where(ClienteContacto.is_active == True)
        
        row = (await self.db.execute(stmt)).first()
        return {
            "total": row.total or 0,
            "disponibles": row.disponibles or 0,
            "asignados": row.asignados or 0,
            "en_gestion": row.en_gestion or 0
        }

    # ============================================
    # MÉTODOS PARA COMERCIAL/BASE (LÓGICA COMPLEJA)
    # ============================================
    
    async def get_mis_contactos_asignados(self, user_id: int):
        """Obtiene los contactos asignados al comercial."""
        stmt = select(
            ClienteContacto, 
            RegistroImportacion.razon_social,
            Cliente.razon_social,
            CasoLlamada
        ).outerjoin(RegistroImportacion, ClienteContacto.ruc == RegistroImportacion.ruc) \
         .outerjoin(Cliente, ClienteContacto.ruc == Cliente.ruc) \
         .outerjoin(CasoLlamada, ClienteContacto.caso_id == CasoLlamada.id) \
         .where(
             ClienteContacto.asignado_a == user_id, 
             ClienteContacto.estado == 'ASIGNADO',
             ClienteContacto.is_active == True
         ).order_by(ClienteContacto.fecha_llamada.asc(), ClienteContacto.fecha_asignacion.desc())
         
        result = await self.db.execute(stmt)
        data = []
        for row in result.all():
            cc, ri_rs, cl_rs, caso = row
            data.append({
                "id": cc.id,
                "ruc": cc.ruc,
                "nombre": cc.nombre,
                "razon_social": ri_rs or cl_rs or "Sin razón social",
                "telefono": cc.telefono,
                "correo": cc.correo,
                "cargo": cc.cargo,
                "contesto": 1 if (caso and caso.contestado) else 0,
                "caso_id": cc.caso_id,
                "caso_nombre": caso.nombre if caso else None,
                "comentario": cc.comentario,
                "estado": cc.estado,
                "fecha_asignacion": cc.fecha_asignacion,
                "fecha_llamada": cc.fecha_llamada,
                "is_client": cc.is_client
            })
        return data
    
    async def cargar_base(self, user_id: int, pais_origen: list = None, partida_arancelaria: list = None):
        """
        Lógica de asignación de lotes con TRANSACCIÓN EXPLÍCITA.
        1. Verifica que no haya leads sin guardar.
        2. Marca gestionados.
        3. Selecciona nuevas empresas.
        4. Asigna.
        """
        # 1. Verificar leads sin guardar
        stmt_check = select(func.count()).where(
            ClienteContacto.asignado_a == user_id,
            ClienteContacto.estado == 'ASIGNADO',
            ClienteContacto.is_active == True,
            ClienteContacto.fecha_llamada.is_(None)
        )
        leads_sin_guardar = (await self.db.execute(stmt_check)).scalar()
        
        if leads_sin_guardar > 0:
            raise HTTPException(400, f"Tienes {leads_sin_guardar} contactos sin guardar. Guarda todos los registros primero.")
        
        # TRANSACCIÓN EXPLÍCITA para garantizar atomicidad
        async with self.db.begin_nested():
            # 2. Marcar contactos anteriores como GESTIONADO
            stmt_update_prev = update(ClienteContacto).where(
                ClienteContacto.asignado_a == user_id,
                ClienteContacto.estado == 'ASIGNADO',
                ClienteContacto.is_active == True,
                ClienteContacto.fecha_llamada.isnot(None)
            ).values(estado='GESTIONADO')
            await self.db.execute(stmt_update_prev)
            
            # 3. Obtener RUCs disponibles
            stmt_excluded = select(ClienteContacto.ruc).where(
                ClienteContacto.estado.in_(['EN_GESTION', 'ASIGNADO']),
                ClienteContacto.is_active == True
            ).distinct()
            
            stmt_clients = select(Cliente.ruc).where(Cliente.ruc.isnot(None))
            
            stmt_rucs = select(ClienteContacto.ruc).join(
                RegistroImportacion, ClienteContacto.ruc == RegistroImportacion.ruc
            ).where(
                ClienteContacto.is_client == False,
                ClienteContacto.is_active == True,
                ClienteContacto.estado == 'DISPONIBLE',
                ClienteContacto.ruc.notin_(stmt_excluded),
                ClienteContacto.ruc.notin_(stmt_clients)
            )
                
            if pais_origen:
                conditions = [RegistroImportacion.paises_origen.like(f"%{p}%") for p in pais_origen]
                stmt_rucs = stmt_rucs.where(or_(*conditions))
            if partida_arancelaria:
                conditions_partida = [RegistroImportacion.partida_arancelaria_cod.like(f"%{p}%") for p in partida_arancelaria]
                stmt_rucs = stmt_rucs.where(or_(*conditions_partida))
                
            stmt_rucs = stmt_rucs.group_by(ClienteContacto.ruc).order_by(func.newid()).limit(50)
            
            rucs_disponibles = (await self.db.execute(stmt_rucs)).scalars().all()
            
            if not rucs_disponibles:
                return {"success": True, "contactos": [], "cantidad": 0, "message": "No hay más leads disponibles con esos filtros."}
                
            # 4. Asignar UN contacto por RUC
            for ruc in rucs_disponibles:
                stmt_one = select(ClienteContacto).where(
                    ClienteContacto.ruc == ruc, 
                    ClienteContacto.estado == 'DISPONIBLE',
                    ClienteContacto.is_active == True
                ).limit(1)
                contact = (await self.db.execute(stmt_one)).scalars().first()
                
                if contact:
                    contact.asignado_a = user_id
                    contact.fecha_asignacion = func.now()
                    contact.lote_asignacion = (contact.lote_asignacion or 0) + 1
                    contact.estado = 'ASIGNADO'
                    contact.caso_id = None
                    contact.comentario = None
                    contact.fecha_llamada = None
                    
                # 5. Marcar otros de ese RUC como EN_GESTION
                stmt_others = update(ClienteContacto).where(
                    ClienteContacto.ruc == ruc,
                    ClienteContacto.estado == 'DISPONIBLE',
                    ClienteContacto.is_active == True
                ).values(estado='EN_GESTION')
                await self.db.execute(stmt_others)
        
        await self.db.commit()
        
        # Obtener contactos asignados y devolver con cantidad
        contactos = await self.get_mis_contactos_asignados(user_id)
        return {"contactos": contactos, "cantidad": len(contactos)}

    async def assign_leads_batch(self, user_id: int):
        """Asigna contactos a un comercial siguiendo la lógica de lotes y empresas únicas."""
        return await self.cargar_base(user_id)
    
    async def actualizar_feedback(self, contacto_id: int, caso_id: int, comentario: str, user_id: int = None):
        """Actualiza el feedback y crea Cliente si es positivo. Con TRANSACCIÓN EXPLÍCITA."""
        
        # Get Contact
        stmt_c = select(ClienteContacto).where(ClienteContacto.id == contacto_id)
        contact = (await self.db.execute(stmt_c)).scalars().first()
        if not contact: 
            raise HTTPException(404, "Contacto no encontrado")
        
        # Get Case
        stmt_caso = select(CasoLlamada).where(CasoLlamada.id == caso_id)
        caso = (await self.db.execute(stmt_caso)).scalars().first()
        is_positive = caso.is_positive if caso else False
        
        # Check if client exists
        stmt_cl = select(Cliente).where(Cliente.ruc == contact.ruc)
        cliente_existe = (await self.db.execute(stmt_cl)).scalars().first()
        
        mensaje = ""
        
        # TRANSACCIÓN EXPLÍCITA
        async with self.db.begin_nested():
            # Update Contact
            contact.caso_id = caso_id
            contact.comentario = comentario
            contact.fecha_llamada = func.now()
            contact.updated_at = func.now()
            
            if is_positive or cliente_existe:
                contact.is_client = True
                 
            if cliente_existe:
                mensaje = f"Nota: Este cliente ya está siendo gestionado (ID: {cliente_existe.id})"
            
            # Logic: Positive AND Not Exists -> Create Client
            if is_positive and not cliente_existe:
                # Get additional info from RegistroImportacion
                stmt_ri = select(RegistroImportacion).where(RegistroImportacion.ruc == contact.ruc)
                ri = (await self.db.execute(stmt_ri)).scalars().first()
                razon_social = ri.razon_social if ri else "Sin razón social"
                
                nuevo_cliente = Cliente(
                    ruc=contact.ruc,
                    razon_social=razon_social,
                    comercial_encargado_id=user_id or contact.asignado_a,
                    tipo_estado='PROSPECTO',
                    origen='BASE_COMERCIAL',
                    ultimo_contacto=func.now(),
                    comentario_ultima_llamada=comentario,
                    is_active=True,
                    created_by=user_id
                )
                self.db.add(nuevo_cliente)
                await self.db.flush()
                
                # Mark all contacts of this RUC as is_client
                await self.db.execute(
                    update(ClienteContacto).where(ClienteContacto.ruc == contact.ruc).values(is_client=True)
                )
                
                # Mark managed
                await self.db.execute(update(ClienteContacto).where(
                    ClienteContacto.ruc == contact.ruc, 
                    ClienteContacto.estado == 'EN_GESTION',
                    ClienteContacto.is_active == True
                ).values(estado='GESTIONADO'))
                 
            # Logic: Negative -> Release others
            if not is_positive and not cliente_existe:
                await self.db.execute(update(ClienteContacto).where(
                    ClienteContacto.ruc == contact.ruc,
                    ClienteContacto.estado == 'EN_GESTION',
                    ClienteContacto.is_active == True
                ).values(estado='DISPONIBLE'))
        
        await self.db.commit()
        return {"success": True, "mensaje": mensaje}
    
    async def enviar_feedback_lote(self, user_id: int):
        """Envía el feedback de todos los contactos asignados y los marca como gestionados."""
        async with self.db.begin_nested():
            stmt = update(ClienteContacto).where(
                ClienteContacto.asignado_a == user_id,
                ClienteContacto.estado == 'ASIGNADO',
                ClienteContacto.is_active == True,
                ClienteContacto.fecha_llamada.isnot(None)
            ).values(estado='GESTIONADO')
            await self.db.execute(stmt)
        
        await self.db.commit()
        return {"success": True, "message": "Feedback enviado correctamente"}
    
    async def get_filtros_base(self):
        """Obtiene países y partidas disponibles para filtrar."""
        # Queries for distinct values using raw SQL for STRING_SPLIT (MSSQL specific)
        paises_result = await self.db.execute(text("""
            SELECT TOP 50 
                TRIM(value) as pais,
                COUNT(*) as cantidad
            FROM comercial.registro_importaciones
            CROSS APPLY STRING_SPLIT(REPLACE(paises_origen, '|', ','), ',')
            WHERE TRIM(value) != ''
            GROUP BY TRIM(value)
            ORDER BY COUNT(*) DESC
        """))
        paises = [{"pais": row[0], "cantidad": row[1]} for row in paises_result.fetchall()]
        
        partidas_result = await self.db.execute(text("""
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
