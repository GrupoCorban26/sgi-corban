from fastapi import HTTPException
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update, and_, desc, delete
from app.models.seguimiento import (
    Seguimiento, Cotizacion, SeguimientoComentario, SeguimientoHistorial,
    TipoCarga, TipoServicioComercial, SegmentacionCierre,
    DocumentoOperacional, SeguimientoDocumento, SeguimientoAlertaEnviada
)
from app.models.comercial_catalogos import MedioGestion
from app.models.comercial import Cliente
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.schemas.comercial.seguimiento import (
    SeguimientoCreate, CotizacionItemCreate, CotizacionCerrar, SeguimientoCaer,
    SeguimientoMover, SeguimientoOperar, SeguimientoEntregar,
    DocumentoOperacionalCreate, DocumentoOperacionalUpdate, DocumentoToggle,
    ClienteRegistroFaseCierre, SeguimientoUpdate
)
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)

# ── Matriz de transiciones válidas ──
TRANSICIONES_VALIDAS = {
    "SOLICITUD":        ["COTIZADO", "CAIDO"],
    "COTIZADO":         ["CIERRE", "CAIDO"],
    "CIERRE":           ["EN_OPERACION", "COTIZADO", "CAIDO"],
    "EN_OPERACION":     ["CARGA_ENTREGADA", "CAIDO"],
    "CARGA_ENTREGADA":  [],
    "CAIDO":            ["COTIZADO"],
}


class SeguimientosService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════
    # CATÁLOGOS
    # ══════════════════════════════════════════════

    async def get_catalogos(self) -> dict:
        """Obtiene todos los catálogos necesarios para el módulo de Seguimientos."""
        cargas = await self.db.execute(
            select(TipoCarga).where(TipoCarga.is_active == True).order_by(TipoCarga.orden)
        )
        servicios = await self.db.execute(
            select(TipoServicioComercial).where(TipoServicioComercial.is_active == True).order_by(TipoServicioComercial.orden)
        )
        segmentaciones = await self.db.execute(
            select(SegmentacionCierre).where(SegmentacionCierre.is_active == True).order_by(SegmentacionCierre.orden)
        )
        medios = await self.db.execute(
            select(MedioGestion).where(MedioGestion.is_active == True)
        )
        documentos = await self.db.execute(
            select(DocumentoOperacional).where(DocumentoOperacional.is_active == True).order_by(DocumentoOperacional.nombre)
        )

        return {
            "tipos_carga": cargas.scalars().all(),
            "tipos_servicio": servicios.scalars().all(),
            "segmentaciones_cierre": segmentaciones.scalars().all(),
            "medios_gestion": medios.scalars().all(),
            "documentos_operacionales": documentos.scalars().all(),
        }

    # ══════════════════════════════════════════════
    # CRUD DOCUMENTOS OPERACIONALES
    # ══════════════════════════════════════════════

    async def get_documentos_operacionales(self) -> list:
        result = await self.db.execute(
            select(DocumentoOperacional).where(DocumentoOperacional.is_active == True).order_by(DocumentoOperacional.nombre)
        )
        return result.scalars().all()

    async def crear_documento_operacional(self, data: DocumentoOperacionalCreate) -> DocumentoOperacional:
        doc = DocumentoOperacional(nombre=data.nombre, descripcion=data.descripcion)
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        return doc

    async def actualizar_documento_operacional(self, id: int, data: DocumentoOperacionalUpdate) -> DocumentoOperacional:
        doc = await self.db.get(DocumentoOperacional, id)
        if not doc:
            raise HTTPException(status_code=404, detail="Documento operacional no encontrado")
        if data.nombre is not None:
            doc.nombre = data.nombre
        if data.descripcion is not None:
            doc.descripcion = data.descripcion
        if data.is_active is not None:
            doc.is_active = data.is_active
        await self.db.commit()
        await self.db.refresh(doc)
        return doc

    # ══════════════════════════════════════════════
    # CONSULTAS DE SEGUIMIENTOS
    # ══════════════════════════════════════════════

    async def get_seguimientos(self, comercial_ids: list[int] = None) -> list[Seguimiento]:
        """
        Obtiene todas las tarjetas de seguimiento activas (is_active=True).
        Aplica filtro por comercial_ids para control RBAC de equipos.
        """
        query = select(Seguimiento).where(Seguimiento.is_active == True)

        if comercial_ids is not None:
            query = query.where(Seguimiento.comercial_id.in_(comercial_ids))

        query = query.order_by(desc(Seguimiento.created_at))
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_seguimiento_by_id(self, id: int) -> Seguimiento:
        """Obtiene un seguimiento por su ID con todas sus relaciones cargadas."""
        seguimiento = await self.db.get(Seguimiento, id)
        if not seguimiento or not seguimiento.is_active:
            raise HTTPException(status_code=404, detail="Tarjeta de seguimiento no encontrada")
        return seguimiento

    async def update_seguimiento(self, id: int, data: SeguimientoUpdate, usuario_id: int) -> Seguimiento:
        """Actualiza los campos editables de una tarjeta de seguimiento."""
        seg = await self.get_seguimiento_by_id(id)
        
        cambios = []
        
        async with self.db.begin_nested():
            if data.titulo is not None:
                if seg.titulo != data.titulo:
                    cambios.append(f"Título: '{seg.titulo}' → '{data.titulo}'")
                    seg.titulo = data.titulo

            if data.cliente_id is not None:
                if seg.cliente_id != data.cliente_id:
                    if data.cliente_id == 0:
                        cambios.append(f"Cliente desvinculado (anterior: {seg.cliente.razon_social if seg.cliente else 'Ninguno'})")
                        seg.cliente_id = None
                    else:
                        nuevo_cli = await self.db.get(Cliente, data.cliente_id)
                        if not nuevo_cli or not nuevo_cli.is_active:
                            raise HTTPException(status_code=404, detail="El cliente especificado no existe o está inactivo")
                        cambios.append(f"Cliente formal: '{seg.cliente.razon_social if seg.cliente else 'Ninguno'}' → '{nuevo_cli.razon_social}'")
                        seg.cliente_id = data.cliente_id
                        seg.temp_cliente_nombre = None
                        seg.temp_cliente_ruc = None
                        seg.temp_cliente_contacto = None
                        seg.temp_cliente_correo = None
                        seg.temp_cliente_telefono = None

            if seg.cliente_id is None:
                for field in ['temp_cliente_nombre', 'temp_cliente_ruc', 'temp_cliente_contacto', 'temp_cliente_correo', 'temp_cliente_telefono']:
                    val = getattr(data, field)
                    if val is not None:
                        old_val = getattr(seg, field)
                        if old_val != val:
                            cambios.append(f"{field.replace('temp_cliente_', '').capitalize()}: '{old_val or 'Ninguno'}' → '{val}'")
                            setattr(seg, field, val)

            if data.fecha_eta is not None:
                if seg.fecha_eta != data.fecha_eta:
                    cambios.append(f"ETA: '{seg.fecha_eta or 'Ninguna'}' → '{data.fecha_eta}'")
                    seg.fecha_eta = data.fecha_eta
                    
                    # Recalcular fecha límite de documentos
                    cot_aceptada = next((c for c in seg.cotizaciones if c.estado == "ACEPTADO"), None)
                    if cot_aceptada:
                        tipo_servicio_nombre = cot_aceptada.tipo_servicio_nombre.upper().strip() if cot_aceptada.tipo_servicio_nombre else ""
                        tipo_carga_nombre = cot_aceptada.tipo_carga_nombre.upper().strip() if cot_aceptada.tipo_carga_nombre else ""
                        from app.services.comercial.notificacion_operacional_service import calcular_dias_anticipacion
                        dias_anticipacion = calcular_dias_anticipacion(tipo_servicio_nombre, tipo_carga_nombre)
                        if dias_anticipacion is not None:
                            seg.fecha_limite_documentos = data.fecha_eta - timedelta(days=dias_anticipacion)
                        else:
                            seg.fecha_limite_documentos = data.fecha_eta
                    else:
                        seg.fecha_limite_documentos = data.fecha_eta

            if data.contacto_alerta_id is not None:
                if seg.contacto_alerta_id != data.contacto_alerta_id:
                    if data.contacto_alerta_id == 0:
                        cambios.append("Contacto de alertas desvinculado")
                        seg.contacto_alerta_id = None
                    else:
                        from app.models.comercial import ClienteContacto
                        cc = await self.db.get(ClienteContacto, data.contacto_alerta_id)
                        if not cc or cc.cliente_id != seg.cliente_id:
                            raise HTTPException(status_code=400, detail="El contacto de alerta especificado no pertenece al cliente")
                        cambios.append(f"Contacto de alertas: '{seg.contacto_alerta.nombre if seg.contacto_alerta else 'Ninguno'}' → '{cc.nombre}'")
                        seg.contacto_alerta_id = data.contacto_alerta_id

            if cambios:
                seg.updated_by = usuario_id
                
                comentario_texto = "✏️ Tarjeta editada manualmente:\n" + "\n".join(f"• {c}" for c in cambios)
                comentario = SeguimientoComentario(
                    seguimiento_id=seg.id,
                    comentario=comentario_texto,
                    created_by=usuario_id
                )
                self.db.add(comentario)
                
                hist = SeguimientoHistorial(
                    seguimiento_id=seg.id,
                    estado_anterior=seg.estado,
                    estado_nuevo=seg.estado,
                    comentario="Modificación de datos de la tarjeta",
                    registrado_por=usuario_id
                )
                self.db.add(hist)

        await self.db.commit()
        await self.db.refresh(seg)
        return seg

    # ══════════════════════════════════════════════
    # CREAR SEGUIMIENTO
    # ══════════════════════════════════════════════

    async def create_seguimiento(self, data: SeguimientoCreate, comercial_id: int, created_by: int) -> Seguimiento:
        """
        Crea una tarjeta de seguimiento con cotizaciones iniciales.
        Soporta creación con cliente formal (cliente_id) o con datos temporales (prospecto).
        """
        cliente = None
        if data.cliente_id:
            cliente = await self.db.get(Cliente, data.cliente_id)
            if not cliente or not cliente.is_active:
                raise HTTPException(status_code=404, detail="El cliente especificado no existe o está inactivo")
        else:
            # Sin cliente formal: requerir al menos el nombre temporal
            if not data.temp_cliente_nombre or not data.temp_cliente_nombre.strip():
                raise HTTPException(status_code=400, detail="Debe proporcionar al menos el nombre del prospecto (temp_cliente_nombre)")

        estado_inicial = data.estado_inicial or "SOLICITUD"
        if estado_inicial not in ("SOLICITUD", "COTIZADO"):
            raise HTTPException(status_code=400, detail="El estado inicial debe ser SOLICITUD o COTIZADO")

        async with self.db.begin_nested():
            seg = Seguimiento(
                cliente_id=data.cliente_id,
                comercial_id=comercial_id,
                titulo=data.titulo,
                estado=estado_inicial,
                temp_cliente_nombre=data.temp_cliente_nombre,
                temp_cliente_ruc=data.temp_cliente_ruc,
                temp_cliente_contacto=data.temp_cliente_contacto,
                temp_cliente_correo=data.temp_cliente_correo,
                temp_cliente_telefono=data.temp_cliente_telefono,
                created_by=created_by
            )
            self.db.add(seg)
            await self.db.flush()

            for item in data.items:
                cot = Cotizacion(
                    seguimiento_id=seg.id,
                    tipo_carga_id=item.tipo_carga_id,
                    tipo_servicio_id=item.tipo_servicio_id,
                    tipo_operacion=item.tipo_operacion,
                    pais_origen=item.pais_origen,
                    incoterm=item.incoterm,
                    estado="PENDIENTE"
                )
                self.db.add(cot)

            if data.comentario_inicial:
                comentario = SeguimientoComentario(
                    seguimiento_id=seg.id,
                    comentario=data.comentario_inicial,
                    created_by=created_by
                )
                self.db.add(comentario)

            hist = SeguimientoHistorial(
                seguimiento_id=seg.id,
                estado_anterior=None,
                estado_nuevo=estado_inicial,
                comentario=f"Inicio de seguimiento comercial de carga ({estado_inicial})",
                registrado_por=created_by
            )
            self.db.add(hist)

            # Solo cambiar estado del cliente a ACTIVO si tiene cliente formal
            if cliente:
                from app.models.comercial_catalogos import EstadoCliente
                res_estado = await self.db.execute(select(EstadoCliente.id).where(EstadoCliente.nombre == "ACTIVO"))
                activo_estado_id = res_estado.scalar()
                if activo_estado_id:
                    cliente.estado_id = activo_estado_id

        await self.db.commit()
        await self.db.refresh(seg)
        return seg

    # ══════════════════════════════════════════════
    # AGREGAR COTIZACIÓN
    # ══════════════════════════════════════════════

    async def agregar_cotizacion(self, seguimiento_id: int, data: CotizacionItemCreate) -> Cotizacion:
        """Permite agregar una nueva cotización (ítem/modalidad de carga) a un seguimiento existente."""
        seg = await self.db.get(Seguimiento, seguimiento_id)
        if not seg or not seg.is_active:
            raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

        if seg.estado not in ("SOLICITUD", "COTIZADO"):
            raise HTTPException(status_code=400, detail="Solo se pueden agregar cotizaciones a seguimientos en curso")

        cot = Cotizacion(
            seguimiento_id=seguimiento_id,
            tipo_carga_id=data.tipo_carga_id,
            tipo_servicio_id=data.tipo_servicio_id,
            tipo_operacion=data.tipo_operacion,
            pais_origen=data.pais_origen,
            incoterm=data.incoterm,
            estado="PENDIENTE"
        )
        self.db.add(cot)

        # Registrar un comentario automático en el seguimiento
        comentario_texto = f"Nueva cotización agregada: {data.tipo_operacion or ''} {data.pais_origen or ''}"
        comentario = SeguimientoComentario(
            seguimiento_id=seguimiento_id,
            comentario=comentario_texto,
            created_by=seg.comercial_id
        )
        self.db.add(comentario)

        await self.db.commit()
        await self.db.refresh(cot)
        return cot

    # ══════════════════════════════════════════════
    # MOVER TARJETA (TRANSICIÓN GENÉRICA)
    # ══════════════════════════════════════════════

    async def mover_tarjeta(self, id: int, data: SeguimientoMover, usuario_id: int) -> Seguimiento:
        """
        Lógica base para mover una tarjeta. Para transiciones complejas
        (CERRADO, EN_OPERACION y CAIDO), se deben invocar métodos específicos.
        """
        seg = await self.db.get(Seguimiento, id)
        if not seg or not seg.is_active:
            raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

        if seg.estado == data.estado_nuevo:
            return seg

        # Validar que la transición es permitida
        destinos_validos = TRANSICIONES_VALIDAS.get(seg.estado, [])
        if data.estado_nuevo not in destinos_validos:
            raise HTTPException(
                status_code=400,
                detail=f"Transición de {seg.estado} a {data.estado_nuevo} no es válida. Destinos permitidos: {destinos_validos}"
            )

        # Redirigir a endpoints específicos para transiciones complejas
        if data.estado_nuevo == "CIERRE":
            raise HTTPException(status_code=400, detail="Use el endpoint de cierre específico para transiciones a CIERRE")
        elif data.estado_nuevo == "CAIDO":
            raise HTTPException(status_code=400, detail="Use el endpoint de caída específico para transiciones a CAIDO")
        elif data.estado_nuevo == "EN_OPERACION":
            raise HTTPException(status_code=400, detail="Use el endpoint de operación específico para transiciones a EN_OPERACION")

        estado_anterior = seg.estado

        async with self.db.begin_nested():
            # Si regresa de CERRADO → COTIZADO (cambio de Incoterm/condiciones)
            if estado_anterior == "CIERRE" and data.estado_nuevo == "COTIZADO":
                for cot in seg.cotizaciones:
                    if cot.estado in ["ACEPTADO", "DESCARTADO"]:
                        cot.estado = "PENDIENTE"
                        cot.codigo_operacion = None
                        cot.segmentacion_id = None
                        cot.fecha_cierre = None
                # Limpiar datos operacionales y documentos asociados
                seg.fecha_eta = None
                seg.contacto_alerta_id = None
                # Eliminar documentos y alertas previas
                await self.db.execute(
                    delete(SeguimientoDocumento).where(SeguimientoDocumento.seguimiento_id == id)
                )
                await self.db.execute(
                    delete(SeguimientoAlertaEnviada).where(SeguimientoAlertaEnviada.seguimiento_id == id)
                )

            # Si regresa de CAIDO → COTIZADO (reactivación)
            if estado_anterior == "CAIDO" and data.estado_nuevo == "COTIZADO":
                seg.motivo_caida = None
                for cot in seg.cotizaciones:
                    if cot.estado == "RECHAZADO":
                        cot.estado = "PENDIENTE"
                        cot.codigo_operacion = None
                        cot.segmentacion_id = None
                        cot.fecha_cierre = None

            seg.estado = data.estado_nuevo
            seg.updated_by = usuario_id

            fecha_dt = None
            if data.fecha_cambio:
                fecha_dt = datetime(data.fecha_cambio.year, data.fecha_cambio.month, data.fecha_cambio.day)

            # Registrar comentario de la transición
            comentario_kwargs = {
                "seguimiento_id": seg.id,
                "comentario": data.comentario or f"Transición de estado: {estado_anterior} → {data.estado_nuevo}",
                "medio_gestion_id": data.medio_gestion_id,
                "created_by": usuario_id
            }
            if fecha_dt:
                comentario_kwargs["created_at"] = fecha_dt
            comentario = SeguimientoComentario(**comentario_kwargs)
            self.db.add(comentario)

            # Historial de auditoría
            hist_kwargs = {
                "seguimiento_id": seg.id,
                "estado_anterior": estado_anterior,
                "estado_nuevo": data.estado_nuevo,
                "comentario": data.comentario,
                "registrado_por": usuario_id
            }
            if fecha_dt:
                hist_kwargs["fecha_cambio"] = fecha_dt
            hist = SeguimientoHistorial(**hist_kwargs)
            self.db.add(hist)

        await self.db.commit()
        await self.db.refresh(seg)
        return seg

    # ══════════════════════════════════════════════
    # CERRAR SEGUIMIENTO (COTIZADO → CIERRE)
    # ══════════════════════════════════════════════

    async def cerrar_seguimiento(self, id: int, data: CotizacionCerrar, usuario_id: int) -> Seguimiento:
        """
        Marca la tarjeta de seguimiento como CIERRE (venta aceptada).
        - La cotización elegida pasa a 'ACEPTADO' registrando el COR y la segmentación (atribución).
        - Las demás cotizaciones 'PENDIENTE' pasan automáticamente a 'DESCARTADO'.
        - La tarjeta pasa a 'CIERRE'.
        - Si es prospecto temporal, registra formalmente al cliente.
        - Se registra el comentario y el historial.
        """
        seg = await self.db.get(Seguimiento, id)
        if not seg or not seg.is_active:
            raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

        if seg.estado == "CIERRE":
            raise HTTPException(status_code=400, detail="El seguimiento ya se encuentra en cierre")

        if seg.estado not in ("COTIZADO",):
            raise HTTPException(status_code=400, detail=f"No se puede cerrar desde el estado {seg.estado}")

        cot_elegida = await self.db.get(Cotizacion, data.cotizacion_id)
        if not cot_elegida or cot_elegida.seguimiento_id != id or not cot_elegida.is_active:
            raise HTTPException(status_code=404, detail="La cotización seleccionada no pertenece a este seguimiento")

        if cot_elegida.estado != "PENDIENTE":
            raise HTTPException(status_code=400, detail="Solo se pueden aceptar cotizaciones que estén PENDIENTES")

        async with self.db.begin_nested():
            # Si es un prospecto temporal, registrar cliente formal
            if seg.cliente_id is None:
                if not data.cliente_registro:
                    raise HTTPException(
                        status_code=400,
                        detail="Para cerrar una negociación sin cliente formal, debe proporcionar los datos de registro del cliente (cliente_registro)"
                    )
                reg = data.cliente_registro
                # Crear cliente formal en comercial.clientes
                from app.models.comercial_catalogos import EstadoCliente
                res_estado = await self.db.execute(select(EstadoCliente.id).where(EstadoCliente.nombre == "ACTIVO"))
                activo_estado_id = res_estado.scalar()

                # Obtener la empresa del comercial asignado al seguimiento
                stmt_empresa = (
                    select(Empleado.empresa_id)
                    .join(Usuario, Usuario.empleado_id == Empleado.id)
                    .where(Usuario.id == seg.comercial_id)
                )
                res_empresa = await self.db.execute(stmt_empresa)
                empresa_id = res_empresa.scalar()

                nuevo_cliente = Cliente(
                    ruc=reg.ruc,
                    razon_social=reg.razon_social,
                    direccion_fiscal=reg.direccion_fiscal,
                    distrito_id=reg.distrito_id,
                    origen_id=reg.origen_id,
                    estado_id=activo_estado_id,
                    comercial_encargado_id=seg.comercial_id,
                    empresa_id=empresa_id,
                    created_by=usuario_id
                )
                self.db.add(nuevo_cliente)
                await self.db.flush()

                # Vincular el nuevo cliente al seguimiento
                seg.cliente_id = nuevo_cliente.id

                # Crear contacto principal si hay datos temporales
                if seg.temp_cliente_contacto or seg.temp_cliente_correo or seg.temp_cliente_telefono:
                    from app.models.comercial import ClienteContacto
                    contacto = ClienteContacto(
                        cliente_id=nuevo_cliente.id,
                        nombre=seg.temp_cliente_contacto or reg.razon_social,
                        correo=seg.temp_cliente_correo,
                        telefono=seg.temp_cliente_telefono,
                        es_principal=True,
                        created_by=usuario_id
                    )
                    self.db.add(contacto)

                # Limpiar campos temporales
                seg.temp_cliente_nombre = None
                seg.temp_cliente_ruc = None
                seg.temp_cliente_contacto = None
                seg.temp_cliente_correo = None
                seg.temp_cliente_telefono = None

            fecha_dt = None
            if data.fecha_cambio:
                fecha_dt = datetime(data.fecha_cambio.year, data.fecha_cambio.month, data.fecha_cambio.day)

            # 1. Aceptar cotización elegida
            cot_elegida.estado = "ACEPTADO"
            cot_elegida.codigo_operacion = data.codigo_operacion
            cot_elegida.segmentacion_id = data.segmentacion_id
            cot_elegida.fecha_cierre = data.fecha_cambio if data.fecha_cambio else date.today()

            # 2. Descartar las demás cotizaciones pendientes
            stmt_others = update(Cotizacion).where(
                and_(
                    Cotizacion.seguimiento_id == id,
                    Cotizacion.id != data.cotizacion_id,
                    Cotizacion.estado == "PENDIENTE"
                )
            ).values(estado="DESCARTADO")
            await self.db.execute(stmt_others)

            # 3. Cambiar estado a CIERRE
            estado_anterior = seg.estado
            seg.estado = "CIERRE"
            seg.updated_by = usuario_id

            # 4. Comentario
            comentario_texto = f"Cierre de venta exitoso con la cotización ID {data.cotizacion_id}. Código COR de SISPAC: {data.codigo_operacion}."
            if data.comentario:
                comentario_texto += f" Comentario adicional: {data.comentario}"

            comentario_kwargs = {
                "seguimiento_id": id,
                "comentario": comentario_texto,
                "medio_gestion_id": data.medio_gestion_id,
                "created_by": usuario_id
            }
            if fecha_dt:
                comentario_kwargs["created_at"] = fecha_dt
            comentario = SeguimientoComentario(**comentario_kwargs)
            self.db.add(comentario)

            # 5. Historial
            hist_kwargs = {
                "seguimiento_id": id,
                "estado_anterior": estado_anterior,
                "estado_nuevo": "CIERRE",
                "comentario": f"Cierre de venta (COR: {data.codigo_operacion})",
                "registrado_por": usuario_id
            }
            if fecha_dt:
                hist_kwargs["fecha_cambio"] = fecha_dt
            hist = SeguimientoHistorial(**hist_kwargs)
            self.db.add(hist)

        await self.db.commit()
        await self.db.refresh(seg)
        return seg

    # ══════════════════════════════════════════════
    # OPERAR SEGUIMIENTO (CIERRE → EN_OPERACION)
    # ══════════════════════════════════════════════

    async def operar_seguimiento(self, id: int, data: SeguimientoOperar, usuario_id: int) -> Seguimiento:
        """
        Transiciona la tarjeta a EN_OPERACION.
        - Asigna la fecha ETA y el contacto para alertas.
        - Actualiza el Incoterm en la cotización aceptada.
        - Crea los registros de documentos requeridos.
        """
        seg = await self.db.get(Seguimiento, id)
        if not seg or not seg.is_active:
            raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

        if seg.estado != "CIERRE":
            raise HTTPException(status_code=400, detail="Solo se puede pasar a EN_OPERACION desde el estado CIERRE")

        # Validar incoterm
        incoterms_validos = {"EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"}
        if data.incoterm.upper() not in incoterms_validos:
            raise HTTPException(status_code=400, detail=f"Incoterm inválido. Opciones: {', '.join(sorted(incoterms_validos))}")

        async with self.db.begin_nested():
            # 1. Asignar datos operacionales
            seg.fecha_eta = data.fecha_eta
            seg.contacto_alerta_id = data.contacto_alerta_id

            # 2. Calcular fecha límite de documentos según tipo servicio + carga
            cot_aceptada = next((c for c in seg.cotizaciones if c.estado == "ACEPTADO"), None)
            if cot_aceptada:
                cot_aceptada.incoterm = data.incoterm.upper()

                # Obtener nombres de catálogo para calcular días de anticipación
                tipo_servicio_nombre = cot_aceptada.tipo_servicio_nombre.upper().strip() if cot_aceptada.tipo_servicio_nombre else ""
                tipo_carga_nombre = cot_aceptada.tipo_carga_nombre.upper().strip() if cot_aceptada.tipo_carga_nombre else ""

                from app.services.comercial.notificacion_operacional_service import calcular_dias_anticipacion
                dias_anticipacion = calcular_dias_anticipacion(tipo_servicio_nombre, tipo_carga_nombre)

                if dias_anticipacion is not None:
                    seg.fecha_limite_documentos = data.fecha_eta - timedelta(days=dias_anticipacion)
                    logger.info(
                        f"[OPERAR] Seguimiento #{id}: fecha_limite_documentos = {seg.fecha_limite_documentos} "
                        f"(ETA {data.fecha_eta} - {dias_anticipacion} días [{tipo_servicio_nombre}/{tipo_carga_nombre}])"
                    )
                else:
                    logger.warning(
                        f"[OPERAR] Seguimiento #{id}: No se pudo calcular fecha límite de documentos "
                        f"para combinación {tipo_servicio_nombre}/{tipo_carga_nombre}. "
                        f"Se usará fecha_eta como referencia."
                    )
                    seg.fecha_limite_documentos = data.fecha_eta

            # 3. Crear registros de documentos requeridos
            for doc_id in data.documento_ids:
                doc_rel = SeguimientoDocumento(
                    seguimiento_id=id,
                    documento_id=doc_id,
                    completado=False
                )
                self.db.add(doc_rel)

            # 4. Cambiar estado
            estado_anterior = seg.estado
            seg.estado = "EN_OPERACION"
            seg.updated_by = usuario_id

            fecha_dt = None
            if data.fecha_cambio:
                fecha_dt = datetime(data.fecha_cambio.year, data.fecha_cambio.month, data.fecha_cambio.day)

            # 5. Comentario
            comentario_texto = f"Tarjeta pasa a EN OPERACIÓN. ETA: {data.fecha_eta}. Incoterm: {data.incoterm.upper()}. {len(data.documento_ids)} documentos asignados."
            if data.comentario:
                comentario_texto += f" {data.comentario}"

            comentario_kwargs = {
                "seguimiento_id": id,
                "comentario": comentario_texto,
                "medio_gestion_id": data.medio_gestion_id,
                "created_by": usuario_id
            }
            if fecha_dt:
                comentario_kwargs["created_at"] = fecha_dt
            comentario = SeguimientoComentario(**comentario_kwargs)
            self.db.add(comentario)

            # 6. Historial
            hist_kwargs = {
                "seguimiento_id": id,
                "estado_anterior": estado_anterior,
                "estado_nuevo": "EN_OPERACION",
                "comentario": f"ETA: {data.fecha_eta} | Incoterm: {data.incoterm.upper()}",
                "registrado_por": usuario_id
            }
            if fecha_dt:
                hist_kwargs["fecha_cambio"] = fecha_dt
            hist = SeguimientoHistorial(**hist_kwargs)
            self.db.add(hist)

        await self.db.commit()
        await self.db.refresh(seg)
        return seg

    # ══════════════════════════════════════════════
    # ENTREGAR CARGA (EN_OPERACION → CARGA_ENTREGADA)
    # ══════════════════════════════════════════════

    async def entregar_carga(self, id: int, data: SeguimientoEntregar, usuario_id: int) -> Seguimiento:
        """Marca la tarjeta como CARGA_ENTREGADA."""
        seg = await self.db.get(Seguimiento, id)
        if not seg or not seg.is_active:
            raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

        if seg.estado != "EN_OPERACION":
            raise HTTPException(status_code=400, detail="Solo se puede entregar desde el estado EN_OPERACION")

        async with self.db.begin_nested():
            estado_anterior = seg.estado
            seg.estado = "CARGA_ENTREGADA"
            seg.updated_by = usuario_id

            fecha_dt = None
            if data.fecha_cambio:
                fecha_dt = datetime(data.fecha_cambio.year, data.fecha_cambio.month, data.fecha_cambio.day)

            comentario_texto = "Carga entregada exitosamente."
            if data.comentario:
                comentario_texto += f" {data.comentario}"

            comentario_kwargs = {
                "seguimiento_id": id,
                "comentario": comentario_texto,
                "medio_gestion_id": data.medio_gestion_id,
                "created_by": usuario_id
            }
            if fecha_dt:
                comentario_kwargs["created_at"] = fecha_dt
            comentario = SeguimientoComentario(**comentario_kwargs)
            self.db.add(comentario)

            hist_kwargs = {
                "seguimiento_id": id,
                "estado_anterior": estado_anterior,
                "estado_nuevo": "CARGA_ENTREGADA",
                "comentario": "Carga entregada",
                "registrado_por": usuario_id
            }
            if fecha_dt:
                hist_kwargs["fecha_cambio"] = fecha_dt
            hist = SeguimientoHistorial(**hist_kwargs)
            self.db.add(hist)

        await self.db.commit()
        await self.db.refresh(seg)
        return seg

    # ══════════════════════════════════════════════
    # CAER SEGUIMIENTO
    # ══════════════════════════════════════════════

    async def caer_seguimiento(self, id: int, data: SeguimientoCaer, usuario_id: int) -> Seguimiento:
        """
        Marca la tarjeta como CAIDO.
        - Todas las cotizaciones 'PENDIENTE' de la tarjeta pasan a 'RECHAZADO'.
        - La tarjeta pasa a 'CAIDO' y registra el motivo de caída global.
        """
        seg = await self.db.get(Seguimiento, id)
        if not seg or not seg.is_active:
            raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

        if seg.estado == "CAIDO":
            raise HTTPException(status_code=400, detail="El seguimiento ya se encuentra caído")

        # Validar que la transición es válida
        destinos_validos = TRANSICIONES_VALIDAS.get(seg.estado, [])
        if "CAIDO" not in destinos_validos:
            raise HTTPException(status_code=400, detail=f"No se puede caer desde el estado {seg.estado}")

        async with self.db.begin_nested():
            # 1. Rechazar todas las cotizaciones activas y limpiar metadatos de cierre
            stmt_cotizaciones = update(Cotizacion).where(
                and_(
                    Cotizacion.seguimiento_id == id,
                    Cotizacion.estado.in_(["PENDIENTE", "ACEPTADO", "DESCARTADO"])
                )
            ).values(
                estado="RECHAZADO",
                codigo_operacion=None,
                segmentacion_id=None,
                fecha_cierre=None
            )
            await self.db.execute(stmt_cotizaciones)

            # 2. Registrar el motivo de caída y cambiar estado de la tarjeta
            estado_anterior = seg.estado
            seg.estado = "CAIDO"
            seg.motivo_caida = data.motivo_caida
            seg.updated_by = usuario_id

            fecha_dt = None
            if data.fecha_cambio:
                fecha_dt = datetime(data.fecha_cambio.year, data.fecha_cambio.month, data.fecha_cambio.day)

            # 3. Registrar comentario de caída
            comentario_texto = f"Negociación caída. Motivo: {data.motivo_caida}."
            if data.comentario:
                comentario_texto += f" Comentario adicional: {data.comentario}"

            comentario_kwargs = {
                "seguimiento_id": id,
                "comentario": comentario_texto,
                "medio_gestion_id": data.medio_gestion_id,
                "created_by": usuario_id
            }
            if fecha_dt:
                comentario_kwargs["created_at"] = fecha_dt
            comentario = SeguimientoComentario(**comentario_kwargs)
            self.db.add(comentario)

            # 4. Historial de transición
            hist_kwargs = {
                "seguimiento_id": id,
                "estado_anterior": estado_anterior,
                "estado_nuevo": "CAIDO",
                "comentario": f"Caído. Motivo: {data.motivo_caida}",
                "registrado_por": usuario_id
            }
            if fecha_dt:
                hist_kwargs["fecha_cambio"] = fecha_dt
            hist = SeguimientoHistorial(**hist_kwargs)
            self.db.add(hist)

        await self.db.commit()
        await self.db.refresh(seg)
        return seg

    # ══════════════════════════════════════════════
    # TOGGLE DOCUMENTO (CHECKLIST)
    # ══════════════════════════════════════════════

    async def toggle_documento(self, seguimiento_id: int, doc_rel_id: int, completado: bool, usuario_id: int) -> SeguimientoDocumento:
        """Marca un documento como recibido o pendiente."""
        doc_rel = await self.db.get(SeguimientoDocumento, doc_rel_id)
        if not doc_rel or doc_rel.seguimiento_id != seguimiento_id:
            raise HTTPException(status_code=404, detail="Documento no encontrado en este seguimiento")

        doc_rel.completado = completado
        if completado:
            doc_rel.fecha_recepcion = datetime.now()
            doc_rel.registrado_por = usuario_id
        else:
            doc_rel.fecha_recepcion = None
            doc_rel.registrado_por = None

        await self.db.commit()
        await self.db.refresh(doc_rel)

        # Verificar si todos los documentos están completados
        result = await self.db.execute(
            select(func.count()).select_from(SeguimientoDocumento).where(
                and_(
                    SeguimientoDocumento.seguimiento_id == seguimiento_id,
                    SeguimientoDocumento.completado == False
                )
            )
        )
        pendientes = result.scalar() or 0

        if pendientes == 0 and completado:
            # Todos los documentos completados — registrar comentario
            comentario = SeguimientoComentario(
                seguimiento_id=seguimiento_id,
                comentario="✅ Todos los documentos han sido recepcionados correctamente.",
                created_by=usuario_id
            )
            self.db.add(comentario)

            # Registrar alerta de confirmación
            alerta = SeguimientoAlertaEnviada(
                seguimiento_id=seguimiento_id,
                dias_antes_eta=0,
                tipo="CONFIRMACION_COMPLETA"
            )
            self.db.add(alerta)

            await self.db.commit()

            # Enviar correo y WhatsApp de confirmación
            try:
                seg = await self.db.get(Seguimiento, seguimiento_id)
                if seg and seg.contacto_alerta:
                    from app.services.comercial.notificacion_operacional_service import NotificacionOperacionalService
                    notif_svc = NotificacionOperacionalService(self.db)
                    
                    empresa_id = None
                    if seg.cliente:
                        empresa_id = seg.cliente.empresa_id
                    if not empresa_id and seg.comercial and seg.comercial.empleado:
                        empresa_id = seg.comercial.empleado.empresa_id

                    canal = await notif_svc.enviar_confirmacion_docs_completos(
                        telefono=seg.contacto_alerta.telefono if seg.contacto_alerta else None,
                        correo=seg.contacto_alerta.correo if seg.contacto_alerta else None,
                        razon_social=seg.cliente_razon_social,
                        titulo_embarque=seg.titulo,
                        nombre_contacto=seg.contacto_alerta.nombre if seg.contacto_alerta else "",
                        empresa_id=empresa_id
                    )
                    if canal:
                        logger.info(f"[DOCS-COMPLETOS] Confirmación enviada por {canal} para seguimiento #{seguimiento_id}")
            except Exception as e:
                logger.error(f"Error enviando confirmación de documentos completos: {e}", exc_info=True)

        return doc_rel

    # ══════════════════════════════════════════════
    # COMENTARIOS E HISTORIAL
    # ══════════════════════════════════════════════

    async def registrar_comentario(self, id: int, comentario: str, medio_gestion_id: int = None, usuario_id: int = None) -> SeguimientoComentario:
        """Registra un nuevo comentario/gestión manual en la tarjeta."""
        seg = await self.db.get(Seguimiento, id)
        if not seg or not seg.is_active:
            raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

        comentario_obj = SeguimientoComentario(
            seguimiento_id=id,
            comentario=comentario,
            medio_gestion_id=medio_gestion_id,
            created_by=usuario_id
        )
        self.db.add(comentario_obj)
        await self.db.commit()
        await self.db.refresh(comentario_obj)
        return comentario_obj

    async def get_historial(self, id: int) -> list[SeguimientoHistorial]:
        """Obtiene el historial de transiciones de una tarjeta."""
        result = await self.db.execute(
            select(SeguimientoHistorial)
            .where(SeguimientoHistorial.seguimiento_id == id)
            .order_by(desc(SeguimientoHistorial.fecha_cambio))
        )
        return result.scalars().all()

    async def get_comentarios(self, id: int) -> list[SeguimientoComentario]:
        """Obtiene los comentarios registrados en una tarjeta."""
        result = await self.db.execute(
            select(SeguimientoComentario)
            .where(SeguimientoComentario.seguimiento_id == id)
            .order_by(desc(SeguimientoComentario.created_at))
        )
        return result.scalars().all()
