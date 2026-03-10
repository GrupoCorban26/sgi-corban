import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import selectinload
from app.models.lead_web import LeadWeb
from app.models.seguridad import Usuario, Rol
from app.models.comercial import Cliente
from app.models.administrativo import Empleado
from app.schemas.comercial.lead_web import LeadWebCreate
from app.core.query_helpers import aplicar_filtro_comercial
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Lock global para prevenir condiciones de carrera en el Round Robin
_lead_web_rr_lock = asyncio.Lock()

# Mapeo de página de origen → empresa del empleado
MAPEO_PAGINA_EMPRESA = {
    "grupocorban.pe": "Corban Trans Logistic",
    "corbantranslogistic.com": "Corban Trans Logistic",
    "corbanaduanas.pe": "Corban Trans Logistic",
    "eblgroup.pe": "EBL",
}

# Dominios permitidos (se extraen del mapeo)
DOMINIOS_PERMITIDOS = set(MAPEO_PAGINA_EMPRESA.keys())


class LeadWebService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def recibir_lead(self, data: LeadWebCreate) -> dict:
        """
        Recibe un lead del formulario web, lo registra y asigna un comercial.
        El round-robin filtra comerciales por la empresa asociada al dominio.
        """
        # 1. Resolver la empresa según la página de origen
        empresa = MAPEO_PAGINA_EMPRESA.get(data.pagina_origen)
        if not empresa:
            raise ValueError(f"Página de origen no reconocida: {data.pagina_origen}")

        # 2. Verificar duplicado reciente (mismo correo + misma página, último minuto)
        query_duplicado = select(LeadWeb).where(
            and_(
                LeadWeb.correo == data.correo,
                LeadWeb.pagina_origen == data.pagina_origen,
                LeadWeb.estado == "NUEVO",
            )
        ).order_by(LeadWeb.id.desc()).limit(1)
        resultado_dup = await self.db.execute(query_duplicado)
        duplicado = resultado_dup.scalar_one_or_none()

        if duplicado:
            # Retornar el lead existente sin crear duplicado
            return {
                "lead_id": duplicado.id,
                "asignado": duplicado.asignado_a is not None,
                "mensaje": "Lead ya registrado previamente"
            }

        # 3. Asignar comercial vía Round Robin filtrado por empresa
        usuario_asignado = await self._asignar_comercial_round_robin(empresa)

        # 4. Crear el registro del lead
        nuevo_lead = LeadWeb(
            nombre=data.nombre,
            correo=data.correo,
            telefono=data.telefono,
            asunto=data.asunto,
            mensaje=data.mensaje,
            pagina_origen=data.pagina_origen,
            servicio_interes=data.servicio_interes,
            asignado_a=usuario_asignado.id if usuario_asignado else None,
            estado="PENDIENTE" if usuario_asignado else "NUEVO",
            fecha_asignacion=datetime.now() if usuario_asignado else None,
        )
        self.db.add(nuevo_lead)
        await self.db.commit()
        await self.db.refresh(nuevo_lead)

        # 5. Notificar al comercial asignado
        if usuario_asignado:
            try:
                from app.services.notificacion_service import NotificacionService
                notif_svc = NotificacionService(self.db)
                await notif_svc.crear_notificacion(
                    usuario_id=usuario_asignado.id,
                    tipo="LEAD_WEB",
                    titulo="🌐 Nuevo Lead Web",
                    mensaje=f"Nuevo lead de {data.pagina_origen}: {data.nombre} - {data.asunto}",
                    url_destino="/comercial/leads-web"
                )
            except Exception as e:
                logger.warning(f"No se pudo crear notificación para lead web: {e}")

        return {
            "lead_id": nuevo_lead.id,
            "asignado": usuario_asignado is not None,
            "mensaje": "Lead registrado exitosamente"
        }

    async def _asignar_comercial_round_robin(self, empresa: str) -> Usuario | None:
        """
        Asigna un comercial usando Round Robin, filtrado por empresa.
        Solo considera usuarios con rol COMERCIAL, activos y disponibles en buzón,
        cuyo empleado pertenezca a la empresa indicada.
        """
        async with _lead_web_rr_lock:
            # Obtener comerciales activos de la empresa correspondiente
            query_usuarios = (
                select(Usuario)
                .join(Usuario.roles)
                .join(Usuario.empleado)
                .where(
                    and_(
                        Rol.nombre == "COMERCIAL",
                        Usuario.is_active == True,
                        Usuario.disponible_buzon == True,
                        Empleado.empresa == empresa,
                        Empleado.is_active == True,
                    )
                )
                .options(selectinload(Usuario.empleado))
            )

            resultado = await self.db.execute(query_usuarios)
            comerciales = list(resultado.scalars().all())

            if not comerciales:
                # Fallback: intentar con todos los de la empresa (sin filtro disponible_buzon)
                query_fallback = (
                    select(Usuario)
                    .join(Usuario.roles)
                    .join(Usuario.empleado)
                    .where(
                        and_(
                            Rol.nombre == "COMERCIAL",
                            Usuario.is_active == True,
                            Empleado.empresa == empresa,
                            Empleado.is_active == True,
                        )
                    )
                    .options(selectinload(Usuario.empleado))
                )
                resultado_fb = await self.db.execute(query_fallback)
                comerciales = list(resultado_fb.scalars().all())

                if not comerciales:
                    logger.warning(f"No se encontraron comerciales para la empresa: {empresa}")
                    return None

            # Ordenar por ID para consistencia
            comerciales_ordenados = sorted(comerciales, key=lambda u: u.id)

            # Buscar el último lead web asignado para esta empresa
            ultimo_query = (
                select(LeadWeb)
                .where(
                    and_(
                        LeadWeb.asignado_a.isnot(None),
                        LeadWeb.pagina_origen.in_(
                            [k for k, v in MAPEO_PAGINA_EMPRESA.items() if v == empresa]
                        ),
                    )
                )
                .order_by(LeadWeb.id.desc())
                .limit(1)
            )
            resultado_ultimo = await self.db.execute(ultimo_query)
            ultimo_lead = resultado_ultimo.scalar_one_or_none()

            if ultimo_lead and ultimo_lead.asignado_a:
                ids_comerciales = [c.id for c in comerciales_ordenados]
                if ultimo_lead.asignado_a in ids_comerciales:
                    ultimo_idx = ids_comerciales.index(ultimo_lead.asignado_a)
                    siguiente_idx = (ultimo_idx + 1) % len(comerciales_ordenados)
                else:
                    siguiente_idx = 0
                return comerciales_ordenados[siguiente_idx]
            else:
                return comerciales_ordenados[0]

    async def listar_leads(
        self,
        estado: Optional[str] = None,
        pagina_origen: Optional[str] = None,
        comercial_ids: Optional[list] = None,
        filtro_comercial_id: Optional[int] = None,
    ) -> list:
        """Lista leads web con filtros opcionales."""
        query = select(LeadWeb).options(
            selectinload(LeadWeb.usuario_asignado).selectinload(Usuario.empleado)
        )

        if estado:
            query = query.where(LeadWeb.estado == estado)
        if pagina_origen:
            query = query.where(LeadWeb.pagina_origen == pagina_origen)

        # Filtro por equipo comercial
        query = await aplicar_filtro_comercial(
            query, LeadWeb.asignado_a, self.db,
            comercial_ids=comercial_ids,
            filtro_comercial_id=filtro_comercial_id,
            incluir_sin_asignar=True
        )
        if query is None:
            return []

        query = query.order_by(LeadWeb.fecha_recepcion.desc())
        resultado = await self.db.execute(query)
        return resultado.scalars().all()

    async def obtener_lead(self, lead_id: int) -> LeadWeb | None:
        """Obtiene un lead por su ID."""
        query = select(LeadWeb).where(LeadWeb.id == lead_id).options(
            selectinload(LeadWeb.usuario_asignado).selectinload(Usuario.empleado)
        )
        resultado = await self.db.execute(query)
        return resultado.scalar_one_or_none()

    async def cambiar_estado(self, lead_id: int, nuevo_estado: str, notas: Optional[str] = None) -> bool:
        """Cambia el estado de un lead."""
        lead = await self.db.get(LeadWeb, lead_id)
        if not lead:
            return False

        lead.estado = nuevo_estado
        if notas:
            lead.notas = notas

        if nuevo_estado == "EN_GESTION" and not lead.fecha_primera_respuesta:
            lead.fecha_primera_respuesta = datetime.now()
            # Calcular tiempo de respuesta
            base_fecha = lead.fecha_asignacion or lead.fecha_recepcion
            if base_fecha:
                from app.utils.horario_laboral import calcular_segundos_horario_laboral
                base_naive = base_fecha.replace(tzinfo=None) if base_fecha.tzinfo else base_fecha
                lead.tiempo_respuesta_segundos = calcular_segundos_horario_laboral(
                    base_naive, datetime.now()
                )

        await self.db.commit()
        return True

    async def descartar_lead(self, lead_id: int, motivo: str, comentario: str) -> bool:
        """Descarta un lead con motivo y comentario."""
        lead = await self.db.get(LeadWeb, lead_id)
        if not lead:
            return False

        lead.estado = "DESCARTADO"
        lead.motivo_descarte = motivo
        lead.comentario_descarte = comentario
        lead.fecha_gestion = datetime.now()

        await self.db.commit()
        return True

    async def convertir_lead(self, lead_id: int, cliente_id: Optional[int] = None, crear_prospecto: bool = False) -> dict:
        """
        Convierte un lead web en cliente.
        - Si se pasa cliente_id: vincula con ese cliente existente.
        - Si crear_prospecto=True: crea un nuevo prospecto en la cartera.
        """
        lead = await self.db.get(LeadWeb, lead_id)
        if not lead:
            raise ValueError("Lead no encontrado")

        if crear_prospecto and not cliente_id:
            # Crear prospecto nuevo
            nuevo_cliente = Cliente(
                razon_social=lead.nombre,
                tipo_estado="PROSPECTO",
                origen="FORMULARIO_WEB",
                sub_origen=lead.pagina_origen,
                comercial_encargado_id=lead.asignado_a,
                fecha_primer_contacto=lead.fecha_recepcion,
                fecha_conversion_cliente=datetime.now(),
            )
            self.db.add(nuevo_cliente)
            await self.db.flush()
            cliente_id = nuevo_cliente.id

        lead.estado = "CONVERTIDO"
        lead.cliente_convertido_id = cliente_id
        lead.fecha_gestion = datetime.now()

        await self.db.commit()

        return {
            "lead_id": lead.id,
            "cliente_id": cliente_id,
            "mensaje": "Lead convertido exitosamente"
        }

    async def actualizar_notas(self, lead_id: int, notas: str) -> bool:
        """Actualiza las notas de un lead."""
        lead = await self.db.get(LeadWeb, lead_id)
        if not lead:
            return False

        lead.notas = notas
        lead.updated_at = datetime.now()
        await self.db.commit()
        return True

    async def asignar_manual(self, lead_id: int, comercial_id: int) -> dict:
        """Asigna manualmente un lead a un comercial específico."""
        lead = await self.db.get(LeadWeb, lead_id)
        if not lead:
            raise ValueError("Lead no encontrado")

        # Verificar que el comercial existe y está activo
        query_user = select(Usuario).options(
            selectinload(Usuario.empleado)
        ).where(
            and_(Usuario.id == comercial_id, Usuario.is_active == True)
        )
        resultado = await self.db.execute(query_user)
        usuario = resultado.scalar_one_or_none()
        if not usuario:
            raise ValueError("Comercial no encontrado o inactivo")

        lead.asignado_a = comercial_id
        lead.estado = "PENDIENTE" if lead.estado == "NUEVO" else lead.estado
        lead.fecha_asignacion = datetime.now()

        await self.db.commit()
        await self.db.refresh(lead)

        nombre = (
            f"{usuario.empleado.nombres} {usuario.empleado.apellido_paterno}"
            if usuario.empleado
            else usuario.correo_corp
        )

        # Notificar al comercial
        try:
            from app.services.notificacion_service import NotificacionService
            notif_svc = NotificacionService(self.db)
            await notif_svc.crear_notificacion(
                usuario_id=comercial_id,
                tipo="LEAD_WEB",
                titulo="🌐 Lead Web asignado",
                mensaje=f"Se te asignó un lead web: {lead.nombre} - {lead.asunto}",
                url_destino="/comercial/leads-web"
            )
        except Exception as e:
            logger.warning(f"No se pudo crear notificación: {e}")

        return {
            "lead_id": lead.id,
            "asignado_a": comercial_id,
            "nombre_asignado": nombre,
            "estado": lead.estado
        }

    async def contar_pendientes(self, usuario_id: Optional[int] = None, comercial_ids: Optional[list] = None) -> int:
        """Cuenta leads pendientes, opcionalmente filtrado por usuario o equipo."""
        query = select(func.count()).select_from(LeadWeb).where(
            LeadWeb.estado.in_(["NUEVO", "PENDIENTE", "EN_GESTION"])
        )

        if usuario_id:
            query = query.where(LeadWeb.asignado_a == usuario_id)
        elif comercial_ids:
            query = query.where(LeadWeb.asignado_a.in_(comercial_ids))

        resultado = await self.db.execute(query)
        return resultado.scalar() or 0
