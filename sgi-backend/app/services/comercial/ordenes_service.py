import re
import pandas as pd
from io import BytesIO
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, case, literal_column
from fastapi import HTTPException

from app.models.orden import Orden
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.schemas.comercial.orden import ImportResult, ResumenComercial, ResumenPeriodo


# Clientes de "casa" — no cuentan para la meta comercial
CLIENTES_CASA = [
    "EBL GRUPO LOGISTICO S.A.C.",
    "EBL GRUPO LOGISTICO",
    "SOLDAMUNDO IMPORTACIONES S.A.C.",
    "SOLDAMUNDO PERU S.A.C.",
    "FERREMAS PERU S.A.C.",
]


def _es_cliente_casa(consignatario: str) -> bool:
    """Verifica si el consignatario es un cliente interno."""
    if not consignatario:
        return False
    nombre_upper = consignatario.strip().upper()
    return any(casa.upper() in nombre_upper for casa in CLIENTES_CASA)


def _extraer_numero_base(codigo: str) -> int | None:
    """
    Extrae el número base de cualquier formato de orden.
    CB0006851 → 6851
    COR6712   → 6712
    EBL00636  → 636
    """
    if not codigo or not isinstance(codigo, str):
        return None
    # Quitar prefijos conocidos
    cleaned = codigo.strip().upper()
    # Extraer solo los dígitos finales
    match = re.search(r'(\d+)$', cleaned)
    if match:
        return int(match.group(1).lstrip('0') or '0')
    return None


def _detectar_empresa_de_codigo(codigo: str) -> str:
    """Detecta la empresa de origen según el prefijo del código."""
    if not codigo:
        return "CORBAN"
    upper = codigo.strip().upper()
    if upper.startswith("EBL"):
        return "EBL"
    return "CORBAN"


def _parse_fecha(valor) -> datetime | None:
    """Parsea valores de fecha del Excel de forma flexible."""
    if pd.isna(valor):
        return None
    if isinstance(valor, datetime):
        return valor
    if isinstance(valor, str):
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(valor.strip(), fmt)
            except ValueError:
                continue
    return None


class OrdenesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_mapeo_iniciales(self) -> dict[str, int]:
        """
        Obtiene el mapeo iniciales_sispac → usuario_id desde Empleado → Usuario.
        """
        result = await self.db.execute(
            select(Empleado.iniciales_sispac, Usuario.id)
            .join(Usuario, Usuario.empleado_id == Empleado.id)
            .where(
                Empleado.iniciales_sispac.isnot(None),
                Empleado.is_active == True,
                Usuario.is_active == True,
            )
        )
        return {row[0].upper(): row[1] for row in result.all() if row[0]}

    async def importar_sispac(
        self, file_bytes: bytes, empresa: str, usuario_id: int
    ) -> ImportResult:
        """
        Importa órdenes desde un Excel de SISPAC.
        empresa: 'CORBAN' o 'EBL'
        """
        resultado = ImportResult()
        try:
            df = pd.read_excel(BytesIO(file_bytes), header=3)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al leer el Excel: {str(e)}")

        # Validar columnas mínimas
        required = ["N° ORDEN", "T.SERVICIO", "ESTADO"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Columnas faltantes en el Excel: {', '.join(missing)}"
            )

        mapeo_iniciales = await self._get_mapeo_iniciales()
        resultado.total_filas = len(df)

        for idx, row in df.iterrows():
            try:
                codigo_sispac = str(row.get("N° ORDEN", "")).strip()
                if not codigo_sispac or codigo_sispac == "nan":
                    continue

                numero_base = _extraer_numero_base(codigo_sispac)
                if numero_base is None:
                    resultado.errores += 1
                    resultado.detalle_errores.append(
                        f"Fila {idx + 5}: No se pudo extraer número de '{codigo_sispac}'"
                    )
                    continue

                # Normalizar tipo de servicio
                tipo_raw = str(row.get("T.SERVICIO", "")).strip().upper()
                tipo_servicio = "CARGA" if "CARGA" in tipo_raw else "LOGISTICO"

                consignatario = str(row.get("CONSIGNATARIO", "")).strip()
                if consignatario == "nan":
                    consignatario = None

                comercial_ini = str(row.get("COMERCIAL", "")).strip().upper()
                if comercial_ini == "NAN":
                    comercial_ini = None

                fecha = _parse_fecha(row.get("FCH. INGRE"))
                estado = str(row.get("ESTADO", "")).strip().upper()
                if estado == "NAN":
                    estado = None

                # Determinar periodo
                periodo = fecha.strftime("%Y-%m") if fecha else datetime.now().strftime("%Y-%m")

                # Buscar si ya existe
                existing = await self.db.execute(
                    select(Orden).where(
                        Orden.numero_base == numero_base,
                        Orden.empresa_origen == empresa,
                    )
                )
                orden = existing.scalar()

                if orden:
                    # Actualizar
                    orden.codigo_sispac = codigo_sispac
                    orden.tipo_servicio = tipo_servicio
                    orden.consignatario = consignatario or orden.consignatario
                    orden.comercial_iniciales = comercial_ini or orden.comercial_iniciales
                    orden.estado_sispac = estado
                    orden.fecha_ingreso = fecha or orden.fecha_ingreso
                    orden.es_casa = _es_cliente_casa(consignatario) if consignatario else orden.es_casa
                    orden.updated_at = datetime.now()
                    # Actualizar comercial_id si hay mapeo
                    if comercial_ini and comercial_ini in mapeo_iniciales:
                        orden.comercial_id = mapeo_iniciales[comercial_ini]
                    resultado.actualizadas += 1
                else:
                    # Crear nueva
                    comercial_id = mapeo_iniciales.get(comercial_ini) if comercial_ini else None
                    nueva = Orden(
                        numero_base=numero_base,
                        empresa_origen=empresa,
                        codigo_sispac=codigo_sispac,
                        fecha_ingreso=fecha,
                        tipo_servicio=tipo_servicio,
                        consignatario=consignatario,
                        comercial_iniciales=comercial_ini,
                        comercial_id=comercial_id,
                        estado_sispac=estado,
                        es_casa=_es_cliente_casa(consignatario) if consignatario else False,
                        periodo=periodo,
                        importado_por=usuario_id,
                    )
                    self.db.add(nueva)
                    resultado.nuevas += 1

            except Exception as e:
                resultado.errores += 1
                resultado.detalle_errores.append(f"Fila {idx + 5}: {str(e)}")

        await self.db.commit()
        return resultado

    async def importar_sintad(
        self, file_bytes: bytes, usuario_id: int
    ) -> ImportResult:
        """
        Importa órdenes desde un Excel de SINTAD.
        Cruza con órdenes SISPAC existentes vía numero_base.
        """
        resultado = ImportResult()
        try:
            df = pd.read_excel(BytesIO(file_bytes), header=4)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al leer el Excel: {str(e)}")

        required = ["Referencia Clte.", "Cliente"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Columnas faltantes: {', '.join(missing)}"
            )

        resultado.total_filas = len(df)

        for idx, row in df.iterrows():
            try:
                ref_cliente = str(row.get("Referencia Clte.", "")).strip()
                if not ref_cliente or ref_cliente == "nan":
                    continue

                numero_base = _extraer_numero_base(ref_cliente)
                if numero_base is None:
                    resultado.errores += 1
                    resultado.detalle_errores.append(
                        f"Fila {idx + 6}: No se pudo extraer número de '{ref_cliente}'"
                    )
                    continue

                empresa_origen = _detectar_empresa_de_codigo(ref_cliente)
                consignatario = str(row.get("Cliente", "")).strip()
                if consignatario == "nan":
                    consignatario = None

                nro_orden = str(row.get("Nro. Orden", "")).strip()
                if nro_orden == "nan":
                    nro_orden = None

                fecha = _parse_fecha(row.get("Fecha Orden"))
                estado = str(row.get("Estado", "")).strip() if pd.notna(row.get("Estado")) else None

                periodo = fecha.strftime("%Y-%m") if fecha else datetime.now().strftime("%Y-%m")

                # Buscar si ya existe (cruce con SISPAC)
                existing = await self.db.execute(
                    select(Orden).where(
                        Orden.numero_base == numero_base,
                        Orden.empresa_origen == empresa_origen,
                    )
                )
                orden = existing.scalar()

                if orden:
                    # Ya existe de SISPAC → actualizar con datos SINTAD
                    orden.codigo_sintad = ref_cliente
                    orden.nro_orden_sintad = nro_orden
                    orden.estado_sintad = estado
                    # Si ya tenía un tipo de SISPAC y ahora tiene SINTAD → es INTEGRAL
                    if orden.codigo_sispac:
                        orden.tipo_servicio = "INTEGRAL"
                    else:
                        orden.tipo_servicio = "ADUANAS"
                    orden.consignatario = consignatario or orden.consignatario
                    orden.es_casa = _es_cliente_casa(consignatario) if consignatario else orden.es_casa
                    orden.updated_at = datetime.now()
                    resultado.actualizadas += 1
                else:
                    # No existe → crear como nueva orden de aduanas
                    nueva = Orden(
                        numero_base=numero_base,
                        empresa_origen=empresa_origen,
                        codigo_sintad=ref_cliente,
                        nro_orden_sintad=nro_orden,
                        fecha_ingreso=fecha,
                        tipo_servicio="ADUANAS",
                        consignatario=consignatario,
                        estado_sintad=estado,
                        es_casa=_es_cliente_casa(consignatario) if consignatario else False,
                        periodo=periodo,
                        importado_por=usuario_id,
                    )
                    self.db.add(nueva)
                    resultado.nuevas += 1

            except Exception as e:
                resultado.errores += 1
                resultado.detalle_errores.append(f"Fila {idx + 6}: {str(e)}")

        await self.db.commit()
        return resultado

    async def get_ordenes(
        self,
        periodo: str | None = None,
        empresa: str | None = None,
        comercial_id: int | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict:
        """Listado paginado de órdenes con filtros."""
        stmt = select(
            Orden,
            (Empleado.nombres + ' ' + Empleado.apellido_paterno).label("comercial_nombre")
        ).outerjoin(
            Usuario, Orden.comercial_id == Usuario.id
        ).outerjoin(
            Empleado, Usuario.empleado_id == Empleado.id
        )
        count_stmt = select(func.count(Orden.id))

        filters = []
        if periodo:
            filters.append(Orden.periodo == periodo)
        if empresa:
            filters.append(Orden.empresa_origen == empresa)
        if comercial_id:
            filters.append(Orden.comercial_id == comercial_id)

        if filters:
            stmt = stmt.where(and_(*filters))
            count_stmt = count_stmt.where(and_(*filters))

        # Total
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar()

        # Paginado
        offset = (page - 1) * page_size
        stmt = stmt.order_by(Orden.fecha_ingreso.desc()).offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        rows = result.all()

        ordenes = []
        for orden, comercial_nombre in rows:
            ordenes.append({
                "id": orden.id,
                "numero_base": orden.numero_base,
                "empresa_origen": orden.empresa_origen,
                "codigo_sispac": orden.codigo_sispac,
                "codigo_sintad": orden.codigo_sintad,
                "nro_orden_sintad": orden.nro_orden_sintad,
                "fecha_ingreso": str(orden.fecha_ingreso) if orden.fecha_ingreso else None,
                "tipo_servicio": orden.tipo_servicio,
                "consignatario": orden.consignatario,
                "comercial_iniciales": orden.comercial_iniciales,
                "comercial_nombre": comercial_nombre,
                "estado_sispac": orden.estado_sispac,
                "estado_sintad": orden.estado_sintad,
                "es_casa": orden.es_casa,
                "periodo": orden.periodo,
            })

        return {
            "data": ordenes,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size if total else 0,
        }

    async def get_resumen(self, periodo: str) -> ResumenPeriodo:
        """Resumen de órdenes por comercial para un periodo."""

        # Total por tipo de servicio
        tipo_result = await self.db.execute(
            select(Orden.tipo_servicio, func.count(Orden.id))
            .where(Orden.periodo == periodo)
            .group_by(Orden.tipo_servicio)
        )
        por_tipo = {row[0]: row[1] for row in tipo_result.all()}

        # Total por empresa
        emp_result = await self.db.execute(
            select(Orden.empresa_origen, func.count(Orden.id))
            .where(Orden.periodo == periodo)
            .group_by(Orden.empresa_origen)
        )
        por_empresa = {row[0]: row[1] for row in emp_result.all()}

        # Total general y sin casa
        total_result = await self.db.execute(
            select(func.count(Orden.id)).where(Orden.periodo == periodo)
        )
        total = total_result.scalar() or 0

        sin_casa_result = await self.db.execute(
            select(func.count(Orden.id)).where(
                Orden.periodo == periodo,
                Orden.es_casa == False,
            )
        )
        total_sin_casa = sin_casa_result.scalar() or 0

        # Por comercial (excluyendo casas para la meta)
        comercial_result = await self.db.execute(
            select(
                Orden.comercial_id,
                (Empleado.nombres + ' ' + Empleado.apellido_paterno).label("comercial_nombre"),
                Orden.comercial_iniciales,
                func.count(Orden.id).label("total"),
                func.sum(case((Orden.tipo_servicio == "CARGA", 1), else_=0)).label("carga"),
                func.sum(case((Orden.tipo_servicio == "ADUANAS", 1), else_=0)).label("aduanas"),
                func.sum(case((Orden.tipo_servicio.in_(["INTEGRAL", "LOGISTICO"]), 1), else_=0)).label("integral"),
            )
            .outerjoin(Usuario, Orden.comercial_id == Usuario.id)
            .outerjoin(Empleado, Usuario.empleado_id == Empleado.id)
            .where(Orden.periodo == periodo, Orden.es_casa == False)
            .group_by(Orden.comercial_id, Empleado.nombres, Empleado.apellido_paterno, Orden.comercial_iniciales)
        )

        comerciales = []
        for row in comercial_result.all():
            total_ord = row.total or 0
            comerciales.append(ResumenComercial(
                comercial_id=row.comercial_id,
                comercial_nombre=row.comercial_nombre or row.comercial_iniciales or "Sin asignar",
                comercial_iniciales=row.comercial_iniciales,
                total_ordenes=total_ord,
                ordenes_carga=row.carga or 0,
                ordenes_aduanas=row.aduanas or 0,
                ordenes_integral=row.integral or 0,
                meta=20,
                porcentaje_meta=round((total_ord / 20) * 100, 1),
            ))

        # Ordenar por total de órdenes desc
        comerciales.sort(key=lambda x: x.total_ordenes, reverse=True)

        return ResumenPeriodo(
            periodo=periodo,
            total_ordenes=total,
            total_sin_casa=total_sin_casa,
            por_tipo_servicio=por_tipo,
            por_empresa=por_empresa,
            comerciales=comerciales,
        )
