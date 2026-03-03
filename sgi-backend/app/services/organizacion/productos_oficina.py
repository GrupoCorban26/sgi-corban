import logging
import math
from typing import Optional

from sqlalchemy import select, func, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.administrativo import ProductoOficina, CategoriaProductoOficina

logger = logging.getLogger(__name__)


class ProductoOficinaService:
    """Servicio para gestionar productos consumibles de oficina"""

    # ============================================================
    # PRODUCTOS
    # ============================================================

    @staticmethod
    async def listar_productos(
        db: AsyncSession,
        busqueda: Optional[str] = None,
        categoria_id: Optional[int] = None,
        solo_stock_bajo: bool = False,
        page: int = 1,
        page_size: int = 15,
    ) -> dict:
        """Lista productos con paginación y filtros"""
        query = (
            select(ProductoOficina)
            .outerjoin(CategoriaProductoOficina)
            .where(ProductoOficina.is_active == True)
        )

        # Filtro de búsqueda
        if busqueda:
            patron = f"%{busqueda}%"
            query = query.where(
                or_(
                    ProductoOficina.nombre.ilike(patron),
                    ProductoOficina.ubicacion.ilike(patron),
                    CategoriaProductoOficina.nombre.ilike(patron),
                )
            )

        # Filtro por categoría
        if categoria_id:
            query = query.where(ProductoOficina.categoria_id == categoria_id)

        # Filtro stock bajo (stock_actual <= stock_minimo)
        if solo_stock_bajo:
            query = query.where(ProductoOficina.stock_actual <= ProductoOficina.stock_minimo)

        # Contar total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        total_pages = math.ceil(total / page_size) if page_size > 0 else 0

        # Paginación y orden
        query = (
            query.order_by(ProductoOficina.nombre)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await db.execute(query)
        productos = result.scalars().all()

        data = []
        for p in productos:
            # Cargar la categoría de forma lazy si no está cargada
            categoria_nombre = None
            if p.categoria_id:
                cat_result = await db.execute(
                    select(CategoriaProductoOficina.nombre)
                    .where(CategoriaProductoOficina.id == p.categoria_id)
                )
                categoria_nombre = cat_result.scalar()

            data.append({
                "id": p.id,
                "nombre": p.nombre,
                "categoria_id": p.categoria_id,
                "categoria_nombre": categoria_nombre,
                "unidad_medida": p.unidad_medida,
                "stock_actual": p.stock_actual,
                "stock_minimo": p.stock_minimo,
                "precio_unitario": p.precio_unitario,
                "ubicacion": p.ubicacion,
                "observaciones": p.observaciones,
                "is_active": p.is_active,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
            })

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "data": data,
        }

    @staticmethod
    async def obtener_producto(db: AsyncSession, producto_id: int) -> Optional[dict]:
        """Obtiene un producto por su ID"""
        result = await db.execute(
            select(ProductoOficina).where(
                ProductoOficina.id == producto_id,
                ProductoOficina.is_active == True,
            )
        )
        p = result.scalar_one_or_none()
        if not p:
            return None

        categoria_nombre = None
        if p.categoria_id:
            cat_result = await db.execute(
                select(CategoriaProductoOficina.nombre)
                .where(CategoriaProductoOficina.id == p.categoria_id)
            )
            categoria_nombre = cat_result.scalar()

        return {
            "id": p.id,
            "nombre": p.nombre,
            "categoria_id": p.categoria_id,
            "categoria_nombre": categoria_nombre,
            "unidad_medida": p.unidad_medida,
            "stock_actual": p.stock_actual,
            "stock_minimo": p.stock_minimo,
            "precio_unitario": p.precio_unitario,
            "ubicacion": p.ubicacion,
            "observaciones": p.observaciones,
            "is_active": p.is_active,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }

    @staticmethod
    async def crear_producto(db: AsyncSession, datos: dict) -> dict:
        """Crea un nuevo producto de oficina"""
        producto = ProductoOficina(**datos)
        db.add(producto)
        await db.commit()
        await db.refresh(producto)
        logger.info(f"Producto de oficina creado: {producto.nombre} (ID: {producto.id})")
        return {"success": True, "message": "Producto creado exitosamente", "id": producto.id}

    @staticmethod
    async def actualizar_producto(db: AsyncSession, producto_id: int, datos: dict) -> dict:
        """Actualiza un producto existente"""
        result = await db.execute(
            select(ProductoOficina).where(
                ProductoOficina.id == producto_id,
                ProductoOficina.is_active == True,
            )
        )
        producto = result.scalar_one_or_none()
        if not producto:
            return {"success": False, "message": "Producto no encontrado"}

        for campo, valor in datos.items():
            if valor is not None:
                setattr(producto, campo, valor)

        await db.commit()
        logger.info(f"Producto de oficina actualizado: ID {producto_id}")
        return {"success": True, "message": "Producto actualizado exitosamente", "id": producto_id}

    @staticmethod
    async def eliminar_producto(db: AsyncSession, producto_id: int) -> dict:
        """Da de baja un producto (soft delete)"""
        result = await db.execute(
            select(ProductoOficina).where(
                ProductoOficina.id == producto_id,
                ProductoOficina.is_active == True,
            )
        )
        producto = result.scalar_one_or_none()
        if not producto:
            return {"success": False, "message": "Producto no encontrado"}

        producto.is_active = False
        await db.commit()
        logger.info(f"Producto de oficina dado de baja: ID {producto_id}")
        return {"success": True, "message": "Producto eliminado exitosamente"}

    @staticmethod
    async def ajustar_stock(db: AsyncSession, producto_id: int, cantidad: int, motivo: str) -> dict:
        """
        Ajusta el stock de un producto.
        cantidad positiva = entrada, cantidad negativa = salida.
        """
        result = await db.execute(
            select(ProductoOficina).where(
                ProductoOficina.id == producto_id,
                ProductoOficina.is_active == True,
            )
        )
        producto = result.scalar_one_or_none()
        if not producto:
            return {"success": False, "message": "Producto no encontrado"}

        nuevo_stock = producto.stock_actual + cantidad
        if nuevo_stock < 0:
            return {"success": False, "message": f"Stock insuficiente. Stock actual: {producto.stock_actual}"}

        producto.stock_actual = nuevo_stock
        await db.commit()

        tipo = "entrada" if cantidad > 0 else "salida"
        logger.info(
            f"Ajuste de stock ({tipo}): Producto ID {producto_id}, "
            f"Cantidad: {cantidad}, Nuevo stock: {nuevo_stock}, Motivo: {motivo}"
        )
        return {
            "success": True,
            "message": f"Stock ajustado. Nuevo stock: {nuevo_stock}",
            "id": producto_id,
        }

    # ============================================================
    # CATEGORÍAS
    # ============================================================

    @staticmethod
    async def listar_categorias(db: AsyncSession) -> list:
        """Lista todas las categorías activas con conteo de productos"""
        result = await db.execute(
            select(
                CategoriaProductoOficina,
                func.count(ProductoOficina.id).label("cantidad_productos"),
            )
            .outerjoin(
                ProductoOficina,
                (ProductoOficina.categoria_id == CategoriaProductoOficina.id)
                & (ProductoOficina.is_active == True),
            )
            .where(CategoriaProductoOficina.is_active == True)
            .group_by(CategoriaProductoOficina.id)
            .order_by(CategoriaProductoOficina.nombre)
        )
        rows = result.all()
        return [
            {
                "id": cat.id,
                "nombre": cat.nombre,
                "descripcion": cat.descripcion,
                "is_active": cat.is_active,
                "cantidad_productos": cantidad,
            }
            for cat, cantidad in rows
        ]

    @staticmethod
    async def crear_categoria(db: AsyncSession, datos: dict) -> dict:
        """Crea una nueva categoría"""
        # Verificar nombre único
        existente = await db.execute(
            select(CategoriaProductoOficina).where(
                CategoriaProductoOficina.nombre == datos["nombre"],
                CategoriaProductoOficina.is_active == True,
            )
        )
        if existente.scalar_one_or_none():
            return {"success": False, "message": "Ya existe una categoría con ese nombre"}

        categoria = CategoriaProductoOficina(**datos)
        db.add(categoria)
        await db.commit()
        await db.refresh(categoria)
        logger.info(f"Categoría creada: {categoria.nombre} (ID: {categoria.id})")
        return {"success": True, "message": "Categoría creada exitosamente", "id": categoria.id}

    @staticmethod
    async def actualizar_categoria(db: AsyncSession, categoria_id: int, datos: dict) -> dict:
        """Actualiza una categoría"""
        result = await db.execute(
            select(CategoriaProductoOficina).where(
                CategoriaProductoOficina.id == categoria_id,
                CategoriaProductoOficina.is_active == True,
            )
        )
        categoria = result.scalar_one_or_none()
        if not categoria:
            return {"success": False, "message": "Categoría no encontrada"}

        # Verificar nombre único si se cambia
        if datos.get("nombre") and datos["nombre"] != categoria.nombre:
            existente = await db.execute(
                select(CategoriaProductoOficina).where(
                    CategoriaProductoOficina.nombre == datos["nombre"],
                    CategoriaProductoOficina.is_active == True,
                    CategoriaProductoOficina.id != categoria_id,
                )
            )
            if existente.scalar_one_or_none():
                return {"success": False, "message": "Ya existe otra categoría con ese nombre"}

        for campo, valor in datos.items():
            if valor is not None:
                setattr(categoria, campo, valor)

        await db.commit()
        return {"success": True, "message": "Categoría actualizada exitosamente", "id": categoria_id}

    @staticmethod
    async def eliminar_categoria(db: AsyncSession, categoria_id: int) -> dict:
        """Elimina una categoría (soft delete). No permite si tiene productos activos."""
        result = await db.execute(
            select(CategoriaProductoOficina).where(
                CategoriaProductoOficina.id == categoria_id,
                CategoriaProductoOficina.is_active == True,
            )
        )
        categoria = result.scalar_one_or_none()
        if not categoria:
            return {"success": False, "message": "Categoría no encontrada"}

        # Verificar que no tenga productos activos
        productos_count = await db.execute(
            select(func.count(ProductoOficina.id)).where(
                ProductoOficina.categoria_id == categoria_id,
                ProductoOficina.is_active == True,
            )
        )
        count = productos_count.scalar() or 0
        if count > 0:
            return {
                "success": False,
                "message": f"No se puede eliminar: tiene {count} producto(s) asociado(s)",
            }

        categoria.is_active = False
        await db.commit()
        logger.info(f"Categoría eliminada: ID {categoria_id}")
        return {"success": True, "message": "Categoría eliminada exitosamente"}
