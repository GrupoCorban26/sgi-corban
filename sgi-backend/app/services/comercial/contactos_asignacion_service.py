import asyncio
import logging
import re
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update, and_
from fastapi import HTTPException
from app.models.comercial_base import BaseContacto
from app.models.comercial import Cliente, CasoLlamada, ClienteContacto
from app.models.historial_llamadas import HistorialLlamada
from app.models.comercial_catalogos import EstadoCliente, OrigenCliente

logger = logging.getLogger(__name__)

DIAS_ABANDONO = 7  # Días de antigüedad para liberar/archivar contactos automáticamente

class ContactosAsignacionService:
    """Servicio de asignación y feedback para comerciales sobre la tabla bases."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_estado_cliente_id(self, nombre: str) -> int:
        result = await self.db.execute(select(EstadoCliente.id).where(EstadoCliente.nombre == nombre))
        estado_id = result.scalar()
        if not estado_id:
            raise HTTPException(500, f"Estado cliente '{nombre}' no encontrado")
        return estado_id

    async def _get_origen_cliente_id(self, nombre: str) -> int:
        result = await self.db.execute(select(OrigenCliente.id).where(OrigenCliente.nombre == nombre))
        origen_id = result.scalar()
        if not origen_id:
            return None
        return origen_id

    async def get_mis_contactos_asignados(self, user_id: int):
        """Obtiene los contactos asignados al comercial (estado = 'ASIGNADO')."""
        # Obtenemos todos los historiales del comercial para contactos que están asignados.
        # Ordenamos por created_at desc para asegurarnos de capturar el intento más reciente primero.
        stmt = select(
            HistorialLlamada,
            BaseContacto,
            CasoLlamada
        ).join(
            BaseContacto, HistorialLlamada.base_id == BaseContacto.id
        ).outerjoin(
            CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id
        ).where(
            HistorialLlamada.comercial_id == user_id,
            BaseContacto.estado == 'ASIGNADO'
        ).order_by(HistorialLlamada.created_at.desc())

        result = await self.db.execute(stmt)
        contacto_map = {}
        
        for row in result.all():
            hl, bc, caso = row
            # Como ordenamos por created_at desc, la primera vez que vemos bc.id es el último intento de llamada
            if bc.id not in contacto_map:
                contacto_map[bc.id] = {
                    "id": bc.id,
                    "historial_id": hl.id,
                    "ruc": bc.ruc,
                    "nombre": bc.nombre,
                    "razon_social": bc.razon_social or "Sin razón social",
                    "telefono": bc.telefono,
                    "correo": bc.correo,
                    "cargo": None,
                    "contesto": 1 if (caso and caso.contestado) else 0,
                    "caso_id": hl.caso_id,
                    "caso_nombre": caso.nombre if caso else None,
                    "comentario": hl.comentario,
                    "estado": bc.estado,
                    "fecha_asignacion": bc.fecha_asignacion or hl.created_at,
                    "completado": hl.caso_id is not None,
                    "veces_llamadas": bc.veces_llamadas,
                    "ultimo_llamado_at": hl.created_at if hl.caso_id is not None else None
                }

        # Ordenar los datos en Python:
        # 1. Los que tienen veces_llamadas == 0 (nunca llamados) primero.
        # 2. Los que ya tienen llamadas se ordenan por su último intento (los más antiguos primero para que los reintente).
        def sort_key(item):
            is_new = 0 if item["veces_llamadas"] == 0 else 1
            last_call = item["ultimo_llamado_at"] or datetime.min
            return (is_new, last_call, item["id"])
            
        data = sorted(contacto_map.values(), key=sort_key)
        return data
    
    async def liberar_contactos_abandonados(self):
        """Libera o archiva contactos ASIGNADO después de DIAS_ABANDONO días de haber sido asignados."""
        fecha_limite = datetime.now() - timedelta(days=DIAS_ABANDONO)

        # 1. Obtener contactos asignados cuya fecha de asignación superó el límite
        stmt_antiguos = select(BaseContacto).where(
            and_(
                BaseContacto.estado == 'ASIGNADO',
                BaseContacto.fecha_asignacion <= fecha_limite
            )
        )
        result = await self.db.execute(stmt_antiguos)
        contactos_antiguos = result.scalars().all()

        if not contactos_antiguos:
            return 0

        liberados_ids = []
        gestionados_ids = []

        for bc in contactos_antiguos:
            if bc.veces_llamadas == 0:
                liberados_ids.append(bc.id)
            else:
                gestionados_ids.append(bc.id)

        # Liberar contactos sin ninguna gestión (veces_llamadas == 0)
        if liberados_ids:
            await self.db.execute(
                update(BaseContacto).where(
                    BaseContacto.id.in_(liberados_ids)
                ).values(estado='DISPONIBLE', asignado_a=None, fecha_asignacion=None)
            )
            # Eliminar historial huérfano vacío
            from sqlalchemy import delete as sql_delete
            await self.db.execute(
                sql_delete(HistorialLlamada).where(
                    and_(
                        HistorialLlamada.base_id.in_(liberados_ids),
                        HistorialLlamada.caso_id.is_(None)
                    )
                )
            )

        # Archivar contactos con al menos 1 gestión (veces_llamadas >= 1)
        if gestionados_ids:
            await self.db.execute(
                update(BaseContacto).where(
                    BaseContacto.id.in_(gestionados_ids)
                ).values(estado='GESTIONADO')
            )

        await self.db.commit()
        logger.info(f"Procesados {len(contactos_antiguos)} contactos antiguos a los 7 días. Liberados: {len(liberados_ids)}, Archivados: {len(gestionados_ids)}")
        return len(contactos_antiguos)

    async def actualizar_feedback(self, base_id: int, caso_id: int, comentario: str, user_id: int = None, nuevo_intento: bool = False):
        """Actualiza el feedback en historial_llamadas y gestiona si se vuelve cliente."""
        estado_prospecto_id = await self._get_estado_cliente_id('PROSPECTO')
        origen_bd_id = await self._get_origen_cliente_id('BASE_DATOS')

        # Obtener Base
        contact = await self.db.get(BaseContacto, base_id)
        if not contact:
            raise HTTPException(404, "Contacto base no encontrado")

        caso_nuevo = await self.db.get(CasoLlamada, caso_id)
        if not caso_nuevo:
            raise HTTPException(404, "Caso de llamada no encontrado")
        is_positive = caso_nuevo.gestionable

        # Determinar si debemos crear un nuevo registro de historial o actualizar el último
        # Si veces_llamadas == 0, siempre actualizamos el registro vacío inicial.
        if contact.veces_llamadas == 0:
            historial = (await self.db.execute(
                select(HistorialLlamada).where(
                    and_(
                        HistorialLlamada.base_id == base_id,
                        HistorialLlamada.comercial_id == user_id,
                        HistorialLlamada.caso_id.is_(None)
                    )
                )
            )).scalars().first()
            if not historial:
                historial = HistorialLlamada(
                    base_id=base_id,
                    comercial_id=user_id
                )
                self.db.add(historial)
            
            historial.caso_id = caso_id
            historial.comentario = comentario
            historial.created_at = func.now()
            contact.veces_llamadas = 1
            is_edit = False
        else:
            if nuevo_intento:
                if contact.veces_llamadas >= 4:
                    raise HTTPException(400, "Ya has alcanzado el límite máximo de 4 llamadas para este contacto.")
                
                # Crear nuevo historial independiente
                historial = HistorialLlamada(
                    base_id=base_id,
                    comercial_id=user_id,
                    caso_id=caso_id,
                    comentario=comentario,
                    created_at=func.now()
                )
                self.db.add(historial)
                contact.veces_llamadas += 1
                is_edit = False
            else:
                # Actualizar el último intento
                historial = (await self.db.execute(
                    select(HistorialLlamada).where(
                        and_(
                            HistorialLlamada.base_id == base_id,
                            HistorialLlamada.comercial_id == user_id
                        )
                    ).order_by(HistorialLlamada.created_at.desc())
                )).scalars().first()
                if not historial:
                    raise HTTPException(404, "Registro de historial no encontrado")
                
                historial.caso_id = caso_id
                historial.comentario = comentario
                historial.created_at = func.now()
                is_edit = True

        # Verificar si ya existe como Cliente
        cliente_existe = (await self.db.execute(
            select(Cliente).where(Cliente.ruc == contact.ruc)
        )).scalars().first()

        mensaje = ""

        async with self.db.begin_nested():
            if is_positive and not cliente_existe:
                # CREAR CLIENTE NUEVO (PROSPECTO)
                nuevo_cliente = Cliente(
                    ruc=contact.ruc, 
                    razon_social=contact.razon_social or contact.nombre or "Sin razón social",
                    comercial_encargado_id=user_id,
                    estado_id=estado_prospecto_id, 
                    origen_id=origen_bd_id,
                    proxima_fecha_contacto=func.now(), 
                    is_active=True, 
                    created_by=user_id
                )
                self.db.add(nuevo_cliente)
                await self.db.flush()

                # Crear entrada en cliente_contactos como CRM Lookup
                cc = ClienteContacto(
                    cliente_id=nuevo_cliente.id,
                    ruc=contact.ruc,
                    nombre=contact.nombre,
                    telefono=contact.telefono,
                    correo=contact.correo,
                    origen='BASE_DATOS',
                    is_principal=True,
                    is_active=True
                )
                self.db.add(cc)
            elif cliente_existe and not is_edit:
                mensaje = f"Nota: Este cliente ya existe en cartera (ID: {cliente_existe.id})"

        await self.db.commit()
        return {"success": True, "mensaje": mensaje}
    
    async def enviar_feedback_lote(self, user_id: int):
        """Finaliza el lote: cambia a GESTIONADO todos los contactos asignados que tengan al menos 1 intento."""
        async with self.db.begin_nested():
            await self.db.execute(
                update(BaseContacto).where(
                    and_(
                        BaseContacto.asignado_a == user_id,
                        BaseContacto.estado == 'ASIGNADO',
                        BaseContacto.veces_llamadas >= 1
                    )
                ).values(estado='GESTIONADO')
            )
        await self.db.commit()
        return {"success": True, "message": "Feedback enviado y registros finalizados."}
