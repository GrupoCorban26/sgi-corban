from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.cliente import ClienteCreate, ClienteUpdate


class ClientesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        busqueda: str = None,
        tipo_estado: str = None,
        comercial_id: int = None,
        area_id: int = None,
        page: int = 1,
        page_size: int = 15
    ) -> dict:
        """Lista clientes con paginación y filtros"""
        offset = (page - 1) * page_size
        
        where_clauses = ["c.is_active = 1"]
        params = {"offset": offset, "page_size": page_size}
        
        if busqueda:
            where_clauses.append("(c.ruc LIKE '%' + :busqueda + '%' OR c.razon_social LIKE '%' + :busqueda + '%')")
            params["busqueda"] = busqueda
        
        if tipo_estado:
            where_clauses.append("c.tipo_estado = :tipo_estado")
            params["tipo_estado"] = tipo_estado
        
        if comercial_id:
            where_clauses.append("c.comercial_encargado_id = :comercial_id")
            params["comercial_id"] = comercial_id
            
        if area_id:
            where_clauses.append("c.area_encargada_id = :area_id")
            params["area_id"] = area_id
        
        where_sql = " AND ".join(where_clauses)
        
        # Count
        count_query = f"SELECT COUNT(*) FROM comercial.clientes c WHERE {where_sql}"
        count_result = await self.db.execute(text(count_query), params)
        total = count_result.scalar() or 0
        
        # Data
        data_query = f"""
            SELECT 
                c.id,
                c.ruc,
                c.razon_social,
                c.nombre_comercial,
                c.direccion_fiscal,
                c.distrito_id,
                c.area_encargada_id,
                a.nombre as area_nombre,
                c.comercial_encargado_id,
                CONCAT(e.nombres, ' ', e.apellido_paterno) as comercial_nombre,
                c.ultimo_contacto,
                c.comentario_ultima_llamada,
                c.proxima_fecha_contacto,
                c.tipo_estado,
                c.origen,
                c.is_active,
                c.created_at
            FROM comercial.clientes c
            LEFT JOIN adm.areas a ON c.area_encargada_id = a.id
            LEFT JOIN adm.empleados e ON c.comercial_encargado_id = e.id
            WHERE {where_sql}
            ORDER BY c.created_at DESC
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
        """
        result = await self.db.execute(text(data_query), params)
        data = result.mappings().all()
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            "data": [dict(row) for row in data]
        }

    async def get_by_id(self, id: int) -> dict:
        """Obtiene un cliente por ID"""
        query = text("""
            SELECT 
                c.*,
                a.nombre as area_nombre,
                CONCAT(e.nombres, ' ', e.apellido_paterno) as comercial_nombre
            FROM comercial.clientes c
            LEFT JOIN adm.areas a ON c.area_encargada_id = a.id
            LEFT JOIN adm.empleados e ON c.comercial_encargado_id = e.id
            WHERE c.id = :id
        """)
        result = await self.db.execute(query, {"id": id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def create(
        self, 
        cliente: ClienteCreate, 
        comercial_id: int,
        area_id: int = None,
        created_by: int = None
    ) -> dict:
        """Crea un nuevo cliente"""
        # Si no se especifica área, buscar el ID del área "Ventas"
        if not area_id:
            area_query = text("SELECT id FROM adm.areas WHERE nombre LIKE '%Ventas%' AND is_active = 1")
            area_result = await self.db.execute(area_query)
            area_row = area_result.first()
            area_id = area_row[0] if area_row else None
        
        query = text("""
            INSERT INTO comercial.clientes (
                ruc, razon_social, nombre_comercial, direccion_fiscal, 
                distrito_id, area_encargada_id, comercial_encargado_id,
                tipo_estado, origen, comentario_ultima_llamada, 
                proxima_fecha_contacto, created_by, created_at
            )
            OUTPUT INSERTED.id
            VALUES (
                :ruc, :razon_social, :nombre_comercial, :direccion_fiscal,
                :distrito_id, :area_id, :comercial_id,
                :tipo_estado, :origen, :comentario,
                :proxima_fecha, :created_by, GETDATE()
            )
        """)
        result = await self.db.execute(query, {
            "ruc": cliente.ruc,
            "razon_social": cliente.razon_social,
            "nombre_comercial": cliente.nombre_comercial,
            "direccion_fiscal": cliente.direccion_fiscal,
            "distrito_id": cliente.distrito_id,
            "area_id": area_id,
            "comercial_id": comercial_id,
            "tipo_estado": cliente.tipo_estado,
            "origen": cliente.origen or "MANUAL",
            "comentario": cliente.comentario_ultima_llamada,
            "proxima_fecha": cliente.proxima_fecha_contacto,
            "created_by": created_by
        })
        await self.db.commit()
        row = result.first()
        return {"success": 1, "id": row[0], "message": "Cliente creado correctamente"}

    async def update(self, id: int, cliente: ClienteUpdate, updated_by: int = None) -> dict:
        """Actualiza un cliente"""
        # Construir campos a actualizar dinámicamente
        updates = []
        params = {"id": id, "updated_by": updated_by}
        
        if cliente.razon_social is not None:
            updates.append("razon_social = :razon_social")
            params["razon_social"] = cliente.razon_social
        if cliente.ruc is not None:
            updates.append("ruc = :ruc")
            params["ruc"] = cliente.ruc
        if cliente.nombre_comercial is not None:
            updates.append("nombre_comercial = :nombre_comercial")
            params["nombre_comercial"] = cliente.nombre_comercial
        if cliente.direccion_fiscal is not None:
            updates.append("direccion_fiscal = :direccion_fiscal")
            params["direccion_fiscal"] = cliente.direccion_fiscal
        if cliente.distrito_id is not None:
            updates.append("distrito_id = :distrito_id")
            params["distrito_id"] = cliente.distrito_id
        if cliente.area_encargada_id is not None:
            updates.append("area_encargada_id = :area_encargada_id")
            params["area_encargada_id"] = cliente.area_encargada_id
        if cliente.comercial_encargado_id is not None:
            updates.append("comercial_encargado_id = :comercial_encargado_id")
            params["comercial_encargado_id"] = cliente.comercial_encargado_id
        if cliente.tipo_estado is not None:
            updates.append("tipo_estado = :tipo_estado")
            params["tipo_estado"] = cliente.tipo_estado
        if cliente.comentario_ultima_llamada is not None:
            updates.append("comentario_ultima_llamada = :comentario")
            params["comentario"] = cliente.comentario_ultima_llamada
        if cliente.proxima_fecha_contacto is not None:
            updates.append("proxima_fecha_contacto = :proxima_fecha")
            params["proxima_fecha"] = cliente.proxima_fecha_contacto
        
        updates.append("updated_at = GETDATE()")
        updates.append("updated_by = :updated_by")
        
        query = text(f"UPDATE comercial.clientes SET {', '.join(updates)} WHERE id = :id")
        await self.db.execute(query, params)
        await self.db.commit()
        return {"success": 1, "message": "Cliente actualizado correctamente"}

    async def delete(self, id: int, updated_by: int = None) -> dict:
        """Desactiva un cliente (soft delete)"""
        query = text("""
            UPDATE comercial.clientes 
            SET is_active = 0, updated_at = GETDATE(), updated_by = :updated_by 
            WHERE id = :id
        """)
        await self.db.execute(query, {"id": id, "updated_by": updated_by})
        await self.db.commit()
        return {"success": 1, "message": "Cliente desactivado correctamente"}

    async def get_dropdown(self) -> list:
        """Lista simple para dropdowns"""
        query = text("""
            SELECT id, razon_social, ruc 
            FROM comercial.clientes 
            WHERE is_active = 1 
            ORDER BY razon_social
        """)
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def get_stats(self, comercial_id: int = None) -> dict:
        """Estadísticas de clientes"""
        where = "WHERE is_active = 1"
        params = {}
        if comercial_id:
            where += " AND comercial_encargado_id = :comercial_id"
            params["comercial_id"] = comercial_id
        
        query = text(f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN tipo_estado = 'PROSPECTO' THEN 1 ELSE 0 END) as prospectos,
                SUM(CASE WHEN tipo_estado = 'CLIENTE' THEN 1 ELSE 0 END) as clientes_activos,
                SUM(CASE WHEN tipo_estado = 'INACTIVO' THEN 1 ELSE 0 END) as inactivos
            FROM comercial.clientes
            {where}
        """)
        result = await self.db.execute(query, params)
        row = result.mappings().first()
        return dict(row) if row else {"total": 0, "prospectos": 0, "clientes_activos": 0, "inactivos": 0}
