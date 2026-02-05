"""
ContactosCrudService - Operaciones CRUD y listados para contactos.
Responsabilidad única: crear, leer, actualizar, eliminar y listar contactos.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, case
from app.models.comercial import ClienteContacto, Cliente, CasoLlamada, RegistroImportacion


class ContactosCrudService:
    """Servicio CRUD para contactos."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

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

    async def get_kpis_gestion(self, fecha_inicio=None, fecha_fin=None):
        """Calcula KPIs de gestión para dashboard de sistemas."""
        
        # Helper para filtros de fecha
        def aplicar_filtro_fecha(query, campo_fecha):
            if fecha_inicio:
                query = query.where(campo_fecha >= fecha_inicio)
            if fecha_fin:
                query = query.where(campo_fecha <= fecha_fin)
            return query

        # 1. Total Repartido (ASIGNADO + GESTIONADO)
        # Se filtra por FECHA DE ASIGNACIÓN
        stmt_repartido = select(func.count()).select_from(ClienteContacto).where(
            ClienteContacto.estado.in_(['ASIGNADO', 'GESTIONADO']),
            ClienteContacto.is_active == True
        )
        stmt_repartido = aplicar_filtro_fecha(stmt_repartido, ClienteContacto.fecha_asignacion)
        total_repartido = (await self.db.execute(stmt_repartido)).scalar() or 0
        
        # Para las siguientes métricas, usamos FECHA DE LLAMADA (gestión realizada)
        
        # 2. Total Gestionados (Denominador estadístico general)
        # El usuario cambió la lógica para filtrar por "contestado"
        stmt_gestionados = select(func.count()).select_from(ClienteContacto).join(
            CasoLlamada, ClienteContacto.caso_id == CasoLlamada.id
        ).where(
            CasoLlamada.contestado == True,
            ClienteContacto.is_active == True
        )
        stmt_gestionados = aplicar_filtro_fecha(stmt_gestionados, ClienteContacto.fecha_llamada)
        total_gestionados = (await self.db.execute(stmt_gestionados)).scalar() or 0

        # [MODIFICADO] 2b. Total Gestionables (Denominador para Tasa de Contactabilidad)
        # El usuario pidió: "todos los que tienen gestionable = 1"
        stmt_gestionables = select(func.count()).select_from(ClienteContacto).join(
            CasoLlamada, ClienteContacto.caso_id == CasoLlamada.id
        ).where(
            CasoLlamada.gestionable == True,
            ClienteContacto.is_active == True
        )
        stmt_gestionables = aplicar_filtro_fecha(stmt_gestionables, ClienteContacto.fecha_llamada)
        total_gestionables = (await self.db.execute(stmt_gestionables)).scalar() or 0
        
        # 3. Contestados (Numerador contactabilidad)
        stmt_contestados = select(func.count()).select_from(ClienteContacto).join(
            CasoLlamada, ClienteContacto.caso_id == CasoLlamada.id
        ).where(
            ClienteContacto.estado == 'GESTIONADO',
            ClienteContacto.is_active == True,
            CasoLlamada.contestado == True
        )
        stmt_contestados = aplicar_filtro_fecha(stmt_contestados, ClienteContacto.fecha_llamada)
        total_contestados = (await self.db.execute(stmt_contestados)).scalar() or 0
        
        # 4. Positivos (Numerador eficiencia)
        casos_positivos = ['Contestó - Interesado', 'Contestó - Solicita cotización']
        stmt_positivos = select(func.count()).select_from(ClienteContacto).join(
            CasoLlamada, ClienteContacto.caso_id == CasoLlamada.id
        ).where(
            ClienteContacto.estado == 'GESTIONADO',
            ClienteContacto.is_active == True,
            CasoLlamada.nombre.in_(casos_positivos)
        )
        stmt_positivos = aplicar_filtro_fecha(stmt_positivos, ClienteContacto.fecha_llamada)
        total_positivos = (await self.db.execute(stmt_positivos)).scalar() or 0
        
        # 5. Distribución de Casos (para gráfico de torta)
        stmt_casos = select(
            CasoLlamada.nombre,
            func.count()
        ).select_from(ClienteContacto).join(
            CasoLlamada, ClienteContacto.caso_id == CasoLlamada.id
        ).where(
            ClienteContacto.estado == 'GESTIONADO',
            ClienteContacto.is_active == True,
            CasoLlamada.nombre.isnot(None)
        ).group_by(CasoLlamada.nombre)
        
        stmt_casos = aplicar_filtro_fecha(stmt_casos, ClienteContacto.fecha_llamada)
        
        casos_result = await self.db.execute(stmt_casos)
        casos_distribucion = [{"name": row[0], "value": row[1]} for row in casos_result.all()]
        
        # Calculos
        # Tasa Contactabilidad = Contestados / Gestionables (antes Gestionados)
        tasa_contactabilidad = (total_contestados / total_gestionables * 100) if total_gestionables > 0 else 0
        
        # Tasa Éxito = Positivos / Contestados
        tasa_positivos = (total_positivos / total_contestados * 100) if total_contestados > 0 else 0
        
        return {
            "total_repartido": total_repartido,
            "tasa_contactabilidad": round(tasa_contactabilidad, 1),
            "tasa_positivos": round(tasa_positivos, 1),
            "casos_distribucion": casos_distribucion
        }
