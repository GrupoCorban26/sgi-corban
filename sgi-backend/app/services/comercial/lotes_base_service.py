import logging
import io
import re
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, update, and_, or_, insert
from fastapi import UploadFile, HTTPException

from app.models.comercial_base import Lote, BaseContacto
from app.models.historial_llamadas import HistorialLlamada
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado
from app.models.comercial import Cliente

logger = logging.getLogger(__name__)

class LotesBaseService:
    """Servicio de gestión de lotes y bases de prospección."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_lotes(self):
        """Lista todos los lotes con estadísticas."""
        stmt = select(
            Lote.id,
            Lote.nombre_archivo,
            Lote.empresa,
            Lote.estado,
            Lote.created_by,
            Lote.created_at,
            func.count(BaseContacto.id).label('total_contactos'),
            func.sum(case((BaseContacto.estado == 'DISPONIBLE', 1), else_=0)).label('disponibles'),
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label('created_by_nombre')
        ).outerjoin(
            BaseContacto, BaseContacto.lote_id == Lote.id
        ).outerjoin(
            Usuario, Lote.created_by == Usuario.id
        ).outerjoin(
            Empleado, Usuario.empleado_id == Empleado.id
        ).group_by(
            Lote.id,
            Lote.nombre_archivo,
            Lote.empresa,
            Lote.estado,
            Lote.created_by,
            Lote.created_at,
            Empleado.nombres,
            Empleado.apellido_paterno
        ).order_by(Lote.created_at.desc())

        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {
                "id": row.id,
                "nombre_archivo": row.nombre_archivo,
                "empresa": row.empresa,
                "estado": row.estado,
                "total_contactos": row.total_contactos or 0,
                "disponibles": row.disponibles or 0,
                "created_by_nombre": row.created_by_nombre if row.created_by else None,
                "created_at": row.created_at,
            }
            for row in rows
        ]

    async def toggle_lote_estado(self, lote_id: int):
        """Cambia el estado del lote entre DISPONIBLE y FINALIZADO."""
        lote = await self.db.get(Lote, lote_id)
        if not lote:
            raise HTTPException(404, "Lote no encontrado")

        lote.estado = 'FINALIZADO' if lote.estado == 'DISPONIBLE' else 'DISPONIBLE'
        await self.db.commit()

        return {
            "success": True,
            "lote_id": lote.id,
            "estado": lote.estado,
            "message": f"Estado del lote cambiado a {lote.estado}."
        }

    async def upload_lote(self, file: UploadFile, empresa: str, user_id: int):
        """Sube un Excel, crea un lote y puebla la tabla bases."""
        try:
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
            df.columns = [c.lower().strip() for c in df.columns]
            df = df.where(pd.notnull(df), None)

            def limpiar_telefono(val):
                if pd.isna(val): return None
                val_str = str(val).strip()
                primer_telefono = re.split(r'[-/,\s]+', val_str)[0]
                solo_digitos = re.sub(r'\D', '', primer_telefono)
                return solo_digitos if solo_digitos else None

            # Limpiar
            if 'ruc' not in df.columns or 'telefono' not in df.columns:
                raise HTTPException(400, "El Excel debe contener las columnas 'ruc' y 'telefono'")

            def limpiar_ruc(val):
                if pd.isna(val) or val == '':
                    return None
                val_str = str(val).strip()
                # Si es float (ej: 20100055318.0), convertir a int primero
                try:
                    val_str = str(int(float(val_str)))
                except (ValueError, OverflowError):
                    # Si no se puede convertir a número, limpiar caracteres no-dígito
                    val_str = re.sub(r'\D', '', val_str)
                return val_str if val_str else None

            df['ruc'] = df['ruc'].apply(limpiar_ruc)
            df['telefono'] = df['telefono'].apply(limpiar_telefono)
            
            # Mapeo de columnas adicionales
            if 'correo' not in df.columns and 'email' in df.columns:
                df['correo'] = df['email']
            
            # Filtrar
            df = df.dropna(subset=['ruc', 'telefono'])
            df = df[df['ruc'] != '']
            df = df[df['telefono'] != '']
            
            # Deduplicar dentro de este mismo archivo
            total_antes = len(df)
            # Primero quitamos duplicados por RUC (conservando el primero), luego por teléfono
            df = df.drop_duplicates(subset=['ruc'], keep='first')
            df = df.drop_duplicates(subset=['telefono'], keep='first')
            duplicates_count = total_antes - len(df)

            # Filtrar RUCs que ya están registrados como clientes ACTIVOS
            rucs_en_excel = list(df['ruc'].unique())
            excluidos_clientes_count = 0
            excluidos_bases_count = 0
            if rucs_en_excel:
                # SQL Server ODBC limita a ~2100 parámetros por query.
                # Dividimos en lotes de 2000 para evitar el error.
                CHUNK_SIZE = 2000
                rucs_activos_db: set[str] = set()
                for i in range(0, len(rucs_en_excel), CHUNK_SIZE):
                    chunk = rucs_en_excel[i:i + CHUNK_SIZE]
                    
                    # Consultar clientes activos
                    stmt_clientes_activos = select(Cliente.ruc).where(
                        and_(
                            Cliente.ruc.in_(chunk),
                            Cliente.is_active == True
                        )
                    )
                    res_clientes_activos = await self.db.execute(stmt_clientes_activos)
                    rucs_activos_db.update(res_clientes_activos.scalars().all())

                # Excluir clientes activos del dataframe
                total_antes_clientes = len(df)
                df = df[~df['ruc'].isin(rucs_activos_db)]
                excluidos_clientes_count = total_antes_clientes - len(df)

            total_registros = len(df)
            if total_registros == 0:
                raise HTTPException(400, "No se encontraron nuevos registros válidos (todos corresponden a clientes activos).")

            # Crear el lote
            nuevo_lote = Lote(
                nombre_archivo=file.filename,
                empresa=empresa if empresa in ['CORBAN', 'EBL'] else None,
                estado='DISPONIBLE',
                created_by=user_id
            )
            self.db.add(nuevo_lote)
            await self.db.flush() # Para obtener el ID del lote
            
            # Preparar datos para bulk insert (mucho más rápido que add() individual)
            def safe_str(val, max_len=None):
                """Convierte a string seguro, truncando si excede el límite de la columna."""
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    return None
                s = str(val).strip()
                return s[:max_len] if max_len and len(s) > max_len else s

            registros = []
            for _, row in df.iterrows():
                registros.append({
                    "lote_id": nuevo_lote.id,
                    "ruc": row['ruc'][:11] if row['ruc'] else row['ruc'],
                    "razon_social": safe_str(row.get('razon_social') or row.get('empresa'), 250),
                    "sector": safe_str(row.get('sector'), 500),
                    "paises": safe_str(row.get('paises_principales') or row.get('paises'), 500),
                    "telefono": row['telefono'][:20] if row['telefono'] else row['telefono'],
                    "nombre": safe_str(row.get('nombre') or row.get('contacto'), 150),
                    "correo": safe_str(row.get('correo'), 100),
                    "estado": "DISPONIBLE",
                    "veces_llamadas": 0,
                })

            # Insertar en lotes de 500 para evitar límite de parámetros de SQL Server
            BATCH_SIZE = 500
            inserted = 0
            for i in range(0, len(registros), BATCH_SIZE):
                batch = registros[i:i + BATCH_SIZE]
                await self.db.execute(insert(BaseContacto), batch)
                inserted += len(batch)

            await self.db.commit()

            return {
                "message": f"Se importaron {inserted} contactos al lote '{file.filename}'. {duplicates_count} duplicados internos omitidos. {excluidos_clientes_count} clientes activos omitidos.",
                "lote_id": nuevo_lote.id,
                "inserted": inserted,
                "duplicates": duplicates_count,
                "excluidos_clientes": excluidos_clientes_count,
                "excluidos_bases": excluidos_bases_count
            }

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error upload_lote: {e}")
            raise HTTPException(status_code=500, detail=f"Error al procesar archivo: {str(e)}")

    async def cargar_base(self, user_id: int, empresa: str = None):
        """Asigna 50 contactos DISPONIBLES al comercial."""
        # Determinar a qué empresa pertenece el comercial (via empresa_id FK)
        stmt_emp = select(Empleado.empresa_id).join(Usuario, Usuario.empleado_id == Empleado.id).where(Usuario.id == user_id)
        emp_res = await self.db.execute(stmt_emp)
        empresa_id_empleado = emp_res.scalar()
        
        # Mapeo: 1=CORBAN ADUANAS, 2=CORBAN TRANS, 3=EBL
        empresa_comercial = None
        if empresa_id_empleado in (1, 2):
            empresa_comercial = "CORBAN"
        elif empresa_id_empleado == 3:
            empresa_comercial = "EBL"

        # 1. Verificar si ya tiene contactos ASIGNADO sin gestionar (veces_llamadas == 0)
        stmt_pendientes = select(func.count(BaseContacto.id)).where(
            and_(
                BaseContacto.asignado_a == user_id,
                BaseContacto.estado == 'ASIGNADO',
                BaseContacto.veces_llamadas == 0
            )
        )
        pendientes = (await self.db.execute(stmt_pendientes)).scalar()
        if pendientes and pendientes > 0:
            raise HTTPException(400, f"Tienes {pendientes} contactos pendientes por gestionar (con 0 llamadas). Gestiónalos antes de cargar más base.")

        # 2. Seleccionar 50 contactos DISPONIBLE
        stmt_disponibles = select(BaseContacto).join(Lote).where(
            and_(
                BaseContacto.estado == 'DISPONIBLE',
                Lote.estado == 'DISPONIBLE'
            )
        )
        
        # Filtro de seguridad por empresa del comercial
        if empresa_comercial == "CORBAN":
            # Comercial de CORBAN: Lotes de CORBAN o generales
            stmt_disponibles = stmt_disponibles.where(
                or_(Lote.empresa == 'CORBAN', Lote.empresa.is_(None))
            )
        elif empresa_comercial == "EBL":
            # Comercial de EBL: Lotes de EBL o generales
            stmt_disponibles = stmt_disponibles.where(
                or_(Lote.empresa == 'EBL', Lote.empresa.is_(None))
            )
        else:
            # Comercial sin empresa reconocida: solo lotes generales
            stmt_disponibles = stmt_disponibles.where(
                Lote.empresa.is_(None)
            )

        # Si además se pasa un filtro explícito de empresa en la consulta
        if empresa:
            emp_filtro = empresa.upper()
            if emp_filtro in ["CORBAN", "EBL"]:
                if empresa_comercial and emp_filtro != empresa_comercial:
                    # Intento de cargar de otra empresa -> forzar a no coincidir
                    stmt_disponibles = stmt_disponibles.where(Lote.id == -1)
                else:
                    stmt_disponibles = stmt_disponibles.where(Lote.empresa == emp_filtro)
            elif emp_filtro == "GENERAL":
                stmt_disponibles = stmt_disponibles.where(Lote.empresa.is_(None))
            
        stmt_disponibles = stmt_disponibles.limit(50)
        result = await self.db.execute(stmt_disponibles)
        contactos = result.scalars().all()

        if not contactos:
            raise HTTPException(404, "No hay más contactos disponibles en la base de datos.")

        # 3. Asignar y crear historial
        contactos_asignados = []
        for c in contactos:
            c.estado = 'ASIGNADO'
            c.asignado_a = user_id
            c.fecha_asignacion = func.now()
            
            # Crear historial de llamada pendiente
            historial = HistorialLlamada(
                base_id=c.id,
                comercial_id=user_id,
                caso_id=None,
                comentario=None
            )
            self.db.add(historial)
            contactos_asignados.append(c)

        await self.db.commit()
        return {
            "success": True,
            "cantidad": len(contactos_asignados),
            "contactos_liberados": 0,
            "rucs_excluidos": {},
            "message": f"Se asignaron {len(contactos_asignados)} contactos exitosamente."
        }

    async def export_lote_cross_data(self, lote_id: int):
        """
        Exporta un lote cruzando la información de llamadas con su historial.
        Retorna la tupla (excel_bytes, filename).
        """
        from sqlalchemy.orm import aliased
        from app.models.comercial import CasoLlamada

        lote = await self.db.get(Lote, lote_id)
        if not lote:
            raise HTTPException(404, "Lote no encontrado")

        ComercialUsuario = aliased(Usuario)
        ComercialEmpleado = aliased(Empleado)
        AsignadoUsuario = aliased(Usuario)
        AsignadoEmpleado = aliased(Empleado)

        comercial_encargado_expr = case(
            (ComercialEmpleado.id.isnot(None), func.concat(ComercialEmpleado.nombres, ' ', ComercialEmpleado.apellido_paterno)),
            (AsignadoEmpleado.id.isnot(None), func.concat(AsignadoEmpleado.nombres, ' ', AsignadoEmpleado.apellido_paterno)),
            else_="Sin asignar"
        )

        stmt = select(
            BaseContacto.ruc,
            BaseContacto.razon_social,
            BaseContacto.telefono,
            BaseContacto.correo,
            BaseContacto.nombre,
            BaseContacto.sector,
            BaseContacto.paises,
            BaseContacto.estado.label("estado_contacto"),
            CasoLlamada.nombre.label("caso_nombre"),
            CasoLlamada.contestado.label("contestado"),
            HistorialLlamada.comentario.label("comentario"),
            HistorialLlamada.created_at.label("fecha_llamada"),
            comercial_encargado_expr.label("comercial_encargado")
        ).select_from(BaseContacto)\
         .outerjoin(HistorialLlamada, HistorialLlamada.base_id == BaseContacto.id)\
         .outerjoin(CasoLlamada, HistorialLlamada.caso_id == CasoLlamada.id)\
         .outerjoin(ComercialUsuario, HistorialLlamada.comercial_id == ComercialUsuario.id)\
         .outerjoin(ComercialEmpleado, ComercialUsuario.empleado_id == ComercialEmpleado.id)\
         .outerjoin(AsignadoUsuario, BaseContacto.asignado_a == AsignadoUsuario.id)\
         .outerjoin(AsignadoEmpleado, AsignadoUsuario.empleado_id == AsignadoEmpleado.id)\
         .where(BaseContacto.lote_id == lote_id)\
         .order_by(BaseContacto.id.asc(), HistorialLlamada.created_at.asc())

        result = await self.db.execute(stmt)
        rows = result.all()

        data_list = []
        for r in rows:
            contesto_str = "Sí" if r.contestado is True else ("No" if r.contestado is False else "")
            fecha_str = r.fecha_llamada.strftime("%d/%m/%Y %H:%M") if r.fecha_llamada else ""
            data_list.append({
                "RUC": r.ruc,
                "Razón Social": r.razon_social or "",
                "Teléfono": r.telefono,
                "Correo": r.correo or "",
                "Nombre": r.nombre or "",
                "Contestó": contesto_str,
                "Caso": r.caso_nombre or "",
                "Comentario": r.comentario or "",
                "Fecha Llamada": fecha_str,
                "Comercial Encargado": r.comercial_encargado or "Sin asignar",
                "Países": r.paises or "",
                "Sector": r.sector or "",
                "Estado Contacto": r.estado_contacto
            })

        df = pd.DataFrame(data_list)
        output = io.BytesIO()
        
        has_xlsxwriter = False
        try:
            import xlsxwriter
            has_xlsxwriter = True
        except ImportError:
            pass

        if has_xlsxwriter:
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, sheet_name='Reporte Lote', index=False)
                
                # Formateo básico del Excel
                workbook  = writer.book
                worksheet = writer.sheets['Reporte Lote']
                
                header_format = workbook.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'valign': 'top',
                    'fg_color': '#1E3A8A', # Azul oscuro (premium)
                    'font_color': '#FFFFFF',
                    'border': 1
                })
                
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(0, col_num, value, header_format)
                    
                # Ajustar anchos
                for i, col in enumerate(df.columns):
                    max_len = max(df[col].astype(str).map(len).max(), len(col)) + 3
                    worksheet.set_column(i, i, min(max_len, 40))
        else:
            engine_to_use = 'openpyxl'
            try:
                import openpyxl
            except ImportError:
                engine_to_use = None
                
            with pd.ExcelWriter(output, engine=engine_to_use) as writer:
                df.to_excel(writer, sheet_name='Reporte Lote', index=False)
                
                if engine_to_use == 'openpyxl':
                    try:
                        from openpyxl.utils import get_column_letter
                        worksheet = writer.sheets['Reporte Lote']
                        for col in worksheet.columns:
                            max_len = max(len(str(cell.value or '')) for cell in col) + 3
                            col_letter = get_column_letter(col[0].column)
                            worksheet.column_dimensions[col_letter].width = min(max_len, 40)
                    except Exception:
                        pass

        output.seek(0)
        
        filename = f"reporte_lote_{lote_id}.xlsx"
        if lote.nombre_archivo:
            cleaned_name = "".join([c if c.isalnum() or c in ['.', '_', '-'] else "_" for c in lote.nombre_archivo])
            if cleaned_name.endswith('.xlsx'):
                cleaned_name = cleaned_name[:-5]
            elif cleaned_name.endswith('.xls'):
                cleaned_name = cleaned_name[:-4]
            filename = f"reporte_lote_{lote_id}_{cleaned_name}.xlsx"

        return output.getvalue(), filename
