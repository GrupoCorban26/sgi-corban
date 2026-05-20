from fastapi import HTTPException
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, or_, desc, update, and_, literal_column
from app.schemas.comercial.cliente import ClienteCreate, ClienteUpdate
from app.models.comercial import Cliente, ClienteContacto, CasoLlamada
from app.models.comercial_catalogos import EstadoCliente, OrigenCliente, MedioGestion, MotivoGestion
from app.models.cliente_historial import ClienteHistorial
from app.models.cliente_gestion import ClienteGestion
from app.models.historial_llamadas import HistorialLlamada
from app.models.comercial_base import BaseContacto
from app.models.comercial_inbox import Inbox
from app.models.chat_message import ChatMessage
from app.models.administrativo import Empleado
from app.models.seguridad import Usuario
from datetime import datetime, timedelta, date

logger = logging.getLogger(__name__)

# Transiciones válidas del pipeline de ventas (nombre_estado → [destinos])
TRANSICIONES_VALIDAS: dict[str, list[str]] = {
    "PROSPECTO":          ["EN_NEGOCIACION", "CAIDO", "INACTIVO"],
    "EN_NEGOCIACION":     ["CERRADA", "CAIDO", "PROSPECTO"],
    "CERRADA":            ["EN_OPERACION", "CAIDO"],
    "EN_OPERACION":       ["CARGA_ENTREGADA"],
    "CARGA_ENTREGADA":    ["PROSPECTO", "EN_NEGOCIACION"],
    "CAIDO":              ["PROSPECTO", "INACTIVO"],
    "INACTIVO":           ["PROSPECTO"],
}


class ClientesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_estado_id(self, nombre: str) -> int:
        """Obtiene el ID de un estado de cliente por nombre."""
        result = await self.db.execute(select(EstadoCliente.id).where(EstadoCliente.nombre == nombre))
        estado_id = result.scalar()
        if not estado_id:
            raise HTTPException(500, f"Estado '{nombre}' no encontrado en catálogo")
        return estado_id

    async def _get_estado_nombre(self, estado_id: int) -> str:
        """Obtiene el nombre de un estado por ID."""
        result = await self.db.execute(select(EstadoCliente.nombre).where(EstadoCliente.id == estado_id))
        return result.scalar() or "DESCONOCIDO"

    async def get_all(
        self,
        busqueda: str = None,
        estado_id: int = None,
        comercial_ids: list[int] = None,
        filtro_fecha: str = None,
        ordenar_por: str = None,
        page: int = 1,
        page_size: int = 15
    ) -> dict:
        """Lista clientes con paginación y filtros. Si page_size=0, retorna todos los registros sin límite."""
        offset = (page - 1) * page_size if page_size > 0 else 0

        subq_telefono_principal = (
            select(func.string_agg(ClienteContacto.telefono, literal_column("' - '")))
            .where(
                ClienteContacto.ruc == Cliente.ruc,
                ClienteContacto.is_principal == True,
                ClienteContacto.is_active == True
            )
            .correlate(Cliente)
            .scalar_subquery()
        )

        subq_telefono_fallback = (
            select(ClienteContacto.telefono)
            .where(
                ClienteContacto.ruc == Cliente.ruc,
                ClienteContacto.is_active == True
            )
            .order_by(ClienteContacto.created_at.desc())
            .limit(1)
            .correlate(Cliente)
            .scalar_subquery()
        )

        subq_correo = (
            select(ClienteContacto.correo)
            .where(ClienteContacto.ruc == Cliente.ruc)
            .order_by(ClienteContacto.is_principal.desc(), ClienteContacto.created_at.desc())
            .limit(1)
            .correlate(Cliente)
            .scalar_subquery()
        )

        subq_nombre_contacto = (
            select(ClienteContacto.nombre)
            .where(ClienteContacto.ruc == Cliente.ruc)
            .order_by(ClienteContacto.is_principal.desc(), ClienteContacto.created_at.desc())
            .limit(1)
            .correlate(Cliente)
            .scalar_subquery()
        )

        # ── Último comentario (fuente dual: gestiones de cartera + llamadas de base) ──
        # Gestión de cartera (cliente_gestiones)
        subq_gest_comentario = (
            select(ClienteGestion.comentario)
            .where(ClienteGestion.cliente_id == Cliente.id, ClienteGestion.comentario.isnot(None))
            .order_by(ClienteGestion.created_at.desc())
            .limit(1)
            .correlate(Cliente)
            .scalar_subquery()
        )
        subq_gest_fecha = (
            select(ClienteGestion.created_at)
            .where(ClienteGestion.cliente_id == Cliente.id, ClienteGestion.comentario.isnot(None))
            .order_by(ClienteGestion.created_at.desc())
            .limit(1)
            .correlate(Cliente)
            .scalar_subquery()
        )

        # Llamadas de base (historial_llamadas vía BaseContacto → RUC del comercial asignado)
        subq_ll_comentario = (
            select(HistorialLlamada.comentario)
            .join(BaseContacto, HistorialLlamada.base_id == BaseContacto.id)
            .where(
                BaseContacto.ruc == Cliente.ruc,
                HistorialLlamada.comercial_id == Cliente.comercial_encargado_id,
                HistorialLlamada.caso_id.isnot(None),
                HistorialLlamada.comentario.isnot(None),
            )
            .order_by(HistorialLlamada.created_at.desc())
            .limit(1)
            .correlate(Cliente)
            .scalar_subquery()
        )
        subq_ll_fecha = (
            select(HistorialLlamada.created_at)
            .join(BaseContacto, HistorialLlamada.base_id == BaseContacto.id)
            .where(
                BaseContacto.ruc == Cliente.ruc,
                HistorialLlamada.comercial_id == Cliente.comercial_encargado_id,
                HistorialLlamada.caso_id.isnot(None),
                HistorialLlamada.comentario.isnot(None),
            )
            .order_by(HistorialLlamada.created_at.desc())
            .limit(1)
            .correlate(Cliente)
            .scalar_subquery()
        )

        # Elegir el comentario más reciente entre ambas fuentes
        subq_ultimo_comentario = case(
            (subq_gest_fecha.is_(None), subq_ll_comentario),
            (subq_ll_fecha.is_(None), subq_gest_comentario),
            (subq_gest_fecha >= subq_ll_fecha, subq_gest_comentario),
            else_=subq_ll_comentario
        )

        stmt = select(
            Cliente,
            EstadoCliente.nombre.label("estado_nombre"),
            OrigenCliente.nombre.label("origen_nombre"),
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre"),
            func.coalesce(subq_telefono_principal, subq_telefono_fallback).label("telefono_contacto"),
            subq_correo.label("correo_contacto"),
            subq_nombre_contacto.label("nombre_contacto"),
            subq_ultimo_comentario.label("ultimo_comentario")
        ).outerjoin(EstadoCliente, Cliente.estado_id == EstadoCliente.id) \
         .outerjoin(OrigenCliente, Cliente.origen_id == OrigenCliente.id) \
         .outerjoin(Usuario, Cliente.comercial_encargado_id == Usuario.id) \
         .outerjoin(Empleado, Usuario.empleado_id == Empleado.id) \
         .where(Cliente.is_active == True)

        if busqueda:
            stmt = stmt.where(or_(
                Cliente.ruc.ilike(f"%{busqueda}%"),
                Cliente.razon_social.ilike(f"%{busqueda}%")
            ))

        if estado_id:
            stmt = stmt.where(Cliente.estado_id == estado_id)

        if comercial_ids:
            stmt = stmt.where(Cliente.comercial_encargado_id.in_(comercial_ids))

        if filtro_fecha:
            today = datetime.now().date()
            if filtro_fecha == 'vencidos':
                stmt = stmt.where(Cliente.proxima_fecha_contacto < today)
            elif filtro_fecha == 'hoy':
                stmt = stmt.where(Cliente.proxima_fecha_contacto == today)
            elif filtro_fecha == 'proximos_7_dias':
                limit_date = today + timedelta(days=7)
                stmt = stmt.where(and_(
                    Cliente.proxima_fecha_contacto >= today,
                    Cliente.proxima_fecha_contacto <= limit_date
                ))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Ordenamiento dinámico (SQL Server no soporta NULLS LAST, se usa CASE)
        null_last = case((Cliente.proxima_fecha_contacto.is_(None), 1), else_=0)
        if ordenar_por == 'proxima_fecha_asc':
            stmt = stmt.order_by(null_last, Cliente.proxima_fecha_contacto.asc())
        elif ordenar_por == 'proxima_fecha_desc':
            stmt = stmt.order_by(null_last, Cliente.proxima_fecha_contacto.desc())
        else:
            stmt = stmt.order_by(Cliente.created_at.desc())

        if page_size > 0:
            stmt = stmt.offset(offset).limit(page_size)
            
        result = await self.db.execute(stmt)
        rows = result.all()

        data = []
        for row in rows:
            c = row[0]
            data.append({
                "id": c.id,
                "ruc": c.ruc,
                "razon_social": c.razon_social,
                "direccion_fiscal": c.direccion_fiscal,
                "distrito_id": c.distrito_id,
                "comercial_encargado_id": c.comercial_encargado_id,
                "comercial_nombre": row.comercial_nombre,
                "telefono": row.telefono_contacto,
                "correo": row.correo_contacto,
                "nombre_contacto": row.nombre_contacto,
                "proxima_fecha_contacto": c.proxima_fecha_contacto,
                "estado_id": c.estado_id,
                "estado_nombre": row.estado_nombre,
                "origen_id": c.origen_id,
                "origen_nombre": row.origen_nombre,
                "is_active": c.is_active,
                "created_at": c.created_at,
                "ultimo_comentario": row.ultimo_comentario
            })

        return {
            "total": total,
            "page": page,
            "page_size": page_size if page_size > 0 else total,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 and total > 0 else 1,
            "data": data
        }

    async def get_stats(self, comercial_ids: list[int] = None) -> dict:
        """Estadísticas de clientes por estado y origen."""
        base_filter = Cliente.is_active == True
        hace_30_dias = datetime.now() - timedelta(days=30)

        # Obtener IDs de estados
        estados = await self.db.execute(select(EstadoCliente.id, EstadoCliente.nombre))
        estado_map = {row.nombre: row.id for row in estados.all()}

        stmt = select(
            func.count().label('total'),
            *[func.sum(case((Cliente.estado_id == estado_map.get(nombre, 0), 1), else_=0)).label(label)
              for nombre, label in [
                  ("PROSPECTO", "prospectos"), ("EN_NEGOCIACION", "en_negociacion"),
                  ("CERRADA", "cerradas"), ("EN_OPERACION", "en_operacion"),
                  ("CARGA_ENTREGADA", "carga_entregada"), ("CAIDO", "caidos"),
                  ("INACTIVO", "inactivos")
              ]],
            func.sum(case((and_(
                Cliente.estado_id.in_([estado_map.get("CERRADA", 0), estado_map.get("EN_OPERACION", 0), estado_map.get("CARGA_ENTREGADA", 0)]),
                Cliente.updated_at >= hace_30_dias
            ), 1), else_=0)).label('nuevos_clientes')
        ).where(base_filter)

        if comercial_ids:
            stmt = stmt.where(Cliente.comercial_encargado_id.in_(comercial_ids))

        row = (await self.db.execute(stmt)).first()

        # Stats por origen
        stmt_origen = select(
            OrigenCliente.nombre,
            func.count().label('total'),
            func.sum(case((Cliente.estado_id.in_([
                estado_map.get("CERRADA", 0), estado_map.get("EN_OPERACION", 0), estado_map.get("CARGA_ENTREGADA", 0)
            ]), 1), else_=0)).label('convertidos')
        ).outerjoin(OrigenCliente, Cliente.origen_id == OrigenCliente.id) \
         .where(base_filter).group_by(OrigenCliente.nombre)

        if comercial_ids:
            stmt_origen = stmt_origen.where(Cliente.comercial_encargado_id.in_(comercial_ids))

        origenes_rows = (await self.db.execute(stmt_origen)).all()
        origenes = {}
        for o in origenes_rows:
            nombre = o.nombre or "SIN_ORIGEN"
            total_o = o.total or 0
            convertidos_o = o.convertidos or 0
            origenes[nombre] = {
                "total": total_o,
                "convertidos": convertidos_o,
                "tasa_conversion": round((convertidos_o / total_o * 100), 1) if total_o > 0 else 0
            }

        return {
            "total": row.total or 0,
            "prospectos": row.prospectos or 0,
            "en_negociacion": row.en_negociacion or 0,
            "cerradas": row.cerradas or 0,
            "en_operacion": row.en_operacion or 0,
            "carga_entregada": row.carga_entregada or 0,
            "caidos": row.caidos or 0,
            "inactivos": row.inactivos or 0,
            "nuevos_clientes": row.nuevos_clientes or 0,
            "por_origen": origenes
        }

    async def get_recordatorios(self, comercial_ids: list[int] = None, days: int = 5) -> list:
        """Clientes con próxima fecha de contacto en el rango [hoy, hoy + days]."""
        today = datetime.now().date()
        limit_date = today + timedelta(days=days)

        stmt = select(
            Cliente,
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre")
        ).outerjoin(Usuario, Cliente.comercial_encargado_id == Usuario.id) \
         .outerjoin(Empleado, Usuario.empleado_id == Empleado.id) \
         .where(Cliente.is_active == True, Cliente.proxima_fecha_contacto <= limit_date)

        if comercial_ids:
            stmt = stmt.where(Cliente.comercial_encargado_id.in_(comercial_ids))
        stmt = stmt.order_by(Cliente.proxima_fecha_contacto.asc())

        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {
                "id": c.id,
                "razon_social": c.razon_social,
                "ruc": c.ruc,
                "proxima_fecha_contacto": c.proxima_fecha_contacto,
                "days_remaining": (c.proxima_fecha_contacto - today).days,
                "comercial_nombre": nombre,
                "comercial_id": c.comercial_encargado_id
            }
            for c, nombre in rows
        ]

    async def get_by_id(self, id: int):
        """Obtiene un cliente por su ID."""
        stmt = select(
            Cliente,
            EstadoCliente.nombre.label("estado_nombre"),
            OrigenCliente.nombre.label("origen_nombre"),
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("comercial_nombre")
        ).outerjoin(EstadoCliente, Cliente.estado_id == EstadoCliente.id) \
         .outerjoin(OrigenCliente, Cliente.origen_id == OrigenCliente.id) \
         .outerjoin(Usuario, Cliente.comercial_encargado_id == Usuario.id) \
         .outerjoin(Empleado, Usuario.empleado_id == Empleado.id) \
         .where(Cliente.id == id, Cliente.is_active == True)

        result = await self.db.execute(stmt)
        row = result.first()

        if not row:
            return None

        c = row[0]
        return {
            "id": c.id,
            "ruc": c.ruc,
            "razon_social": c.razon_social,
            "direccion_fiscal": c.direccion_fiscal,
            "distrito_id": c.distrito_id,
            "comercial_encargado_id": c.comercial_encargado_id,
            "comercial_nombre": row.comercial_nombre,
            "proxima_fecha_contacto": c.proxima_fecha_contacto,
            "estado_id": c.estado_id,
            "estado_nombre": row.estado_nombre,
            "origen_id": c.origen_id,
            "origen_nombre": row.origen_nombre,
            "is_active": c.is_active,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        }

    async def create(self, cliente: ClienteCreate, comercial_id: int, created_by: int) -> dict:
        """Crea un nuevo cliente y registra el evento inicial en el historial."""
        try:
            if cliente.ruc:
                stmt_existing = (
                    select(Cliente, Usuario)
                    .outerjoin(Usuario, Cliente.comercial_encargado_id == Usuario.id)
                    .where(Cliente.ruc == cliente.ruc, Cliente.is_active == True)
                )
                res_existing = await self.db.execute(stmt_existing)
                row_existing = res_existing.first()
                if row_existing:
                    db_cliente, db_comercial = row_existing
                    if db_comercial:
                        # Obtener el nombre del empleado asociado al usuario
                        stmt_emp = select(Empleado).where(Empleado.id == db_comercial.empleado_id)
                        res_emp = await self.db.execute(stmt_emp)
                        emp = res_emp.scalar()
                        nombre_comercial = f"{emp.nombres} {emp.apellido_paterno}" if emp else db_comercial.correo_corp
                        
                        if db_comercial.id != comercial_id:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Este cliente ya está registrado en la cartera de {nombre_comercial}. Por favor, coordina con tu supervisor para solicitar la reasignación."
                            )
                        else:
                            raise HTTPException(
                                status_code=400,
                                detail="Este cliente ya está registrado en tu cartera. Por favor, usa la opción 'Vincular con Cliente' para asociar este chat."
                            )
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail="Este cliente ya existe en el sistema sin un asesor asignado. Por favor, usa la opción 'Vincular con Cliente' para asociar este chat."
                        )

            # Si no se especifica estado, usar PROSPECTO
            estado_id = cliente.estado_id
            if not estado_id:
                estado_id = await self._get_estado_id("PROSPECTO")

            nuevo_cliente = Cliente(
                ruc=cliente.ruc,
                razon_social=cliente.razon_social,
                direccion_fiscal=cliente.direccion_fiscal,
                distrito_id=cliente.distrito_id,
                comercial_encargado_id=comercial_id,
                estado_id=estado_id,
                origen_id=cliente.origen_id,
                proxima_fecha_contacto=cliente.proxima_fecha_contacto,
                created_by=created_by
            )

            self.db.add(nuevo_cliente)
            await self.db.flush()

            if not nuevo_cliente.ruc:
                nuevo_cliente.ruc = f"ID-{nuevo_cliente.id:08d}"
                await self.db.flush()

            await self._registrar_historial(
                cliente_id=nuevo_cliente.id,
                estado_anterior_id=None,
                estado_nuevo_id=estado_id,
                motivo="Creación del cliente",
                registrado_por=created_by
            )

            await self.db.commit()
            await self.db.refresh(nuevo_cliente)
            return {"success": 1, "message": "Cliente creado exitosamente", "id": nuevo_cliente.id}
        except HTTPException as he:
            await self.db.rollback()
            raise he
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al crear cliente: {str(e)}")

    async def update(self, id: int, cliente: ClienteUpdate, updated_by: int) -> dict:
        """Actualiza un cliente existente."""
        try:
            result = await self.db.execute(select(Cliente).where(Cliente.id == id, Cliente.is_active == True))
            db_cliente = result.scalar()

            if not db_cliente:
                raise HTTPException(status_code=400, detail="Cliente no encontrado")

            update_data = cliente.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                if field == "ruc" and value != db_cliente.ruc:
                    await self.db.execute(
                        update(ClienteContacto)
                        .where(ClienteContacto.ruc == db_cliente.ruc)
                        .values(ruc=value)
                    )
                if hasattr(db_cliente, field):
                    setattr(db_cliente, field, value)

            db_cliente.updated_by = updated_by
            db_cliente.updated_at = datetime.now()

            await self.db.commit()
            await self.db.refresh(db_cliente)
            return {"success": 1, "message": "Cliente actualizado exitosamente", "id": db_cliente.id}
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al actualizar cliente: {str(e)}")

    async def delete(self, id: int, updated_by: int) -> dict:
        """Soft delete de un cliente."""
        return await self.archivar(id, updated_by)

    # =========================================================================
    # PIPELINE DE VENTAS
    # =========================================================================

    async def cambiar_estado(self, id: int, nuevo_estado_id: int, updated_by: int, motivo: str = None) -> dict:
        """Cambia el estado del cliente con validación de máquina de estados."""
        try:
            result = await self.db.execute(select(Cliente).where(Cliente.id == id, Cliente.is_active == True))
            cliente = result.scalar()

            if not cliente:
                raise HTTPException(status_code=400, detail="Cliente no encontrado")

            estado_actual_nombre = await self._get_estado_nombre(cliente.estado_id) if cliente.estado_id else "PROSPECTO"
            nuevo_estado_nombre = await self._get_estado_nombre(nuevo_estado_id)

            transiciones_permitidas = TRANSICIONES_VALIDAS.get(estado_actual_nombre, [])
            if nuevo_estado_nombre not in transiciones_permitidas:
                return {
                    "success": 0,
                    "message": f"Transición inválida: {estado_actual_nombre} → {nuevo_estado_nombre}. "
                               f"Permitidas: {', '.join(transiciones_permitidas)}"
                }

            tiempo_en_estado = None
            if cliente.updated_at:
                updated_naive = cliente.updated_at.replace(tzinfo=None)
                tiempo_en_estado = int((datetime.now() - updated_naive).total_seconds() / 60)

            estado_anterior_id = cliente.estado_id
            cliente.estado_id = nuevo_estado_id
            cliente.updated_by = updated_by
            cliente.updated_at = datetime.now()

            await self._registrar_historial(
                cliente_id=id,
                estado_anterior_id=estado_anterior_id,
                estado_nuevo_id=nuevo_estado_id,
                motivo=motivo,
                tiempo_en_estado_anterior=tiempo_en_estado,
                registrado_por=updated_by
            )

            await self.db.commit()
            return {"success": 1, "message": f"Estado actualizado: {estado_actual_nombre} → {nuevo_estado_nombre}"}
        except Exception as e:
            logger.error(f"Error cambiar estado cliente {id}: {e}")
            await self.db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al cambiar estado: {str(e)}")

    async def marcar_caido(self, id: int, motivo: str, fecha_seguimiento: date, updated_by: int) -> dict:
        """Marca como CAIDO. Si no hay fecha de seguimiento, archiva a INACTIVO."""
        try:
            result = await self.db.execute(select(Cliente).where(Cliente.id == id, Cliente.is_active == True))
            cliente = result.scalar()

            if not cliente:
                raise HTTPException(status_code=400, detail="Cliente no encontrado")

            if not fecha_seguimiento:
                return await self.archivar(id, updated_by)

            estado_anterior_id = cliente.estado_id
            tiempo_en_estado = None
            if cliente.updated_at:
                updated_naive = cliente.updated_at.replace(tzinfo=None)
                tiempo_en_estado = int((datetime.now() - updated_naive).total_seconds() / 60)

            estado_caido_id = await self._get_estado_id("CAIDO")
            cliente.estado_id = estado_caido_id
            cliente.proxima_fecha_contacto = fecha_seguimiento
            cliente.updated_by = updated_by
            cliente.updated_at = datetime.now()

            await self._registrar_historial(
                cliente_id=id,
                estado_anterior_id=estado_anterior_id,
                estado_nuevo_id=estado_caido_id,
                motivo=motivo,
                tiempo_en_estado_anterior=tiempo_en_estado,
                registrado_por=updated_by
            )

            await self.db.commit()
            return {"success": 1, "message": "Cliente marcado como caído (recuperable)"}
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al marcar caído: {str(e)}")

    async def reactivar(self, id: int, updated_by: int) -> dict:
        """Reactiva un cliente CAIDO o INACTIVO a PROSPECTO."""
        try:
            result = await self.db.execute(select(Cliente).where(Cliente.id == id))
            cliente = result.scalar()

            if not cliente:
                raise HTTPException(status_code=400, detail="Cliente no encontrado")

            estado_anterior_id = cliente.estado_id
            tiempo_en_estado = None
            if cliente.updated_at:
                updated_naive = cliente.updated_at.replace(tzinfo=None)
                tiempo_en_estado = int((datetime.now() - updated_naive).total_seconds() / 60)

            estado_prospecto_id = await self._get_estado_id("PROSPECTO")
            cliente.estado_id = estado_prospecto_id
            cliente.is_active = True
            cliente.updated_by = updated_by
            cliente.updated_at = datetime.now()

            if cliente.ruc:
                await self._cascade_contactos(cliente.ruc, activate=True)

            await self._registrar_historial(
                cliente_id=id,
                estado_anterior_id=estado_anterior_id,
                estado_nuevo_id=estado_prospecto_id,
                motivo="Reactivación del cliente",
                tiempo_en_estado_anterior=tiempo_en_estado,
                registrado_por=updated_by
            )

            await self.db.commit()
            return {"success": 1, "message": "Cliente reactivado a PROSPECTO"}
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al reactivar: {str(e)}")

    async def archivar(self, id: int, updated_by: int) -> dict:
        """Pasa a INACTIVO y desactiva contactos."""
        try:
            result = await self.db.execute(select(Cliente).where(Cliente.id == id))
            cliente = result.scalar()

            if not cliente:
                raise HTTPException(status_code=400, detail="Cliente no encontrado")

            estado_anterior_id = cliente.estado_id
            tiempo_en_estado = None
            if cliente.updated_at:
                updated_naive = cliente.updated_at.replace(tzinfo=None)
                tiempo_en_estado = int((datetime.now() - updated_naive).total_seconds() / 60)

            estado_inactivo_id = await self._get_estado_id("INACTIVO")
            cliente.estado_id = estado_inactivo_id
            cliente.is_active = False
            cliente.updated_by = updated_by
            cliente.updated_at = datetime.now()

            if cliente.ruc:
                await self._cascade_contactos(cliente.ruc, activate=False)

            await self._registrar_historial(
                cliente_id=id,
                estado_anterior_id=estado_anterior_id,
                estado_nuevo_id=estado_inactivo_id,
                motivo="Cliente archivado",
                tiempo_en_estado_anterior=tiempo_en_estado,
                registrado_por=updated_by
            )

            await self.db.commit()
            return {"success": 1, "message": "Cliente archivado (INACTIVO)"}
        except Exception as e:
            logger.error(f"Error al archivar cliente {id}: {e}", exc_info=True)
            await self.db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al archivar: {str(e)}")

    async def _cascade_contactos(self, ruc: str, activate: bool):
        """Activa o desactiva contactos según el RUC."""
        from app.models.comercial_catalogos import EstadoContacto
        stmt = select(ClienteContacto).where(ClienteContacto.ruc == ruc)
        result = await self.db.execute(stmt)
        contactos = result.scalars().all()

        # Obtener ID de estado ASIGNADO para proteger contactos en bandeja
        asignado_result = await self.db.execute(
            select(EstadoContacto.id).where(EstadoContacto.nombre == "ASIGNADO")
        )
        estado_asignado_id = asignado_result.scalar()

        for c in contactos:
            if not activate and c.estado_id == estado_asignado_id:
                logger.warning(f"Contacto {c.id} (RUC: {ruc}) no desactivado: está ASIGNADO")
                continue
            c.is_active = activate

    # =========================================================================
    # HISTORIAL
    # =========================================================================

    async def _registrar_historial(
        self,
        cliente_id: int,
        estado_anterior_id: int | None,
        estado_nuevo_id: int,
        motivo: str | None = None,
        tiempo_en_estado_anterior: int | None = None,
        registrado_por: int | None = None
    ):
        """Registra un cambio de estado en la tabla de historial."""
        historial = ClienteHistorial(
            cliente_id=cliente_id,
            estado_anterior_id=estado_anterior_id,
            estado_nuevo_id=estado_nuevo_id,
            motivo=motivo,
            tiempo_en_estado_anterior=tiempo_en_estado_anterior,
            registrado_por=registrado_por
        )
        self.db.add(historial)

    async def get_historial(self, cliente_id: int) -> list[dict]:
        """Devuelve la línea de tiempo completa de transiciones del cliente."""
        ea = EstadoCliente.__table__.alias("ea")
        en = EstadoCliente.__table__.alias("en")

        stmt = (
            select(
                ClienteHistorial,
                ea.c.nombre.label("estado_anterior_nombre"),
                en.c.nombre.label("estado_nuevo_nombre"),
                func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label("nombre_registrador")
            )
            .outerjoin(ea, ClienteHistorial.estado_anterior_id == ea.c.id)
            .outerjoin(en, ClienteHistorial.estado_nuevo_id == en.c.id)
            .outerjoin(Usuario, ClienteHistorial.registrado_por == Usuario.id)
            .outerjoin(Empleado, Usuario.empleado_id == Empleado.id)
            .where(ClienteHistorial.cliente_id == cliente_id)
            .order_by(ClienteHistorial.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {
                "id": h.id,
                "cliente_id": h.cliente_id,
                "estado_anterior_nombre": ea_nombre,
                "estado_nuevo_nombre": en_nombre,
                "motivo": h.motivo,
                "tiempo_en_estado_anterior": h.tiempo_en_estado_anterior,
                "registrado_por": h.registrado_por,
                "nombre_registrador": nombre,
                "created_at": h.created_at
            }
            for h, ea_nombre, en_nombre, nombre in rows
        ]

    async def get_timeline(self, cliente_id: int) -> dict:
        """Construye la trazabilidad unificada de un cliente.
        Fuentes: historial_llamadas (base), cliente_gestiones (cartera), inbox (buzón).
        """
        # 1. Info del cliente
        stmt_cliente = (
            select(
                Cliente.id, Cliente.ruc, Cliente.razon_social, Cliente.estado_id,
                Cliente.origen_id, Cliente.created_at,
                Cliente.comercial_encargado_id,
                OrigenCliente.nombre.label("origen_nombre"),
                EstadoCliente.nombre.label("estado_actual"),
            )
            .outerjoin(OrigenCliente, Cliente.origen_id == OrigenCliente.id)
            .outerjoin(EstadoCliente, Cliente.estado_id == EstadoCliente.id)
            .where(Cliente.id == cliente_id)
        )
        result_cli = await self.db.execute(stmt_cliente)
        cli = result_cli.first()
        if not cli:
            return {"error": "Cliente no encontrado"}

        # 2. Obtener transiciones de estado para calcular estado en cada momento
        stmt_hist = (
            select(
                ClienteHistorial.created_at,
                EstadoCliente.nombre.label("estado_nuevo"),
            )
            .outerjoin(EstadoCliente, ClienteHistorial.estado_nuevo_id == EstadoCliente.id)
            .where(ClienteHistorial.cliente_id == cliente_id)
            .order_by(ClienteHistorial.created_at.asc())
        )
        result_hist = await self.db.execute(stmt_hist)
        transiciones = result_hist.all()

        # Función: dado un datetime, devuelve el estado vigente
        def _to_naive(dt):
            """Quitar timezone para comparación uniforme."""
            if dt is None:
                return None
            return dt.replace(tzinfo=None) if hasattr(dt, 'tzinfo') and dt.tzinfo else dt

        def estado_en_fecha(fecha) -> str:
            estado = "PROSPECTO"  # default
            fecha_n = _to_naive(fecha)
            for t in transiciones:
                t_dt = _to_naive(t.created_at)
                if t_dt and fecha_n and t_dt <= fecha_n:
                    estado = t.estado_nuevo or estado
                else:
                    break
            return estado

        eventos: list[dict] = []

        # 3. Fuente: Llamadas de base (historial_llamadas vía RUC del comercial asignado)
        if cli.ruc:
            stmt_llamadas = (
                select(
                    HistorialLlamada.created_at,
                    HistorialLlamada.comentario,
                    CasoLlamada.nombre.label("caso_nombre"),
                    BaseContacto.telefono.label("contacto_telefono"),
                    BaseContacto.nombre.label("contacto_nombre"),
                )
                .join(BaseContacto, HistorialLlamada.base_id == BaseContacto.id)
                .outerjoin(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id)
                .where(
                    and_(
                        BaseContacto.ruc == cli.ruc,
                        HistorialLlamada.comercial_id == cli.comercial_encargado_id,
                        HistorialLlamada.caso_id.isnot(None),  # solo gestionados
                    )
                )
                .order_by(HistorialLlamada.created_at.asc())
            )
            result_ll = await self.db.execute(stmt_llamadas)
            for row in result_ll.all():
                fecha = row.created_at
                eventos.append({
                    "fecha": fecha,
                    "accion": "Llamada",
                    "motivo": row.caso_nombre or "-",
                    "estado": estado_en_fecha(fecha),
                    "comentario": row.comentario or "-",
                    "contacto": row.contacto_telefono or None,
                })

        # 4. Fuente: Gestiones de cartera (cliente_gestiones)
        stmt_gestiones = (
            select(
                ClienteGestion.created_at,
                ClienteGestion.comentario,
                MedioGestion.nombre.label("medio_nombre"),
                MotivoGestion.nombre.label("motivo_nombre"),
            )
            .outerjoin(MedioGestion, ClienteGestion.medio_id == MedioGestion.id)
            .outerjoin(MotivoGestion, ClienteGestion.motivo_id == MotivoGestion.id)
            .where(ClienteGestion.cliente_id == cliente_id)
            .order_by(ClienteGestion.created_at.asc())
        )
        result_gest = await self.db.execute(stmt_gestiones)
        for row in result_gest.all():
            # Usar buffer de 5s: la gestión y el cambio de estado ocurren en la
            # misma transacción, pero el historial se registra milisegundos después.
            from datetime import timedelta
            fecha_con_buffer = row.created_at + timedelta(seconds=5) if row.created_at else None
            estado_post = estado_en_fecha(fecha_con_buffer)
            estado_pre = estado_en_fecha(row.created_at - timedelta(seconds=1)) if row.created_at else "PROSPECTO"
            eventos.append({
                "fecha": row.created_at,
                "accion": row.medio_nombre or "-",
                "motivo": row.motivo_nombre or "-",
                "estado": estado_post,
                "estado_anterior": estado_pre if estado_pre != estado_post else None,
                "comentario": row.comentario or "-",
            })

        # 5. Fuente: Buzón (inbox) — si el cliente tiene inbox_origen_id o teléfono vinculado
        if cli.ruc:
            # Buscar teléfonos del cliente
            stmt_tel = select(ClienteContacto.telefono).where(
                and_(ClienteContacto.ruc == cli.ruc, ClienteContacto.is_active == True)
            )
            result_tel = await self.db.execute(stmt_tel)
            telefonos = [r.telefono for r in result_tel.all() if r.telefono]

            if telefonos:
                # Subquery to get the first message content
                subq_first_msg = (
                    select(ChatMessage.contenido)
                    .where(ChatMessage.inbox_id == Inbox.id)
                    .order_by(ChatMessage.created_at.asc())
                    .limit(1)
                    .correlate(Inbox)
                    .scalar_subquery()
                )

                # Buscar inbox entries que coincidan con esos teléfonos
                stmt_inbox = select(
                    Inbox.created_at,
                    subq_first_msg.label("mensaje_inicial"),
                    Inbox.nombre_whatsapp,
                    Inbox.ultimo_estado.label("estado"),
                ).where(
                    and_(
                        Inbox.telefono.in_(telefonos),
                        Inbox.ultimo_estado == 'CERRADO',
                    )
                ).order_by(Inbox.created_at.asc())
                result_inbox = await self.db.execute(stmt_inbox)
                for row in result_inbox.all():
                    eventos.append({
                        "fecha": row.created_at,
                        "accion": "WhatsApp",
                        "motivo": "Lead recibido",
                        "estado": estado_en_fecha(row.created_at),
                        "comentario": row.mensaje_inicial or row.nombre_whatsapp or "-",
                    })

        # 6. Ordenar cronológicamente (normalizar naive/aware)
        def _sort_fecha(e):
            f = e["fecha"]
            if f is None:
                return datetime.min
            # Quitar timezone para comparación uniforme
            return f.replace(tzinfo=None) if hasattr(f, 'tzinfo') and f.tzinfo else f
        eventos.sort(key=_sort_fecha)

        # Formatear fechas para JSON
        for e in eventos:
            if e["fecha"]:
                e["fecha"] = e["fecha"].isoformat()
            else:
                e["fecha"] = None

        return {
            "cliente": {
                "id": cli.id,
                "ruc": cli.ruc,
                "razon_social": cli.razon_social,
                "origen": cli.origen_nombre or "Manual",
                "estado_actual": cli.estado_actual or "PROSPECTO",
                "created_at": cli.created_at.isoformat() if cli.created_at else None,
            },
            "eventos": eventos,
        }
